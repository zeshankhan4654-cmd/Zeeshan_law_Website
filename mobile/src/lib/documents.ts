import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Platform } from "react-native";
import { API_URL, ApiError } from "./api";
import { useAuthToken } from "./session";

/**
 * Putting a document on a case file from a telephone.
 *
 * The thing this is for is a photograph taken at the counter: a certified
 * copy handed over, an order sheet, a receipt. Those exist for five minutes
 * in an advocate's hand and then go into a bag, and a file that gets them
 * the same evening is a file that has them at all.
 *
 * Multipart cannot go through `apiFetch`: FormData must not carry a JSON
 * content-type, because the boundary is chosen by the runtime and setting
 * the header by hand breaks the upload.
 */

/**
 * What the two runtimes want is not the same thing, and this is where it is
 * dealt with rather than in the screen.
 *
 * React Native's FormData takes a local file as `{ uri, name, type }`. A
 * browser's refuses that object outright and needs a real Blob, so on the
 * web the picked file is fetched back out of its blob: or data: address
 * first. Getting this wrong fails only on one of the two, which is the kind
 * of bug that ships.
 */
async function appendFile(
  form: FormData,
  field: string,
  file: { uri: string; name: string; type: string }
): Promise<void> {
  if (Platform.OS === "web") {
    const blob = await (await fetch(file.uri)).blob();
    form.append(field, blob, file.name);
    return;
  }
  form.append(field, { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
}

export type NewDocument = {
  uri: string;
  name: string;
  type: string;
  title: string;
  /** Private unless this is deliberately set — see the backend's default. */
  clientVisible: boolean;
};

export function useAddDocument(caseId: number) {
  const token = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (doc: NewDocument) => {
      const form = new FormData();
      await appendFile(form, "file", doc);
      form.append("title", doc.title);
      // FormData carries strings; the schema takes Joi's boolean coercion.
      form.append("clientVisible", doc.clientVisible ? "true" : "false");

      const res = await fetch(`${API_URL}/api/office/cases/${caseId}/documents`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({ error: res.statusText }));
        throw new ApiError(res.status, payload.error ?? "Could not add the document.");
      }
      return (await res.json()) as { id: number; title: string };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["office", "case", caseId] });
    },
  });
}
