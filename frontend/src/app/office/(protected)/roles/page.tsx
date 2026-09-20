import { NotPermitted, PageHeading } from "@/components/office/PageHeading";
import { officeFetch } from "@/lib/office-data";
import { RoleEditor, type Role } from "./RoleEditor";

export const metadata = { title: "Roles & access — Office" };

export default async function Roles() {
  const data = await officeFetch<{ roles: Role[]; allCaps: Record<string, string> }>(
    "/api/office/roles"
  );
  if (!data) return <NotPermitted />;

  return (
    <>
      <PageHeading
        title="Roles & access"
        subtitle="What each role may do. A role of the chamber's own making is as real as one that ships."
      />
      <RoleEditor roles={data.roles} allCaps={data.allCaps} />
    </>
  );
}
