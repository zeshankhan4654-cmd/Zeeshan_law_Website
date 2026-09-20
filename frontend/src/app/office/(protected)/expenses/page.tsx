import { NotPermitted, PageHeading } from "@/components/office/PageHeading";
import { officeFetch } from "@/lib/office-data";
import { can } from "@/lib/office-nav";
import { getSessionUser } from "@/lib/session";
import { Expenses, type ExpenseRow } from "./Ledger";

export const metadata = { title: "Office expenses — Office" };

export default async function ExpensesPage() {
  const [data, user] = await Promise.all([
    officeFetch<{ items: ExpenseRow[]; total: number; byCategory: { category: string; total: number }[] }>(
      "/api/office/expenses"
    ),
    getSessionUser(),
  ]);
  if (!data) return <NotPermitted />;

  return (
    <>
      <PageHeading title="Office expenses" subtitle="What the chamber spends." />
      <Expenses
        items={data.items}
        total={data.total}
        byCategory={data.byCategory}
        canEdit={can(user?.role, user?.capabilities, "money.edit")}
      />
    </>
  );
}
