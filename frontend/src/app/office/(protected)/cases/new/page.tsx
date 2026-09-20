import { NotPermitted, PageHeading } from "@/components/office/PageHeading";
import { officeFetch, type ClientRow } from "@/lib/office-data";
import { CaseForm } from "../CaseForm";

export const metadata = { title: "Open a case — Office" };

export default async function NewCase({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client } = await searchParams;
  const clients = await officeFetch<{ items: ClientRow[] }>("/api/office/clients?limit=200");
  if (!clients) return <NotPermitted />;

  const preselected = client ? Number(client) : undefined;

  return (
    <>
      <PageHeading title="Open a case" />
      <CaseForm
        clients={clients.items.map((c) => ({ id: c.id, name: c.name }))}
        initial={{ clientId: Number.isInteger(preselected) ? preselected : undefined }}
      />
    </>
  );
}
