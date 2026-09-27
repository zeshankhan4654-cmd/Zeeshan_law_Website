import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { ApiError } from "@/lib/api";
import { CaseFields } from "@/components/CaseFields";
import { useEditCase, useOfficeCase, type CaseDraft } from "@/lib/office";

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
        caseNo: file.caseNo,
        court: file.court,
        caseType: file.caseType,
        sections: file.sections,
        firDetails: file.firDetails,
        ourSide: file.ourSide,
        opposingParty: file.opposingParty,
        judge: file.judge,
        stage: file.stage,
        status: file.status,
        filedOn: file.filedOn ? file.filedOn.slice(0, 10) : "",
        nextHearing: file.nextHearing ? file.nextHearing.slice(0, 10) : "",
        assignedTo: file.assignedTo,
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
      <CaseFields draft={draft} set={set} detailsOpen />

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
