import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { useAuthToken } from "./session";

/**
 * The chamber's own library, as the chamber sees it.
 *
 * Distinct from lib/library.ts, which reads the shared library every
 * advocate can see. This one holds drafts, and drafts are the chamber's
 * business alone.
 *
 * Two rules the API enforces and this app states rather than discovers:
 * a judgment cannot be published without its citation, and a recording
 * cannot be published without its link. Offering an entry to the shared
 * library is stricter again, because there it has to stand in front of an
 * advocate who cannot ask who wrote it.
 */

export type LibraryKind = "judgments" | "research" | "media";

export type ShareState = "none" | "pending" | "approved" | "declined" | string;

export type JudgmentEntry = {
  id: number;
  /** The shelf it is on, if any. */
  folderId: number | null;
  title: string;
  citation: string;
  court: string;
  judges: string;
  judgmentDate: string | null;
  sections: string;
  principle: string;
  summary: string;
  tags: string;
  sourceUrl: string;
  published: boolean;
  shareState: ShareState;
};

export type ResearchEntry = {
  id: number;
  /** The shelf it is on, if any. */
  folderId: number | null;
  title: string;
  topic: string;
  summary: string;
  body: string;
  tags: string;
  published: boolean;
  shareState: ShareState;
};

export type MediaEntry = {
  id: number;
  /** The shelf it is on, if any. */
  folderId: number | null;
  title: string;
  kind: string;
  description: string;
  topic: string;
  url: string;
  recordedOn: string | null;
  published: boolean;
  shareState: ShareState;
};

export type AnyEntry = JudgmentEntry | ResearchEntry | MediaEntry;

/** Which shelf a list is narrowed to: one of them, the unfiled pile, or all. */
export type Shelf = number | "none" | null;

export function useLibrary<T extends AnyEntry>(kind: LibraryKind, q: string, shelf: Shelf = null) {
  const token = useAuthToken();
  return useQuery({
    queryKey: ["office", "library", kind, q, shelf],
    queryFn: () =>
      apiFetch<{ items: T[]; published: number; shared: number }>(
        `/api/office/library/${kind}?q=${encodeURIComponent(q)}` +
          (shelf === null ? "" : `&folder=${shelf}`),
        { token }
      ),
    enabled: token !== null,
  });
}

export type LibraryFolder = { id: number; name: string; sortOrder: number; count: number };

/**
 * The chamber's shelves for one half of the library.
 *
 * `unfiled` comes back with them because it is the number a chamber
 * actually wants: everything added in a hurry and never put away.
 */
export function useFolders(kind: LibraryKind) {
  const token = useAuthToken();
  return useQuery({
    queryKey: ["office", "library-folders", kind],
    queryFn: () =>
      apiFetch<{ items: LibraryFolder[]; unfiled: number }>(
        `/api/office/library-folders/${kind}`,
        { token }
      ),
    enabled: token !== null,
  });
}

function useFolderMutation<TArgs>(
  kind: LibraryKind,
  run: (token: string | null, args: TArgs) => Promise<unknown>
) {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: TArgs) => run(token, args),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["office", "library-folders", kind] });
      void queryClient.invalidateQueries({ queryKey: ["office", "library", kind] });
    },
  });
}

export function useAddFolder(kind: LibraryKind) {
  return useFolderMutation<string>(kind, (token, name) =>
    apiFetch(`/api/office/library-folders/${kind}`, {
      method: "POST",
      token,
      body: JSON.stringify({ name }),
    })
  );
}

export function useRenameFolder(kind: LibraryKind) {
  return useFolderMutation<{ id: number; name: string }>(kind, (token, { id, name }) =>
    apiFetch(`/api/office/library-folders/${id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ name }),
    })
  );
}

/** Removing the shelf, never what was on it — that falls back to unfiled. */
export function useDeleteFolder(kind: LibraryKind) {
  return useFolderMutation<number>(kind, (token, id) =>
    apiFetch(`/api/office/library-folders/${id}`, { method: "DELETE", token })
  );
}

/** Putting one entry on a shelf, or taking it off every shelf. */
export function useFileEntry(kind: LibraryKind) {
  return useFolderMutation<{ id: number; folderId: number | null }>(
    kind,
    (token, { id, folderId }) =>
      apiFetch(`/api/office/library/${kind}/${id}/folder`, {
        method: "POST",
        token,
        body: JSON.stringify({ folderId }),
      })
  );
}

export function useLibraryEntry<T extends AnyEntry>(kind: LibraryKind, id: number | null) {
  const token = useAuthToken();
  return useQuery({
    queryKey: ["office", "library", kind, "one", id],
    queryFn: () => apiFetch<T>(`/api/office/library/${kind}/${id}`, { token }),
    enabled: token !== null && id !== null,
  });
}

function useLibraryMutation<TArgs>(run: (token: string | null, args: TArgs) => Promise<unknown>) {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: TArgs) => run(token, args),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["office", "library"] });
      // The shared library the whole platform reads may have changed too.
      void queryClient.invalidateQueries({ queryKey: ["library"] });
    },
  });
}

export function useSaveLibraryEntry(kind: LibraryKind, id: number | null) {
  return useLibraryMutation<Record<string, unknown>>((token, body) =>
    apiFetch(id === null ? `/api/office/library/${kind}` : `/api/office/library/${kind}/${id}`, {
      method: id === null ? "POST" : "PATCH",
      token,
      body: JSON.stringify(body),
    })
  );
}

/**
 * The singular the API uses in the sharing routes. The list routes are
 * plural and the sharing ones are not, which is a seam worth naming once
 * here rather than remembering at four call sites.
 */
const SHARE_KIND: Record<LibraryKind, string> = {
  judgments: "judgment",
  research: "research",
  media: "media",
};

export function useOfferToShared(kind: LibraryKind, id: number) {
  return useLibraryMutation<boolean>((token, offer) =>
    apiFetch(`/api/office/library/${SHARE_KIND[kind]}/${id}/${offer ? "share" : "unshare"}`, {
      method: "POST",
      token,
    })
  );
}
