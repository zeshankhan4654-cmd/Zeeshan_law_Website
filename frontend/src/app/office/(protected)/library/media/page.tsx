import { NotPermitted, PageHeading } from "@/components/office/PageHeading";
import { officeFetch } from "@/lib/office-data";
import { can } from "@/lib/office-nav";
import { getSessionUser } from "@/lib/session";
import { LibraryEditor, type FieldSpec } from "../LibraryEditor";

export const metadata = { title: "Videos & lectures — Office" };

type Row = { id: number; title: string; published: boolean; kind: string; topic: string; shareState: string; shareNote: string };

const FIELDS: FieldSpec[] = [
  { key: "title", label: "Title", full: true },
  { key: "kind", label: "Kind", hint: "Video, Lecture, Interview…" },
  { key: "topic", label: "Topic" },
  {
    key: "url",
    label: "Link",
    hint: "Where it can be watched. Required before it can be published.",
    full: true,
  },
  { key: "recordedOn", label: "Recorded on", type: "date" },
  { key: "description", label: "Description", type: "textarea", full: true },
];

export default async function MediaAdmin() {
  const [data, user] = await Promise.all([
    officeFetch<{ items: Row[]; published: number; shared: number }>("/api/office/library/media"),
    getSessionUser(),
  ]);
  if (!data) return <NotPermitted />;

  return (
    <>
      <PageHeading
        title="Videos & lectures"
        subtitle={`${data.published} on your website, ${data.items.length - data.published} in draft` + (data.shared ? `, ${data.shared} in the shared library` : "")}
      />
      <LibraryEditor
        kind="media"
        fields={FIELDS}
        entries={data.items.map((e) => ({
          ...e,
          subtitle: [e.kind, e.topic].filter(Boolean).join(" · ") || "no topic",
        }))}
        canEdit={can(user?.role, user?.capabilities, "library.edit")}
        canPublish={can(user?.role, user?.capabilities, "library.publish")}
        canDelete={can(user?.role, user?.capabilities, "library.delete")}
        addLabel="Add a recording"
        emptyNote="Nothing here yet."
      />
    </>
  );
}
