import { NotPermitted, PageHeading } from "@/components/office/PageHeading";
import { officeFetch } from "@/lib/office-data";
import { Accounts, type Account } from "./Accounts";

export const metadata = { title: "Accounts — Office" };

export default async function Users() {
  const data = await officeFetch<{ items: Account[]; roles: { roleKey: string; label: string }[] }>(
    "/api/office/users"
  );
  if (!data) return <NotPermitted />;

  return (
    <>
      <PageHeading
        title="Accounts"
        subtitle="Who may sign into the office, and what their role is."
      />
      <Accounts accounts={data.items} roles={data.roles} />
    </>
  );
}
