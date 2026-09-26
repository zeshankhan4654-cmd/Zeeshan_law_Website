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

const CASE_DETAIL = {
  id: 1,
  title: "Criminal Appeal against conviction",
  court: "Peshawar High Court",
  caseType: "Criminal Appeal",
  status: "Active",
  nextHearing: day(0),
  notes: "INTERNAL: strategy note. Never visible in the client's portal.",
  createdAt: day(-120),
  client: { id: 1, name: "Fazal ur Rehman", phone: "", email: "" },
  hearings: [
    { id: 1, hearingDate: day(0), purpose: "Arguments on the appeal", outcome: "" },
    { id: 4, hearingDate: day(-24), purpose: "Framing of issues",
      outcome: "INTERNAL: adjourned, opposing counsel unprepared." },
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
  { id: 1, name: "Fazal ur Rehman", phone: "0300 1234567", email: "", portalEnabled: true, portalUsername: "fazal.rehman", caseCount: 2 },
  { id: 2, name: "Rukhsana Bibi", phone: "0311 7654321", email: "", portalEnabled: false, portalUsername: null, caseCount: 1 },
  { id: 3, name: "Sher Afzal Khan", phone: "0345 2223334", email: "sher@example.com", portalEnabled: true, portalUsername: "sher.afzal", caseCount: 1 },
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
