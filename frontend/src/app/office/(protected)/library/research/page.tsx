import { NotPermitted, PageHeading } from "@/components/office/PageHeading";
import { officeFetch } from "@/lib/office-data";
import { can } from "@/lib/office-nav";
import { getSessionUser } from "@/lib/session";
import { LibraryEditor, type FieldSpec } from "../LibraryEditor";

export const metadata = { title: "Legal research — Office" };

type Row = { id: number; title: string; published: boolean; topic: string };

const FIELDS: FieldSpec[] = [
  { key: "title", label: "Title", full: true },
  { key: "topic", label: "Topic", hint: "Matches a practice area, e.g. Limitation." },
  { key: "tags", label: "Tags" },
  { key: "summary", label: "Summary", type: "textarea", full: true },
  {
    key: "body",
    label: "The article",
    type: "textarea",
    rows: 14,
    full: true,
    hint: "A blank line starts a paragraph. ## heading, - bullet, > quotation.",
  },
];

export default async function ResearchAdmin() {
  const [data, user] = await Promise.all([
    officeFetch<{ items: Row[]; published: number }>("/api/office/library/research"),
    getSessionUser(),
  ]);
  if (!data) return <NotPermitted />;

  return (
    <>
      <PageHeading
        title="Legal research"
        subtitle={`${data.published} on the public website, ${data.items.length - data.published} in draft`}
      />
      <LibraryEditor
        kind="research"
        fields={FIELDS}
        entries={data.items.map((e) => ({ ...e, subtitle: e.topic || "no topic" }))}
        canEdit={can(user?.role, user?.capabilities, "library.edit")}
        canPublish={can(user?.role, user?.capabilities, "library.publish")}
        canDelete={can(user?.role, user?.capabilities, "library.delete")}
        addLabel="Write an article"
        emptyNote="Nothing here yet."
      />
    </>
  );
}
