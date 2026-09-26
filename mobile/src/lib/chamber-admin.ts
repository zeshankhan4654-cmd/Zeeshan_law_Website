import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { useAuthToken } from "./session";

/**
 * Running the chamber itself: who works here, what each of them may do, and
 * what the public site says.
 *
 * All of it sits behind users.manage or settings.edit, and all of it is the
 * kind of thing that is done once and then left alone — which is why only
 * the parts that go wrong at inconvenient moments are offered on a phone.
 */

export type StaffMember = {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  mustChangePassword: boolean;
  createdAt: string;
};

export type RoleOption = { roleKey: string; label: string };

export type RoleDetail = RoleOption & {
  caps: string[];
  userCount: number;
  isRoot: boolean;
};

export function useStaff() {
  const token = useAuthToken();
  return useQuery({
    queryKey: ["office", "staff"],
    queryFn: () =>
      apiFetch<{ items: StaffMember[]; roles: RoleOption[] }>("/api/office/users", { token }),
    enabled: token !== null,
  });
}

export function useRoles() {
  const token = useAuthToken();
  return useQuery({
    queryKey: ["office", "roles"],
    queryFn: () =>
      apiFetch<{ roles: RoleDetail[]; allCaps: string[] }>("/api/office/roles", { token }),
    enabled: token !== null,
  });
}

function useStaffMutation<TArgs, TOut>(run: (token: string | null, args: TArgs) => Promise<TOut>) {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: TArgs) => run(token, args),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["office", "staff"] });
      void queryClient.invalidateQueries({ queryKey: ["office", "roles"] });
    },
  });
}

/** Returns the starting password, which is shown once and kept nowhere. */
export function useAddStaff() {
  return useStaffMutation<
    { fullName: string; username: string; email: string; role: string },
    { id: number; password: string }
  >((token, body) =>
    apiFetch("/api/office/users", { method: "POST", token, body: JSON.stringify(body) })
  );
}

export function useIssuePassword() {
  return useStaffMutation<number, { password: string }>((token, id) =>
    apiFetch(`/api/office/users/${id}/password`, { method: "POST", token })
  );
}

export function useSiteSettings() {
  const token = useAuthToken();
  return useQuery({
    queryKey: ["office", "settings"],
    queryFn: () => apiFetch<Record<string, string>>("/api/office/settings", { token }),
    enabled: token !== null,
  });
}

export function useSaveSettings() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, string>) =>
      apiFetch<Record<string, string>>("/api/office/settings", {
        method: "PATCH",
        token,
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["office", "settings"] });
      // The public site reads the same values.
      void queryClient.invalidateQueries({ queryKey: ["platform", "settings"] });
    },
  });
}
