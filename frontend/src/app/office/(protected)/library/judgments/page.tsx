import { NotPermitted, PageHeading } from "@/components/office/PageHeading";
import { officeFetch } from "@/lib/office-data";
import { can } from "@/lib/office-nav";
import { getSessionUser } from "@/lib/session";
import { LibraryEditor, type FieldSpec } from "../LibraryEditor";

export const metadata = { title: "Judgments — Office" };

type Row = { id: number; title: string; published: boolean; citation: string; court: string; shareState: string; shareNote: string };

const FIELDS: FieldSpec[] = [
  { key: "title", label: "Case title", full: true },
  {
    key: "citation",
    label: "Citation",
    hint: "As printed in the report, e.g. PLD 1967 SC 97. Required before it can be published.",
  },
  { key: "court", label: "Court" },
  { key: "judges", label: "Bench" },
  { key: "judgmentDate", label: "Date of judgment", type: "date" },
  { key: "sections", label: "Sections", full: true },
  { key: "principle", label: "What it decides", type: "textarea", full: true },
  { key: "summary", label: "Note", type: "textarea", rows: 6, full: true },
  { key: "tags", label: "Tags" },
  { key: "sourceUrl", label: "Link to the report" },
];

export default async function Judgments() {
  const [data, user] = await Promise.all([
    officeFetch<{ items: Row[]; published: number; shared: number }>("/api/office/library/judgments"),
    getSessionUser(),
  ]);
  if (!data) return <NotPermitted />;

  return (
    <>
      <PageHeading
        title="Judgments"
        subtitle={`${data.published} on your website, ${data.items.length - data.published} in draft` + (data.shared ? `, ${data.shared} in the shared library` : "")}
      />
      <LibraryEditor
        kind="judgments"
        fields={FIELDS}
        entries={data.items.map((e) => ({
          ...e,
          subtitle: [e.citation, e.court].filter(Boolean).join(" · ") || "no citation yet",
        }))}
        canEdit={can(user?.role, user?.capabilities, "library.edit")}
        canPublish={can(user?.role, user?.capabilities, "library.publish")}
        canDelete={can(user?.role, user?.capabilities, "library.delete")}
        addLabel="Add a judgment"
        emptyNote="Nothing here yet. A judgment cannot be published without its citation — the chamber's own rule, enforced by the server rather than remembered."
      />
    </>
  );
}
