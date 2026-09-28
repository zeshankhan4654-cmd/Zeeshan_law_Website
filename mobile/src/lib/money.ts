import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_URL, apiFetch } from "./api";
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
  description: string;
  amount: number;
  entryDate: string;
  receiptNo: string;
  /** "office" or "client". Only the first is money owed back. */
  paidBy: string;
  /** Null while the chamber is still out of pocket. */
  recoveredAt: string | null;
  note: string;
};

export type ExpenseEntry = {
  id: number;
  category: string;
  amount: number;
  expenseDate: string;
  description: string;
  paidTo: string;
  mode: string;
  caseId: number | null;
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
      apiFetch<{ items: OfficialFeeEntry[]; total: number; outstanding: number }>("/api/office/official-fees", {
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
    description: string;
    amount: number;
    entryDate: string;
    receiptNo: string;
    /** "office" when the chamber laid it out, "client" when they paid it. */
    paidBy: string;
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
    paidTo: string;
    mode: string;
    caseId: number | null;
  }>((token, body) =>
    apiFetch("/api/office/expenses", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    })
  );
}

/**
 * Marking what the chamber advanced as recovered — or as not, when it was
 * ticked in error. What is still out of pocket is the only question this
 * ledger exists to answer, so it has to be correctable.
 */
export function useSetRecovered() {
  return useMoneyMutation<{ id: number; recovered: boolean }>((token, { id, recovered }) =>
    apiFetch(`/api/office/official-fees/${id}/recovered`, {
      method: "POST",
      token,
      body: JSON.stringify({ recovered }),
    })
  );
}

/**
 * A link to a statement of account, for a matter or for a whole client.
 *
 * The statement is a page the browser prints, so what comes back is an
 * address rather than data. It carries a grant that opens that one
 * statement for ten minutes — see the backend's signStatementGrant — which
 * is why it is asked for at the moment it is opened rather than held.
 */
export function useStatementLink() {
  const token = useAuthToken();
  return useMutation({
    mutationFn: ({ scope, id }: { scope: "case" | "client"; id: number }) =>
      apiFetch<{ path: string }>(`/api/office/statements/${scope}/${id}`, {
        method: "POST",
        token,
      }),
  });
}

/** The statement's full address, for handing to a browser. */
export function statementUrl(path: string): string {
  return `${API_URL}${path}`;
}

/**
 * A reminder to a client about what is due, over WhatsApp.
 *
 * Opened as a prepared message rather than sent: the chamber reads it, and
 * changes it, before anything reaches a client. A demand for money sent by
 * software without an advocate seeing it is how a chamber loses a client it
 * still had.
 *
 * Only digits survive from the number. A Pakistani number written 0300
 * 1234567 has to reach WhatsApp as 923001234567, and the leading zero is
 * the local form of the country code rather than part of the number.
 */
export function whatsappUrl(phone: string, message: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return null;
  const international = digits.startsWith("0")
    ? `92${digits.slice(1)}`
    : digits.startsWith("92")
      ? digits
      : digits;
  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
}

/** When this client was last reminded, and about how much. */
export type FeeReminder = {
  id: number;
  amount: number;
  openedAt: string;
  openedBy: string;
  caseId: number | null;
};

export function useLastReminder(clientId: number | null) {
  const token = useAuthToken();
  return useQuery({
    queryKey: ["office", "fee-reminder", clientId],
    queryFn: () =>
      apiFetch<{ last: FeeReminder | null }>(`/api/office/fee-reminders/${clientId}`, { token }),
    enabled: token !== null && clientId !== null,
  });
}

/**
 * Recording that a reminder was put in front of a client.
 *
 * Written after WhatsApp has been opened, not before, and it claims only
 * that: what comes back from WhatsApp is nothing at all, so a record saying
 * the message was sent would be one the chamber could not stand behind.
 */
export function useRecordReminder() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { clientId: number; caseId: number | null; amount: number }) =>
      apiFetch<{ id: number; openedAt: string }>("/api/office/fee-reminders", {
        method: "POST",
        token,
        body: JSON.stringify({ ...body, channel: "whatsapp" }),
      }),
    onSuccess: (_d, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["office", "fee-reminder", vars.clientId] });
    },
  });
}
