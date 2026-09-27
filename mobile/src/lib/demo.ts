/**
 * A demonstration that runs with no server behind it.
 *
 * Switched on only by building with EXPO_PUBLIC_DEMO=1, and off in every
 * other build — including every real one. That matters more than it looks:
 * a demo mode that could switch itself on is a demo mode that will one day
 * show invented case data to somebody who believes it. It cannot, because
 * the flag is read at build time and there is no way to set it at runtime.
 *
 * What it is for: letting an advocate open a link and use the whole app —
 * sign in, walk the cause list, open a file, read the library — before any
 * server exists. Nothing is saved; reload and it is as it was.
 *
 * Every name and matter below is invented. None is a real client or a real
 * case, and no citation here should be relied on.
 */

export const DEMO = process.env.EXPO_PUBLIC_DEMO === "1";

const today = new Date();
const day = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const RESEARCH = [
  {
    id: 1,
    title: "The thirty days that decide your appeal",
    topic: "Civil Procedure",
    summary:
      "Limitation for an appeal runs from the date of the decree, not the date you were told of it. What that means in practice, and the one application that buys time.",
    tags: "limitation, appeal",
    createdAt: day(-40),
    firm: { name: "The Arbitrator & Law Associates", slug: "arbitrator-law", verified: true },
  },
  {
    id: 2,
    title: "The arbitration clause, and the one application that must come first",
    topic: "Arbitration & ADR",
    summary:
      "A badly drafted arbitration clause creates a dispute about the dispute. Where the clause is good, the application under section 34 comes before anything else.",
    tags: "arbitration",
    createdAt: day(-33),
    firm: { name: "The Arbitrator & Law Associates", slug: "arbitrator-law", verified: true },
  },
  {
    id: 3,
    title: "Khula and the dower question people ask first",
    topic: "Family Law",
    summary:
      "What a wife gives up on khula, what she does not, and why the answer about dower depends on when it was fixed.",
    tags: "family, khula",
    createdAt: day(-21),
    firm: { name: "The Arbitrator & Law Associates", slug: "arbitrator-law", verified: true },
  },
  {
    id: 4,
    title: "Recovering business dues: the notice that comes before the suit",
    topic: "Corporate Law",
    summary:
      "Order XXXVII is the fast route for a documented debt — but the test a defendant must meet for leave to defend decides whether it stays fast.",
    tags: "recovery, summary suit",
    createdAt: day(-12),
    firm: { name: "Ahmad Law Chambers", slug: "ahmad-law-chambers", verified: true },
  },
];

const HEARINGS = [
  { id: 1, purpose: "Arguments on the appeal", recorded: false, caseId: 1,
    caseTitle: "Criminal Appeal against conviction", court: "Peshawar High Court",
    status: "Active", clientName: "Fazal ur Rehman", clientPhone: "" },
  { id: 2, purpose: "Reconciliation proceedings", recorded: false, caseId: 2,
    caseTitle: "Family Suit for maintenance", court: "Family Court, Peshawar",
    status: "Active", clientName: "Rukhsana Bibi", clientPhone: "" },
  { id: 3, purpose: "Evidence of the landlord", recorded: false, caseId: 3,
    caseTitle: "Rent Controller proceedings", court: "Rent Controller, Peshawar",
    status: "Active", clientName: "Sher Afzal Khan", clientPhone: "" },
];

const DEMO_TASKS = [
  {
    id: 1,
    taskDate: day(-3),
    title: "Collect the certified copy of the order",
    notes: "The reader said it would be ready by Wednesday.",
    priority: "Urgent",
    done: false,
    doneAt: null,
    createdBy: "admin",
    case: { id: 1, title: "Criminal Appeal against conviction", caseNo: "Cr.A. 412/2026" },
    client: null,
  },
  {
    id: 2,
    taskDate: day(0),
    title: "File the rejoinder",
    notes: "",
    priority: "Normal",
    done: false,
    doneAt: null,
    createdBy: "admin",
    case: { id: 2, title: "Family Suit for maintenance", caseNo: "" },
    client: null,
  },
  {
    id: 3,
    taskDate: day(0),
    title: "Pay the process fee",
    notes: "",
    priority: "Normal",
    done: true,
    doneAt: day(0),
    createdBy: "admin",
    case: null,
    client: null,
  },
];

const CASE_DETAIL = {
  id: 1,
  title: "The State vs Sher Afzal Khan",
  caseNo: "Cr.A. 412/2026",
  court: "Peshawar High Court",
  caseType: "Criminal Appeal",
  sections: "Section 302, Pakistan Penal Code",
  firDetails: "FIR 214/2025, Police Station Gulbahar, 4 May 2025",
  ourSide: "Appellant",
  opposingParty: "The State",
  judge: "Mr Justice Tanzeel ur Rehman",
  stage: "Arguments",
  filedOn: day(-120),
  assignedTo: "Sadeeq",
  status: "Active",
  nextHearing: day(0),
  notes: "INTERNAL: strategy note. Never visible in the client's portal.",
  createdAt: day(-120),
  client: { id: 1, name: "Fazal ur Rehman", phone: "", email: "" },
  hearings: [
    { id: 1, hearingDate: day(0), purpose: "Arguments on the appeal", outcome: "",
      orderSheet: "", attendedBy: "", nextDate: null },
    { id: 4, hearingDate: day(-24), purpose: "Framing of issues",
      outcome: "INTERNAL: adjourned, opposing counsel unprepared.",
      orderSheet: "INTERNAL: adjourned at the respondent's request. To come up for issues.",
      attendedBy: "Sadeeq", nextDate: day(0) },
  ],
  updates: [
    { id: 1, updateDate: day(-6), author: "zeshan.khan",
      message: "Your examination-in-chief has been recorded. Cross-examination is expected on the next date." },
    { id: 2, updateDate: day(-24), author: "zeshan.khan",
      message: "Issues were framed. The court has fixed the matter for evidence." },
  ],
  documents: [
    { id: 1, title: "Plaint as filed", origName: "plaint.pdf", sizeBytes: 184320, clientVisible: true, createdAt: day(-110) },
    { id: 2, title: "Office strategy note", origName: "strategy.pdf", sizeBytes: 22016, clientVisible: false, createdAt: day(-100) },
  ],
  messages: [
    { id: 1, authorType: "client", authorName: "Fazal ur Rehman",
      body: "Will I need to attend in person on the next date?", answered: false,
      createdAt: day(-2), hasVoiceNote: false },
  ],
  fees: { shown: true, agreed: 150000, received: 75000 },
};

const PORTAL_CASES = [
  { id: 1, title: "Criminal Appeal against conviction", court: "Peshawar High Court",
    caseType: "Criminal Appeal", status: "Active", nextHearing: day(0),
    messageCount: 1, documentCount: 1 },
  { id: 2, title: "Civil Suit for Specific Performance", court: "Civil Judge, Peshawar",
    caseType: "Civil Suit", status: "Active", nextHearing: day(11),
    messageCount: 0, documentCount: 1 },
];

/** The canned answer for a path, or undefined if this path is not demoed. */
const DEMO_CLIENTS = [
  { id: 1, name: "Fazal ur Rehman", fatherName: "Abdul Rehman", cnic: "17301-1234567-9",
    phone: "0300 1234567", email: "", portalEnabled: true, portalUsername: "fazal.rehman", caseCount: 2 },
  { id: 2, name: "Rukhsana Bibi", fatherName: "Gul Muhammad", cnic: "17301-7654321-2",
    phone: "0311 7654321", email: "", portalEnabled: false, portalUsername: null, caseCount: 1 },
  { id: 3, name: "Sher Afzal Khan", fatherName: "Afzal Khan", cnic: "17301-2223334-5",
    phone: "0345 2223334", email: "sher@example.com", portalEnabled: true, portalUsername: "sher.afzal", caseCount: 1 },
];

export function demoResponse(path: string, method = "GET"): unknown {
  const p = path.split("?")[0] ?? path;

  // The demonstration is a shop window, so it shows registration open.
  if (p === "/api/site/settings") return { "signup.public": "on" };

  if (p === "/api/library/counts") return { judgments: 0, research: RESEARCH.length, media: 0 };

  if (p === "/api/library/research")
    return { items: RESEARCH, total: RESEARCH.length, limit: 50, offset: 0 };

  if (p === "/api/library/judgments") return { items: [], total: 0, limit: 50, offset: 0 };

  if (p.startsWith("/api/library/research/")) {
    const id = Number(p.split("/").pop());
    const found = RESEARCH.find((r) => r.id === id) ?? RESEARCH[0];
    return {
      ...found,
      body:
        "This is a demonstration. The full text of an article appears here in the working system, " +
        "written by the chamber that contributed it.\n\nNothing on this screen is legal advice, and " +
        "no citation shown in the demonstration should be relied on.",
    };
  }

  // --- running the chamber -------------------------------------------------
  if (p === "/api/office/users")
    return {
      items: [
        { id: 1, username: "demo.advocate", email: "you@example.com", fullName: "Demo Advocate", role: "admin", mustChangePassword: false, createdAt: "2026-01-04T00:00:00.000Z" },
        { id: 2, username: "junior", email: "junior@example.com", fullName: "Junior Associate", role: "associate", mustChangePassword: true, createdAt: "2026-06-18T00:00:00.000Z" },
      ],
      roles: [
        { roleKey: "admin", label: "Principal" },
        { roleKey: "editor", label: "Office manager" },
        { roleKey: "associate", label: "Associate" },
      ],
    };

  if (p.startsWith("/api/office/users/") && p.endsWith("/password"))
    return { password: "TvW4-h9qR-2mKz" };

  if (p === "/api/office/users") return { id: 9, password: "TvW4-h9qR-2mKz" };

  if (p === "/api/office/roles")
    return {
      roles: [
        { roleKey: "admin", label: "Principal", caps: [], userCount: 1, isRoot: true },
        { roleKey: "editor", label: "Office manager", caps: ["cases.view", "cases.edit", "clients.view", "clients.edit", "money.view"], userCount: 0, isRoot: false },
        { roleKey: "associate", label: "Associate", caps: ["cases.view", "clients.view"], userCount: 1, isRoot: false },
      ],
      allCaps: ["cases.view", "cases.edit", "clients.view", "clients.edit", "money.view", "money.edit"],
    };

  // Wrapped in `settings`, because that is what the API answers. It used to
  // be returned flat, which is the shape the app wanted rather than the
  // shape it would get, and the settings screen was broken against a real
  // server for as long as only this was ever run.
  if (p === "/api/office/settings")
    return {
      settings: {
        "firm.name": "Your Chamber",
        "firm.address": "Peshawar High Court, Peshawar",
        "firm.hours": "Monday to Saturday, 9am – 6pm",
        "contact.phone": "",
        "contact.phone2": "",
        "contact.email": "",
        "contact.whatsapp": "",
      },
      defaults: {
        "firm.name": "The Arbitrator & Law Associates",
        "firm.address": "Peshawar High Court, Peshawar, Khyber Pakhtunkhwa",
        "firm.hours": "Monday to Saturday, 9am – 6pm",
      },
    };

  // --- the chamber's own library ------------------------------------------
  if (p === "/api/office/library/judgments")
    return {
      items: [
        { id: 1, title: "Bail in non-bailable offences — the settled rule", citation: "PLD 2024 SC 115", court: "Supreme Court of Pakistan", judges: "", judgmentDate: "2024-02-11T00:00:00.000Z", sections: "", principle: "Further inquiry is a question of degree, not of kind.", summary: "", tags: "bail", sourceUrl: "", published: true, shareState: "approved" },
        { id: 2, title: "Limitation in a suit for specific performance", citation: "", court: "Peshawar High Court", judges: "", judgmentDate: null, sections: "", principle: "", summary: "", tags: "", sourceUrl: "", published: false, shareState: "none" },
      ],
      published: 1,
      shared: 1,
    };

  if (p.startsWith("/api/office/library/judgments/")) {
    const id = Number(p.split("/").pop());
    return id === 2
      ? { id: 2, title: "Limitation in a suit for specific performance", citation: "", court: "Peshawar High Court", judges: "", judgmentDate: null, sections: "", principle: "", summary: "", tags: "", sourceUrl: "", published: false, shareState: "none" }
      : { id: 1, title: "Bail in non-bailable offences — the settled rule", citation: "PLD 2024 SC 115", court: "Supreme Court of Pakistan", judges: "", judgmentDate: "2024-02-11T00:00:00.000Z", sections: "", principle: "Further inquiry is a question of degree, not of kind.", summary: "", tags: "bail", sourceUrl: "", published: true, shareState: "approved" };
  }

  if (p === "/api/office/library/research")
    return { items: RESEARCH.map((r) => ({ ...r, topic: r.topic ?? "", body: "", tags: "", published: true, shareState: "approved" })), published: RESEARCH.length, shared: RESEARCH.length };

  if (p === "/api/office/library/media") return { items: [], published: 0, shared: 0 };

  if (p.startsWith("/api/office/library/")) return { id: 9, ok: true };

  // --- what was said, and who wrote in ------------------------------------
  if (p === "/api/office/communications" && method === "GET")
    return {
      items: [
        { id: 1, method: "call", direction: "Sent", subject: "The next date",
          summary: "Explained the position on the appeal and the likely date. He will bring the remaining papers.",
          personName: "Fazal ur Rehman", personNumber: "0300 1234567", personRole: "Client",
          commDate: "2026-09-22T00:00:00.000Z", commTime: "16:40",
          followUpDue: "2026-09-29T00:00:00.000Z", createdAt: "2026-09-22T00:00:00.000Z",
          client: { id: 1, name: "Fazal ur Rehman" },
          case: { id: 1, title: "The State vs Sher Afzal Khan", caseNo: "Cr.A. 412/2026" } },
        { id: 2, method: "call", direction: "Received", subject: "Settlement proposal",
          summary: "Rang to say his client will consider a compromise before the next date.",
          personName: "Mr Iqbal", personNumber: "0300 7654321", personRole: "Opposing counsel",
          commDate: "2026-09-19T00:00:00.000Z", commTime: "11:20",
          followUpDue: null, createdAt: "2026-09-19T00:00:00.000Z",
          client: { id: 1, name: "Fazal ur Rehman" }, case: null },
        { id: 3, method: "in_person", direction: "Received", subject: "",
          summary: "Attended chamber about a maintenance matter. Advised on the documents required.",
          personName: "", personNumber: "", personRole: "",
          commDate: "2026-09-18T00:00:00.000Z", commTime: "",
          followUpDue: null, createdAt: "2026-09-18T00:00:00.000Z", client: null, case: null },
      ],
      due: 1,
    };

  if (p === "/api/office/communications") return { id: 9 };

  if (p === "/api/office/enquiries")
    return {
      items: [
        { id: 1, name: "Imran Ali", phone: "0333 4445556", email: "", subject: "Property dispute", message: "My brother has occupied our late father's house and will not divide it. Can the chamber advise?", read: false, createdAt: "2026-09-24T00:00:00.000Z" },
        { id: 2, name: "Nadia Khan", phone: "", email: "nadia@example.com", subject: "Consultation", message: "I would like an appointment about a service matter.", read: true, createdAt: "2026-09-20T00:00:00.000Z" },
      ],
      unread: 1,
    };

  if (p.startsWith("/api/office/enquiries/")) return { ok: true };

  // --- the three ledgers ---------------------------------------------------
  if (p === "/api/office/fees")
    return {
      items: [
        { id: 1, kind: "agreed", amount: 150000, entryDate: "2026-03-12T00:00:00.000Z", note: "Brief fee", caseId: 1, caseTitle: "Criminal Appeal against conviction", clientName: "Fazal ur Rehman" },
        { id: 2, kind: "received", amount: 75000, entryDate: "2026-03-20T00:00:00.000Z", note: "First instalment", caseId: 1, caseTitle: "Criminal Appeal against conviction", clientName: "Fazal ur Rehman" },
      ],
      agreed: 150000,
      received: 75000,
    };

  if (p === "/api/office/official-fees" && method === "GET")
    return {
      items: [
        { id: 1, caseId: 1, caseTitle: "The State vs Sher Afzal Khan", kind: "Court fee",
          description: "Institution of the appeal", amount: 4500,
          entryDate: "2026-03-14T00:00:00.000Z", receiptNo: "R-8841",
          paidBy: "office", recoveredAt: null, note: "" },
        { id: 2, caseId: null, caseTitle: null, kind: "Copying fee",
          description: "", amount: 1200, entryDate: "2026-04-02T00:00:00.000Z",
          receiptNo: "", paidBy: "client", recoveredAt: null, note: "Certified copies" },
      ],
      total: 5700,
      outstanding: 4500,
    };

  if (p === "/api/office/expenses" && method === "GET")
    return {
      items: [
        { id: 1, category: "Office rent", amount: 45000, expenseDate: "2026-09-01T00:00:00.000Z",
          description: "September", paidTo: "The landlord", mode: "Bank", caseId: null },
        { id: 2, category: "Stationery", amount: 3200, expenseDate: "2026-09-08T00:00:00.000Z",
          description: "", paidTo: "Khyber Stationers", mode: "Cash", caseId: null },
      ],
      total: 48200,
      byCategory: [
        { category: "Office rent", total: 45000 },
        { category: "Stationery", total: 3200 },
      ],
    };

  if (p.startsWith("/api/office/official-fees/") && p.endsWith("/recovered")) return undefined;
  if (p === "/api/office/expenses" || p === "/api/office/official-fees") return { id: 9 };
  if (p.startsWith("/api/office/cases/") && p.endsWith("/fees")) return { id: 9 };

  // --- clients -----------------------------------------------------------
  if (p === "/api/office/clients")
    return { items: DEMO_CLIENTS, total: DEMO_CLIENTS.length };

  if (p.startsWith("/api/office/clients/") && p.endsWith("/portal"))
    return { enabled: true, username: "rukhsana.bibi", password: "kJ4t-9wPm-2xQd" };

  if (p.startsWith("/api/office/clients/")) {
    const id = Number(p.split("/")[4]);
    const found = DEMO_CLIENTS.find((c) => c.id === id) ?? DEMO_CLIENTS[0]!;
    return {
      ...found,
      address: "Gulbahar No. 3, Peshawar",
      notes: "Prefers to be telephoned in the evening.",
      portalShowFees: false,
      portalMustChangePassword: false,
      createdAt: "2026-03-11T00:00:00.000Z",
      cases: [
        {
          id: 1,
          title: "Criminal Appeal against conviction",
          court: "Peshawar High Court",
          status: "Active",
          nextHearing: "2026-09-25T00:00:00.000Z",
        },
      ],
    };
  }

  // ---- the day, and the chamber's own diary ------------------------------
  //
  // Written to answer the same shape the API does, not the shape the screen
  // happens to want. Demonstration data that agrees with the app rather than
  // with the server hides the bug it is meant to expose — which is exactly
  // how the site settings screen stayed broken.
  if (p.startsWith("/api/office/dashboard"))
    return {
      from: day(0).slice(0, 10),
      to: day(0).slice(0, 10),
      counts: { hearings: 1, tasks: 2, overdue: 1, activeCases: 3 },
      hearings: [{ ...HEARINGS[0], date: day(0).slice(0, 10), caseNo: "Cr.A. 412/2026", stage: "Arguments" }],
      tasks: DEMO_TASKS.filter((t) => !t.done).slice(0, 1),
      followUps: [
        {
          id: 1,
          followUpDue: day(0),
          subject: "Ring before the date",
          summary: "Ask him to bring the original sale agreement to court.",
          personName: "Fazal ur Rehman",
          client: { id: 1, name: "Fazal ur Rehman" },
        },
      ],
    };

  if (p.startsWith("/api/office/tasks") && method === "POST") return { id: 99 };
  if (p.startsWith("/api/office/tasks/")) return undefined;
  if (p.startsWith("/api/office/tasks"))
    return { items: DEMO_TASKS, overdue: DEMO_TASKS.filter((t) => !t.done && t.taskDate < day(0)).length };

  if (p === "/api/office/diary")
    return { days: [
      { date: day(0), hearings: [HEARINGS[0]] },
      { date: day(1), hearings: [HEARINGS[1]] },
      { date: day(4), hearings: [HEARINGS[2]] },
    ] };

  if (p === "/api/office/messages/unanswered")
    return { items: [
      { id: 1, body: "Will I need to attend in person on the next date?", hasVoiceNote: false,
        createdAt: day(-2), clientName: "Fazal ur Rehman", caseId: 1,
        caseTitle: "Criminal Appeal against conviction" },
    ] };

  // Writes in the demonstration answer as though they worked and change
  // nothing — there is no server behind this, and a form that appeared to
  // fail would teach the wrong thing about the real app.
  if (p === "/api/office/cases" && method === "POST") return { id: CASE_DETAIL.id };
  if (p.startsWith("/api/office/cases/") && p.endsWith("/hearings")) return { ok: true };

  if (p === "/api/office/cases") return { items: [CASE_DETAIL], total: 1, limit: 50, offset: 0 };
  if (p.startsWith("/api/office/cases/")) return CASE_DETAIL;

  if (p === "/api/portal/cases") return { items: PORTAL_CASES };
  if (p.endsWith("/messages")) return { items: CASE_DETAIL.messages };
  if (p.startsWith("/api/portal/cases/")) {
    // The client's own view: no internal note, no unshared document.
    const { notes: _n, ...rest } = CASE_DETAIL;
    return {
      ...rest,
      hearings: CASE_DETAIL.hearings.map(({ outcome: _o, ...h }) => h),
      documents: CASE_DETAIL.documents.filter((d) => d.clientVisible),
    };
  }

  if (p === "/api/auth/me")
    return { id: 1, email: "you@example.com", username: "demo.advocate", fullName: "Demo Advocate",
             role: "admin", mustChangePassword: false, emailIsPlaceholder: false,
             capabilities: null, platformAdmin: false,
             chamber: { slug: "demo-chamber", name: "Your Chamber", verified: false,
                        clientLoginPath: "/client/login/demo-chamber" } };

  if (p === "/api/portal/me")
    return { id: 1, name: "Fazal ur Rehman", username: "fazal.rehman",
             showFees: true, mustChangePassword: false };

  if (p.endsWith("/login"))
    return { ...(demoResponse(p.includes("portal") ? "/api/portal/me" : "/api/auth/me") as object),
             token: "demo" };

  if (p === "/api/signup")
    return { ...(demoResponse("/api/auth/me") as object), token: "demo" };

  // Devices, logout, and anything else that only writes: succeed silently.
  return {};
}
