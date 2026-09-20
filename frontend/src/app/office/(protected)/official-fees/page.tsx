import { NotPermitted, PageHeading } from "@/components/office/PageHeading";
import { officeFetch } from "@/lib/office-data";
import { can } from "@/lib/office-nav";
import { getSessionUser } from "@/lib/session";
import { OfficialFees, type OfficialFeeRow } from "./Ledger";

export const metadata = { title: "Official fees — Office" };

export default async function OfficialFeesPage() {
  const [data, user] = await Promise.all([
    officeFetch<{ items: OfficialFeeRow[]; total: number }>("/api/office/official-fees"),
    getSessionUser(),
  ]);
  if (!data) return <NotPermitted />;

  return (
    <>
      <PageHeading title="Official fees" subtitle="Court fees, stamp duty and the like." />
      <OfficialFees
        items={data.items}
        total={data.total}
        canEdit={can(user?.role, user?.capabilities, "money.edit")}
      />
    </>
  );
}
