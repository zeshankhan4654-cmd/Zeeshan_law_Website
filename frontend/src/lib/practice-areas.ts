import {
  Briefcase,
  Building2,
  Calculator,
  Gavel,
  HeartHandshake,
  Scale,
  Timer,
  type LucideIcon,
} from "lucide-react";

/**
 * What the chamber does.
 *
 * These are editorial content, not data: there is no practice-areas table,
 * and until Phase 6 gives the office a screen to edit them there would be
 * nowhere to put them but here. Each `topic` matches the topic on the
 * library articles, so "read what we have written" leads to real material
 * rather than a dead link.
 */
export type PracticeArea = {
  slug: string;
  title: string;
  icon: LucideIcon;
  summary: string;
  /** Matches Research.topic in the library. */
  topic: string;
  work: string[];
};

export const PRACTICE_AREAS: PracticeArea[] = [
  {
    slug: "arbitration",
    title: "Arbitration & ADR",
    icon: Scale,
    topic: "Arbitration & ADR",
    summary:
      "Drafting the clause, appointing the arbitrator, conducting the reference, and the applications that decide whether a dispute is heard by an arbitrator or a court at all.",
    work: [
      "Arbitration clauses in commercial contracts",
      "Applications under the Arbitration Act 1940 to stay a suit",
      "Conduct of the reference and the award",
      "Objections to, and enforcement of, an award",
    ],
  },
  {
    slug: "civil-and-criminal",
    title: "Civil & Criminal Litigation",
    icon: Gavel,
    topic: "Civil & Criminal",
    summary:
      "Trial and appellate work before the courts at Peshawar, from suits for specific performance and declaration to bail and criminal appeals.",
    work: [
      "Suits for declaration, possession and specific performance",
      "Pre-arrest and post-arrest bail",
      "Criminal appeals and revisions",
      "Execution and recovery proceedings",
    ],
  },
  {
    slug: "family-law",
    title: "Family Law",
    icon: HeartHandshake,
    topic: "Family Law",
    summary:
      "Matters before the Family Courts, conducted with the discretion they require — dissolution, dower, maintenance, custody and guardianship.",
    work: [
      "Khula and dissolution of marriage",
      "Dower and maintenance claims",
      "Custody, guardianship and visitation",
      "Enforcement of family court decrees",
    ],
  },
  {
    slug: "corporate",
    title: "Corporate Law",
    icon: Briefcase,
    topic: "Corporate Law",
    summary:
      "Advice and litigation for businesses: contracts that hold, notices that work, and recovery of what is owed without a longer fight than necessary.",
    work: [
      "Commercial contracts and legal notices",
      "Recovery suits, including summary suits under Order XXXVII",
      "Shareholder and partnership disputes",
      "Day-to-day advisory work",
    ],
  },
  {
    slug: "company-registration",
    title: "Company Registration & SECP",
    icon: Building2,
    topic: "Company Registration / SECP",
    summary:
      "Incorporation and the filings that follow it — the returns a private company forgets about until they are overdue and carrying a penalty.",
    work: [
      "Incorporation of private and single-member companies",
      "Annual returns and statutory filings",
      "Changes in directors, capital and registered office",
      "Regularising a company that has fallen behind",
    ],
  },
  {
    slug: "taxation",
    title: "Taxation",
    icon: Calculator,
    topic: "Taxation",
    summary:
      "Income tax and sales tax notices, and the appeals that follow them. A notice has a deadline printed on it, and that deadline is the whole case.",
    work: [
      "Replies to FBR notices",
      "Appeals before the Commissioner (Appeals) and the Tribunal",
      "Registration and compliance",
      "Recovery and refund matters",
    ],
  },
  {
    slug: "limitation",
    title: "Limitation & Appeals",
    icon: Timer,
    topic: "Limitation",
    summary:
      "The question that decides an appeal before its merits are ever reached: whether it was filed in time, and what can be done when it was not.",
    work: [
      "Appeals and revisions within limitation",
      "Applications for condonation of delay",
      "Advice on when time began to run",
      "Review and restoration applications",
    ],
  },
];

export function practiceAreaBySlug(slug: string): PracticeArea | undefined {
  return PRACTICE_AREAS.find((a) => a.slug === slug);
}
