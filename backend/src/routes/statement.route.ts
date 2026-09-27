import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { verifyStatementGrant } from "../lib/jwt.js";
import { forFirm } from "../lib/tenant.js";
import { publicSettings } from "../lib/site-settings.js";
import { ApiError } from "../middleware/errorHandler.js";

/**
 * A statement of account, as a page a browser can print.
 *
 * A client asking what they owe is asking for something on paper, and the
 * honest answer has three parts that a single figure hides: what was agreed,
 * what has been received, and what the chamber has laid out to courts and
 * not had back. Those are different kinds of money and a statement that adds
 * them together is not a statement, it is a demand.
 *
 * Served as HTML rather than built in the app because printing belongs to
 * the browser. It needs no native module, it works from the web build and
 * from a handset alike, and it is what the chamber's own office system
 * already does.
 *
 * Reached with a grant in the address — see signStatementGrant — which opens
 * one statement for ten minutes and nothing else.
 */
export const statementRouter = Router();

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function rupees(n: number): string {
  return `Rs ${n.toLocaleString("en-PK")}`;
}

function day(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

type Row = { date: Date; what: string; detail: string; amount: number };

function table(heading: string, rows: Row[], empty: string): string {
  if (rows.length === 0) {
    return `<section><h2>${heading}</h2><p class="none">${empty}</p></section>`;
  }
  const body = rows
    .map(
      (r) =>
        `<tr><td class="d">${day(r.date)}</td><td>${esc(r.what)}${
          r.detail ? `<span class="sub">${esc(r.detail)}</span>` : ""
        }</td><td class="n">${rupees(r.amount)}</td></tr>`
    )
    .join("");
  return `<section><h2>${heading}</h2><table><tbody>${body}</tbody></table></section>`;
}

statementRouter.get(
  "/:scope/:id",
  asyncHandler(async (req, res) => {
    const token = String(req.query.t ?? "");
    let grant;
    try {
      grant = verifyStatementGrant(token);
    } catch {
      throw new ApiError(403, "This statement link has expired. Open it again from the app.");
    }

    // The address is checked against the grant, not trusted on its own: a
    // grant for one matter must not open another by editing the number.
    if (grant.scope !== req.params.scope || String(grant.id) !== req.params.id) {
      throw new ApiError(403, "This link does not open that statement.");
    }

    const db = forFirm(grant.firm);
    const settings = await publicSettings(grant.firm);
    const firmName = settings["firm.name"];

    const where = grant.scope === "case" ? { caseId: grant.id } : { case: { clientId: grant.id } };

    const [fees, official, matters, client] = await Promise.all([
      db.fee.findMany({
        where,
        orderBy: [{ entryDate: "asc" }, { id: "asc" }],
        include: { case: { select: { id: true, title: true, caseNo: true } } },
      }),
      // Only what the chamber laid out and has not had back. A court fee the
      // client paid at the counter is not owed to anybody, and one already
      // recovered is settled — neither belongs on a statement of what is due.
      db.officialFee.findMany({
        where:
          grant.scope === "case"
            ? { caseId: grant.id, paidBy: "office", recoveredAt: null }
            : { paidBy: "office", recoveredAt: null, caseId: { not: null } },
        orderBy: [{ entryDate: "asc" }, { id: "asc" }],
      }),
      db.case.findMany({
        where: grant.scope === "case" ? { id: grant.id } : { clientId: grant.id },
        select: { id: true, title: true, caseNo: true, court: true, clientId: true },
      }),
      grant.scope === "client"
        ? db.client.findUnique({ where: { id: grant.id } })
        : db.case
            .findUnique({ where: { id: grant.id }, select: { client: true } })
            .then((c) => c?.client ?? null),
    ]);

    if (matters.length === 0 || !client) {
      throw new ApiError(404, "There is nothing to draw a statement from.");
    }

    // For a whole client, only court fees on that client's own matters.
    const mine = new Set(matters.map((m) => m.id));
    const advanced = official.filter((o) => o.caseId !== null && mine.has(o.caseId));

    const agreedRows: Row[] = fees
      .filter((f) => f.kind === "agreed")
      .map((f) => ({
        date: f.entryDate,
        what: f.case.caseNo ? `${f.case.caseNo} — ${f.case.title}` : f.case.title,
        detail: f.note,
        amount: Number(f.amount),
      }));
    const receivedRows: Row[] = fees
      .filter((f) => f.kind === "received")
      .map((f) => ({
        date: f.entryDate,
        what: f.case.caseNo ? `${f.case.caseNo} — ${f.case.title}` : f.case.title,
        detail: [f.mode, f.receiptNo ? `Receipt ${f.receiptNo}` : "", f.note]
          .filter(Boolean)
          .join(" · "),
        amount: Number(f.amount),
      }));
    const advancedRows: Row[] = advanced.map((o) => ({
      date: o.entryDate,
      what: o.kind,
      detail: [o.description, o.receiptNo ? `Receipt ${o.receiptNo}` : "", o.note]
        .filter(Boolean)
        .join(" · "),
      amount: Number(o.amount),
    }));

    const sum = (rows: Row[]) => rows.reduce((t, r) => t + r.amount, 0);
    const agreed = sum(agreedRows);
    const received = sum(receivedRows);
    const laidOut = sum(advancedRows);
    const due = agreed - received + laidOut;

    const heading =
      grant.scope === "case"
        ? matters[0]!.caseNo
          ? `${matters[0]!.caseNo} — ${matters[0]!.title}`
          : matters[0]!.title
        : `${matters.length} ${matters.length === 1 ? "matter" : "matters"}`;

    res.type("html").send(`<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Statement of account — ${esc(client.name)}</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; background: #faf8f5; color: #4b443a;
         font: 15px/1.6 ui-serif, Georgia, "Times New Roman", serif; }
  .sheet { max-width: 46rem; margin: 0 auto; padding: 2.5rem 1.25rem 4rem; }
  header { border-bottom: 2px solid #17140f; padding-bottom: 1rem; margin-bottom: 1.5rem; }
  h1 { margin: 0 0 .25rem; font-size: 1.5rem; color: #17140f; font-weight: 600; }
  .firm { font-size: .8rem; letter-spacing: .14em; text-transform: uppercase;
          color: #9a7622; font-family: ui-sans-serif, system-ui, sans-serif; font-weight: 600; }
  .who { margin: 0 0 1.5rem; }
  .who strong { color: #17140f; }
  h2 { font-size: .78rem; letter-spacing: .12em; text-transform: uppercase; color: #9a7622;
       font-family: ui-sans-serif, system-ui, sans-serif; margin: 1.75rem 0 .5rem; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: .5rem .25rem; border-bottom: 1px solid #e4ddd0; vertical-align: top; }
  td.d { white-space: nowrap; color: #8b8272; font-size: .85rem; width: 7.5rem; }
  td.n { text-align: right; white-space: nowrap; color: #17140f; font-variant-numeric: tabular-nums; }
  .sub { display: block; font-size: .82rem; color: #8b8272; }
  .none { color: #8b8272; font-size: .9rem; }
  .totals { margin-top: 2rem; border-top: 2px solid #17140f; padding-top: .75rem; }
  .totals div { display: flex; justify-content: space-between; padding: .3rem 0; }
  .totals .due { border-top: 1px solid #e4ddd0; margin-top: .4rem; padding-top: .6rem;
                 font-size: 1.15rem; color: #17140f; font-weight: 600; }
  footer { margin-top: 2.5rem; border-top: 1px solid #e4ddd0; padding-top: 1rem;
           font-size: .82rem; color: #8b8272; }
  @media print { body { background: #fff; } .sheet { padding-top: 0; } }
</style>
</head><body><div class="sheet">
  <header>
    <div class="firm">${esc(firmName)}</div>
    <h1>Statement of account</h1>
  </header>

  <p class="who">
    <strong>${esc(client.name)}</strong>${client.fatherName ? ` s/o ${esc(client.fatherName)}` : ""}
    ${client.cnic ? `<br>${esc(client.cnic)}` : ""}
    <br>${esc(heading)}
    <br><span class="none">Drawn ${day(new Date())}</span>
  </p>

  ${table("Fees agreed", agreedRows, "No fee has been agreed on the record.")}
  ${table("Received", receivedRows, "Nothing received yet.")}
  ${table(
    "Paid to courts by the chamber, not yet recovered",
    advancedRows,
    "Nothing outstanding to courts."
  )}

  <div class="totals">
    <div><span>Fees agreed</span><span>${rupees(agreed)}</span></div>
    <div><span>Less received</span><span>${rupees(received)}</span></div>
    <div><span>Court fees laid out</span><span>${rupees(laidOut)}</span></div>
    <div class="due"><span>Due</span><span>${rupees(due)}</span></div>
  </div>

  <footer>
    Court fees are money paid to a court or registry through the chamber, never to it, and are
    shown here only while the chamber has not been repaid. This statement reflects what is on the
    chamber's record on the date above; anything paid since may not appear yet.
  </footer>
</div></body></html>`);
  })
);
