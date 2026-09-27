import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { useAuthToken } from "./session";

/**
 * The chamber's own diary: what has to be done, as against what the courts
 * have listed.
 *
 * The cause list is the day the courts have fixed. This is the other half —
 * file the rejoinder, collect the certified copy, telephone the client
 * before the date — and a practice is lost through this half rather than
 * through the listed one.
 */

export type DiaryTask = {
  id: number;
  taskDate: string;
  title: string;
  notes: string;
  priority: string;
  done: boolean;
  doneAt: string | null;
  createdBy: string;
  case: { id: number; title: string; caseNo: string } | null;
  client: { id: number; name: string } | null;
};

export type DashboardHearing = {
  id: number;
  date: string;
  purpose: string;
  /** Whether the outcome has been written up yet. */
  recorded: boolean;
  caseId: number;
  caseTitle: string;
  caseNo: string;
  court: string;
  stage: string;
  status: string;
  clientName: string;
  clientPhone: string;
};

export type DashboardFollowUp = {
  id: number;
  followUpDue: string;
  subject: string;
  summary: string;
  personName: string;
  client: { id: number; name: string } | null;
};

export type Dashboard = {
  from: string;
  to: string;
  counts: { hearings: number; tasks: number; overdue: number; activeCases: number };
  hearings: DashboardHearing[];
  tasks: DiaryTask[];
  followUps: DashboardFollowUp[];
};

/**
 * One request fills the whole screen.
 *
 * Today, tomorrow, this week, this month and a range of one's own are the
 * same question with different dates, so the period is two strings and the
 * screen never has to know which button produced them.
 */
export function useDashboard(from: string, to: string) {
  const token = useAuthToken();
  return useQuery({
    queryKey: ["office", "dashboard", from, to],
    queryFn: () =>
      apiFetch<Dashboard>(`/api/office/dashboard?from=${from}&to=${to}`, { token }),
    enabled: token !== null,
  });
}

export function useTasks(state: "open" | "done" | "all" = "open") {
  const token = useAuthToken();
  return useQuery({
    queryKey: ["office", "tasks", state],
    queryFn: () =>
      apiFetch<{ items: DiaryTask[]; overdue: number }>(`/api/office/tasks?state=${state}`, {
        token,
      }),
    enabled: token !== null,
  });
}

/**
 * Anything that changes the diary changes the day as well, so both are
 * refetched. Ticking a task off on the dashboard has to move the count
 * above it, and a screen that has to be left and re-entered to show the
 * truth is one nobody trusts.
 */
function useDiaryMutation<TArgs>(run: (token: string | null, args: TArgs) => Promise<unknown>) {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: TArgs) => run(token, args),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["office", "tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["office", "dashboard"] });
    },
  });
}

export type NewTask = {
  title: string;
  taskDate: string;
  priority: string;
  notes: string;
  caseId: number | null;
  clientId: number | null;
};

export function useAddTask() {
  return useDiaryMutation<NewTask>((token, body) =>
    apiFetch("/api/office/tasks", { method: "POST", token, body: JSON.stringify(body) })
  );
}

/** Both directions: a task ticked by mistake has to be able to come back. */
export function useSetTaskDone() {
  return useDiaryMutation<{ id: number; done: boolean }>((token, { id, done }) =>
    apiFetch(`/api/office/tasks/${id}/done`, {
      method: "POST",
      token,
      body: JSON.stringify({ done }),
    })
  );
}

export function useDeleteTask() {
  return useDiaryMutation<number>((token, id) =>
    apiFetch(`/api/office/tasks/${id}`, { method: "DELETE", token })
  );
}

/** The periods the office diary opens on, as plain dates. */
export type PeriodKey = "today" | "tomorrow" | "week" | "month";

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/**
 * Worked from the phone's own midnight rather than from UTC. An advocate in
 * Peshawar opening the app at nine in the evening must see tomorrow's date
 * as tomorrow, and a UTC day would still be showing today.
 */
export function periodDates(key: PeriodKey): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (key === "today") return { from: iso(start), to: iso(start) };

  if (key === "tomorrow") {
    const d = new Date(start);
    d.setDate(d.getDate() + 1);
    return { from: iso(d), to: iso(d) };
  }

  if (key === "week") {
    // To the end of this calendar week, not seven days from now.
    //
    // A rolling week is the obvious implementation and it is wrong: on the
    // 27th of a thirty-day month it reaches into the next one, and the
    // screen then shows more hearings under "This week" than under "This
    // month", which reads as a broken app. Both periods end where the words
    // say they end, and the month is never smaller than the week inside it.
    //
    // The week is taken as ending on Sunday, this chamber's working week
    // running Monday to Saturday.
    const end = new Date(start);
    const sundayIsToday = end.getDay() === 0;
    end.setDate(end.getDate() + (sundayIsToday ? 0 : 7 - end.getDay()));
    return { from: iso(start), to: iso(end) };
  }

  // The rest of this month, not the whole of it: a diary looks forward.
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  return { from: iso(start), to: iso(end) };
}

export { iso as isoDate };
