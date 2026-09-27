import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { platformFirmId } from "../lib/platform.js";
import { publicSettings } from "../lib/site-settings.js";

/**
 * The privacy notice, as a page a stranger can open.
 *
 * Google Play and the App Store both refuse an app that handles personal
 * data unless a policy sits at a public address, reachable without signing
 * in, and reachable by their reviewer before the app exists. This is that
 * address.
 *
 * It lives on the API rather than on the website because the API is what
 * this chamber has deployed: the website at arbitratorandlaw.com is the
 * chamber's own, older site and is deliberately left alone. A notice served
 * from here is on the chamber's own server, over its own certificate, which
 * is what the requirement is actually about.
 *
 * The same notice is in frontend/src/app/(public)/privacy/page.tsx, for the
 * platform's own site. The two say the same things in the same order and
 * must be changed together — a chamber cannot have its privacy notice
 * saying two things. Neither is generated from the other because they are
 * in separate packages with separate builds, and wiring a shared package
 * through both for one page of prose would put the chamber's deployment at
 * risk to save a copy.
 *
 * Every fact here is drawn from what the software does. Where a fact
 * belongs to the chamber rather than to the code — who to write to — it is
 * read from Site Settings and reported as missing when unset, never
 * invented.
 */
export const privacyRouter = Router();

/** HTML-escape a value that came from the database. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** A section: its heading, and the paragraphs under it. */
function section(heading: string, paragraphs: string[]): string {
  return `<section><h2>${heading}</h2>${paragraphs.map((p) => `<p>${p}</p>`).join("")}</section>`;
}

privacyRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const settings = await publicSettings(await platformFirmId());
    const firm = esc(settings["firm.name"]);
    const address = esc(settings["firm.address"]);
    const email = esc(settings["contact.email"]);
    const phone = esc(settings["contact.phone"]);

    const reachable = [
      phone && `<li>Telephone: ${phone}</li>`,
      email && `<li>Email: <a href="mailto:${email}">${email}</a></li>`,
      address && `<li>${address}</li>`,
    ].filter(Boolean);

    const howToAsk = reachable.length
      ? `<ul>${reachable.join("")}</ul>`
      : `<p class="missing">The chamber has not yet set a telephone number or an address in Site
         Settings. Until it does, this page cannot tell a reader where to write, and none is
         invented here.</p>`;

    const body = [
      section("Who holds these records", [
        `${firm}. The records described below are held by this chamber on its own server, and the
         chamber alone decides what is done with them.`,
        ...(address ? [address] : []),
      ]),
      section("If you only visit the site", [
        `Reading these pages creates no account and no profile of you. There is no advertising here
         and no tracking for advertisers.`,
        `If you send an enquiry through the contact form, the chamber keeps what you typed — your
         name, your telephone number or email if you gave one, and your message — so that somebody
         can answer it. Sending an enquiry does not make you a client, and nothing you send creates
         a professional relationship until the chamber says so.`,
        `The server counts recent attempts against the network address they came from, for sign-ins
         and enquiries, so that the site cannot be flooded. That count is a number and an address,
         not a record of what you read.`,
      ]),
      section("If you are a client", [
        `The chamber keeps what a chamber keeps: your name and how to reach you, the matters it acts
         for you in, hearing dates and what happened at them, documents on your file, the fees
         agreed and received, and the messages between you and the office — including spoken notes,
         if you send one from the app.`,
        `You are given a sign-in of your own, by the chamber. It shows you your own matters and
         nothing else. It does not show you another client&rsquo;s matter, and it does not show you
         everything on your own file either: the chamber&rsquo;s internal notes, and its record of
         what a hearing decided, stay within the chamber. Which documents you can see is decided
         document by document.`,
        `Much of this is privileged. It is treated that way.`,
      ]),
      section("Who else can see it", [
        `Your records are not sold, not shared with advertisers, and not used to train anything.`,
        `Lawyer360 is used by other chambers, each with its own records. No other chamber can see
         yours. That is not a promise about conduct — every record carries the chamber it belongs
         to, and the database refuses a query that reaches outside it.`,
        `Two things do leave the chamber&rsquo;s own server, and only these. If you turn on
         reminders in the app, a device identifier is sent to Expo&rsquo;s notification service so
         that a message about tomorrow&rsquo;s hearing can reach your telephone; the message says
         that a hearing is listed, not what the matter concerns. And the chamber may offer a piece
         of its own legal writing or a note on a reported judgment to a library open to every
         advocate on the platform — that is the chamber&rsquo;s own work on the law, never a
         client&rsquo;s file, and never anything identifying a client.`,
      ]),
      section("How long it is kept", [
        `A file is kept for as long as the chamber may need it — a matter can be reopened, and an
         advocate can be asked years later to account for what was advised. Backups of the whole
         system are taken nightly and the last thirty days of them are retained, so a record
         deleted today may survive in a backup for up to a month.`,
      ]),
      `<section id="deletion"><h2>Deleting an account</h2>
        <p>A client who wants their portal sign-in closed asks their own chamber, at the details
           below. The chamber closes it, and the client keeps the right to a copy of what is held
           first.</p>
        <p>An advocate who wants their chamber removed from Lawyer360 — the account and the
           records inside it — asks at the address in the app's store listing. The chamber is
           deleted with everything in it: its clients, its files, its diary and its fees.</p>
        <p>Two things survive a deletion, and a chamber should know both before asking. Nightly
           backups are kept for thirty days, so a deleted record can exist in a backup for up to a
           month before it ages out. And where the chamber is under a duty to retain a file — a
           live matter, or a duty to account for advice given — that file is kept, and the chamber
           says which duty it relies on.</p>
      </section>`,
      `<section><h2>Asking what is held</h2>
        <p>You may ask the chamber what it holds about you, ask for a correction, or ask for a copy.
           Write or telephone, and say which matter you are asking about.</p>
        ${howToAsk}
        <p>Deleting a record is not always possible while a matter is live or while the chamber is
           under a duty to retain it. Where that is so, the chamber will say which duty it relies
           on.</p>
      </section>`,
    ].join("");

    res.type("html").send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Privacy — ${firm}</title>
<meta name="description" content="What this chamber records, where it is kept, and who can see it.">
<style>
  :root { color-scheme: light; }
  body { margin: 0; background: #faf8f5; color: #4b443a;
         font: 16px/1.7 ui-serif, Georgia, "Times New Roman", serif; }
  header { background: #17140f; padding: 3.5rem 1.5rem; }
  header div, main { max-width: 44rem; margin: 0 auto; }
  header p.eyebrow { margin: 0 0 .75rem; color: #b58e32; font-size: .75rem;
                     letter-spacing: .18em; text-transform: uppercase;
                     font-family: ui-sans-serif, system-ui, sans-serif; font-weight: 600; }
  header h1 { margin: 0 0 1rem; color: #fff; font-size: 2.25rem; font-weight: 500; }
  header p.lede { margin: 0; color: rgba(255,255,255,.7); }
  main { padding: 3rem 1.5rem; }
  h2 { margin: 2.5rem 0 .75rem; color: #17140f; font-size: 1.4rem; font-weight: 500; }
  section:first-child h2 { margin-top: 0; }
  ul { padding-left: 1.2rem; }
  a { color: #9a7622; }
  .missing { border: 1px solid #e4ddd0; background: #f7f0de; color: #17140f;
             border-radius: 6px; padding: 1rem 1.25rem; }
  footer { border-top: 1px solid #e4ddd0; margin-top: 3rem; padding-top: 1.5rem;
           font-size: .875rem; }
</style>
</head>
<body>
<header><div>
  <p class="eyebrow">Privacy</p>
  <h1>What this chamber records</h1>
  <p class="lede">Written plainly, because a client ought to be able to read it. It covers this
     chamber&rsquo;s records and the Lawyer360 mobile app alike — they are the same records seen
     two ways.</p>
</div></header>
<main>
  ${body}
  <footer>This notice describes what the software does. It is not legal advice on your own
     obligations, and a chamber adopting it should read it against the law that binds it before
     relying on it.</footer>
</main>
</body>
</html>`);
  })
);
