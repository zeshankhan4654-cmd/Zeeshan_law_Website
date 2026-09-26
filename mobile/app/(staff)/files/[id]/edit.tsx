import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { DateChoice } from "@/components/DateChoice";
import { Field } from "@/components/Field";
import { ApiError } from "@/lib/api";
import { useEditCase, useOfficeCase, type CaseDraft } from "@/lib/office";

const STATUSES = ["Active", "Reserved", "Decided", "Withdrawn", "Dormant"];

export default function EditCase() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const caseId = Number(id);
  const router = useRouter();
  const { data: file, isPending } = useOfficeCase(caseId);
  const edit = useEditCase(caseId);

  const [draft, setDraft] = useState<CaseDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filled in once the matter has arrived; a form cannot show what has not
  // been fetched, and starting blank would invite someone to type over it.
  useEffect(() => {
    if (file && !draft) {
      setDraft({
        title: file.title,
        court: file.court,
        caseType: file.caseType,
        status: file.status,
        nextHearing: file.nextHearing ? file.nextHearing.slice(0, 10) : "",
        notes: file.notes,
      });
    }
  }, [file, draft]);

  if (isPending || !draft) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#9a7622" />
      </View>
    );
  }

  const set = <K extends keyof CaseDraft>(k: K, v: CaseDraft[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  const ready = draft.title.trim().length >= 3 && !edit.isPending;

  async function save() {
    if (!draft) return;
    setError(null);
    try {
      await edit.mutateAsync({ ...draft, title: draft.title.trim() });
      router.back();
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Could not save. Check the connection and try again."
      );
    }
  }

  return (
    <ScrollView contentContainerClassName="gap-5 p-4 pb-10" keyboardShouldPersistTaps="handled">
      <Field label="Title" value={draft.title} onChange={(v) => set("title", v)} />
      <Field
        label="Court"
        value={draft.court}
        onChange={(v) => set("court", v)}
        placeholder="Peshawar High Court"
      />
      <Field
        label="Kind of matter"
        value={draft.caseType}
        onChange={(v) => set("caseType", v)}
        placeholder="Criminal appeal, civil suit, writ…"
      />

      <View className="gap-1.5">
        <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-soft">
          Status
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {STATUSES.map((s) => {
            const on = draft.status === s;
            return (
              <Pressable
                key={s}
                onPress={() => set("status", s)}
                className={`rounded-card border px-3 py-2 ${
                  on ? "border-gold bg-gold-wash" : "border-rule bg-surface"
                }`}
              >
                <Text className={`text-sm ${on ? "font-semibold text-gold" : "text-ink-soft"}`}>
                  {s}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="gap-1.5">
        <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-soft">
          Next hearing
        </Text>
        <DateChoice value={draft.nextHearing} onChange={(v) => set("nextHearing", v)} />
        {draft.nextHearing ? (
          <Pressable onPress={() => set("nextHearing", "")} className="self-start py-1">
            <Text className="text-xs font-semibold text-gold">Clear the date</Text>
          </Pressable>
        ) : (
          <Text className="text-xs leading-5 text-ink-soft">
            Nothing listed. The matter stays off the cause list until a date is set.
          </Text>
        )}
      </View>

      <Field
        label="Chamber note"
        value={draft.notes}
        onChange={(v) => set("notes", v)}
        multiline
        hint="Internal. The client never sees this."
      />

      {error ? (
        <View className="rounded-card border border-rule bg-gold-wash px-4 py-3">
          <Text className="text-sm leading-6 text-ink">{error}</Text>
        </View>
      ) : null}

      <Pressable
        onPress={save}
        disabled={!ready}
        className={`items-center rounded-card py-4 ${ready ? "bg-ink active:bg-ink-soft" : "bg-ink/40"}`}
      >
        {edit.isPending ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-base font-semibold text-white">Save changes</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
