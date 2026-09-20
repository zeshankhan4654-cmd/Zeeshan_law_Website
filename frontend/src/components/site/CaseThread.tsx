"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mic, Play, Send, Square, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { CaseMessage } from "@/lib/portal-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * The conversation with the office about one matter.
 *
 * A client component because it both polls and writes. The voice note is
 * the reason it is worth the complexity: a client who will not sit down and
 * type three paragraphs will happily say them.
 */
export function CaseThread({ caseId }: { caseId: number }) {
  const queryClient = useQueryClient();
  const key = ["portal", "messages", caseId];

  const { data, isPending } = useQuery({
    queryKey: key,
    queryFn: () => apiFetch<{ items: CaseMessage[] }>(`/api/portal/cases/${caseId}/messages`),
    // The office may answer while this page is open.
    refetchInterval: 60_000,
  });

  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState<Blob | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: key });

  const sendText = useMutation({
    mutationFn: (body: string) =>
      apiFetch<CaseMessage>(`/api/portal/cases/${caseId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body }),
      }),
    onSuccess: refresh,
  });

  /**
   * Multipart, so this cannot go through apiFetch: the boundary is chosen
   * by the browser, and setting a JSON content-type by hand breaks it.
   */
  const sendVoice = useMutation({
    mutationFn: async ({ blob, note }: { blob: Blob; note: string }) => {
      const form = new FormData();
      form.append("audio", blob, "voice-note.webm");
      if (note) form.append("body", note);

      const res = await fetch(`${API_URL}/api/portal/cases/${caseId}/messages/voice`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(payload.error ?? "Could not send the recording.");
      }
    },
    onSuccess: refresh,
  });

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        setRecorded(new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }));
        // Release the microphone, or the browser keeps showing it in use.
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      setError("The microphone is not available. You can still write your question.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  async function send() {
    setError(null);
    try {
      if (recorded) {
        await sendVoice.mutateAsync({ blob: recorded, note: draft.trim() });
        setRecorded(null);
      } else {
        await sendText.mutateAsync(draft.trim());
      }
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not send.");
    }
  }

  const busy = sendText.isPending || sendVoice.isPending;
  const canSend = !busy && (recorded !== null || draft.trim().length > 0);

  return (
    <section className="space-y-4">
      <h2 className="font-display text-lg text-ink">Ask the office</h2>

      <div className="space-y-3 rounded-card border border-rule bg-surface p-5">
        {isPending ? (
          <p className="py-6 text-center text-sm text-ink-soft">Loading…</p>
        ) : data?.items.length === 0 ? (
          <p className="py-6 text-center text-sm leading-6 text-ink-soft">
            Nothing has been sent on this matter yet. Ask the chamber
            anything about your case — in writing, or speak it.
          </p>
        ) : (
          <ul className="space-y-3">
            {data?.items.map((m) => {
              const mine = m.authorType === "client";
              return (
                <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[85%] space-y-1.5">
                    <div
                      className={`space-y-2 rounded-card px-4 py-3 ${
                        mine ? "bg-gold-wash" : "border border-rule bg-ground"
                      }`}
                    >
                      {m.body && <p className="text-sm leading-6 text-ink">{m.body}</p>}
                      {m.hasVoiceNote && (
                        <audio
                          controls
                          preload="none"
                          /* The cookie has to ride with the media request,
                             which needs both of these and a CORS allowance
                             on the API side. */
                          crossOrigin="use-credentials"
                          src={`${API_URL}/api/portal/messages/${m.id}/audio`}
                          className="h-9 w-full max-w-xs"
                        >
                          <Play className="size-4" />
                        </audio>
                      )}
                    </div>
                    <p className={`text-[11px] text-ink-soft ${mine ? "text-right" : ""}`}>
                      {mine ? "You" : m.authorName || "The office"} ·{" "}
                      {new Date(m.createdAt).toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="space-y-2 border-t border-rule pt-4">
          {recording && (
            <p className="flex items-center gap-2 rounded-card bg-danger-wash px-3 py-2 text-sm text-danger">
              <span className="size-2 animate-pulse rounded-full bg-danger" />
              Recording…
              <button type="button" onClick={stopRecording} className="ml-auto font-semibold">
                Stop
              </button>
            </p>
          )}

          {recorded && !recording && (
            <p className="flex items-center gap-2 rounded-card bg-gold-wash px-3 py-2 text-sm text-gold">
              <Mic className="size-4" />
              Recording ready to send
              <button
                type="button"
                onClick={() => setRecorded(null)}
                aria-label="Discard the recording"
                className="ml-auto"
              >
                <Trash2 className="size-4 text-danger" />
              </button>
            </p>
          )}

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex items-end gap-2">
            <label htmlFor="draft" className="sr-only">
              Your question
            </label>
            <textarea
              id="draft"
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={recorded ? "Add a note (optional)" : "Write your question"}
              className="max-h-32 flex-1 resize-y rounded-card border border-rule bg-ground px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-gold focus:outline-none"
            />

            {!recorded && (
              <button
                type="button"
                onClick={() => (recording ? stopRecording() : void startRecording())}
                aria-label={recording ? "Stop recording" : "Record a voice note"}
                className={`grid size-10 shrink-0 place-items-center rounded-card ${
                  recording ? "bg-danger text-white" : "border border-rule text-gold hover:bg-gold-wash"
                }`}
              >
                {recording ? <Square className="size-4" /> : <Mic className="size-5" />}
              </button>
            )}

            <button
              type="button"
              onClick={() => void send()}
              disabled={!canSend}
              aria-label="Send"
              className={`grid size-10 shrink-0 place-items-center rounded-card ${
                canSend ? "bg-ink text-white hover:bg-ink-soft" : "bg-rule text-ink-soft"
              }`}
            >
              <Send className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
