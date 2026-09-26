import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { useAuthToken } from "./session";

/**
 * The three ledgers, which are three different things and not one.
 *
 * Fees are what the chamber agreed and what it has received, always against
 * a matter. Official fees are what was paid to a court or a registry —
 * money that passed through the chamber rather than to it. Expenses are the
 * chamber's own running costs and belong to no matter at all.
 *
 * Keeping them apart is the point: a court fee counted as income would
 * overstate what the chamber earned, and an advocate would be answering for
 * it at the wrong time of year.
 */

export type FeeEntry = {
  id: number;
  kind: "agreed" | "received";
  amount: number;
  entryDate: string;
  note: string;
  caseId: number;
  caseTitle: string;
  clientName: string;
};

export type OfficialFeeEntry = {
  id: number;
  caseId: number | null;
  caseTitle: string | null;
  kind: string;
  amount: number;
  entryDate: string;
  note: string;
};

export type ExpenseEntry = {
  id: number;
  category: string;
  amount: number;
  expenseDate: string;
  description: string;
};

export function useFeeLedger() {
  const token = useAuthToken();
  return useQuery({
    queryKey: ["office", "money", "fees"],
    queryFn: () =>
      apiFetch<{ items: FeeEntry[]; agreed: number; received: number }>("/api/office/fees", {
        token,
      }),
    enabled: token !== null,
  });
}

export function useOfficialFees() {
  const token = useAuthToken();
  return useQuery({
    queryKey: ["office", "money", "official"],
    queryFn: () =>
      apiFetch<{ items: OfficialFeeEntry[]; total: number }>("/api/office/official-fees", {
        token,
      }),
    enabled: token !== null,
  });
}

export function useExpenses() {
  const token = useAuthToken();
  return useQuery({
    queryKey: ["office", "money", "expenses"],
    queryFn: () =>
      apiFetch<{
        items: ExpenseEntry[];
        total: number;
        byCategory: { category: string; total: number }[];
      }>("/api/office/expenses", { token }),
    enabled: token !== null,
  });
}

/** Every ledger write unsettles the same screens. */
function useMoneyMutation<TArgs>(run: (token: string | null, args: TArgs) => Promise<unknown>) {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: TArgs) => run(token, args),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["office", "money"] });
      void queryClient.invalidateQueries({ queryKey: ["office", "case"] });
    },
  });
}

export function useAddFee(caseId: number) {
  return useMoneyMutation<{ kind: "agreed" | "received"; amount: number; entryDate: string; note: string }>(
    (token, body) =>
      apiFetch(`/api/office/cases/${caseId}/fees`, {
        method: "POST",
        token,
        body: JSON.stringify(body),
      })
  );
}

export function useAddOfficialFee() {
  return useMoneyMutation<{
    caseId: number | null;
    kind: string;
    amount: number;
    entryDate: string;
    note: string;
  }>((token, body) =>
    apiFetch("/api/office/official-fees", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    })
  );
}

export function useAddExpense() {
  return useMoneyMutation<{
    category: string;
    amount: number;
    expenseDate: string;
    description: string;
  }>((token, body) =>
    apiFetch("/api/office/expenses", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    })
  );
}
