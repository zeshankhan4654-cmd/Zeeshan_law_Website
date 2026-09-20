import { NotPermitted, PageHeading } from "@/components/office/PageHeading";
import { officeFetch, type ClientRow } from "@/lib/office-data";
import { can } from "@/lib/office-nav";
import { getSessionUser } from "@/lib/session";
import { Diary, type Entry } from "./Diary";

export const metadata = { title: "Communications — Office" };

export default async function Communications() {
  const [data, clients, user] = await Promise.all([
    officeFetch<{ items: Entry[]; due: number }>("/api/office/communications"),
    officeFetch<{ items: ClientRow[] }>("/api/office/clients?limit=200"),
    getSessionUser(),
  ]);
  if (!data) return <NotPermitted />;

  return (
    <>
      <PageHeading
        title="Communications"
        subtitle={
          data.due > 0
            ? `${data.due} follow-up${data.due === 1 ? "" : "s"} due`
            : "No follow-ups outstanding"
        }
      />
      <Diary
        entries={data.items}
        clients={(clients?.items ?? []).map((c) => ({ id: c.id, name: c.name }))}
        canEdit={can(user?.role, user?.capabilities, "comms.edit")}
      />
    </>
  );
}
