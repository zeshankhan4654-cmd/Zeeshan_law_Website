import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Field } from "@/components/Field";
import { PublishSwitch, ShareRow } from "@/components/LibraryControls";
import { ApiError } from "@/lib/api";
import { useLibraryEntry, useOfferToShared, useSaveLibraryEntry, type ResearchEntry } from "@/lib/library-admin";
import { can, useSession } from "@/lib/session";

type Draft = { title: string; topic: string; summary: string; body: string; tags: string; published: boolean };
const EMPTY: Draft = { title: "", topic: "", summary: "", body: "", tags: "", published: false };

export default function ResearchEditor() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const entryId = id ? Number(id) : null;
  const router = useRouter();
  const session = useSession();
  const mayPublish = can(session.status === "signed-in" ? session.account : null, "library.publish");

  const { data, isPending } = useLibraryEntry<ResearchEntry>("research", entryId);
  const save = useSaveLibraryEntry("research", entryId);
  const offer = useOfferToShared("research", entryId ?? 0);

  const [draft, setDraft] = useState<Draft | null>(entryId === null ? EMPTY : null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data && !draft) {
      setDraft({
        title: data.title, topic: data.topic, summary: data.summary,
        body: data.body, tags: data.tags, published: data.published,
      });
    }
  }, [data, draft]);

  if ((entryId !== null && isPending) || !draft) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#9a7622" />
      </View>
    );
  }

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  const shareBlocked =
    draft.summary.trim() === "" && draft.body.trim() === ""
      ? "There is nothing in this to share yet."
      : null;

  const ready = draft.title.trim().length >= 3 && !save.isPending;

  async function submit() {
    if (!draft) return;
    setError(null);
    try {
      await save.mutateAsync({ ...draft, title: draft.title.trim(), caseId: null });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save. Try again.");
    }
  }

  return (
    <ScrollView contentContainerClassName="gap-5 p-4 pb-10" keyboardShouldPersistTaps="handled">
      <Field label="Title" value={draft.title} onChange={(v) => set("title", v)} autoCapitalize="sentences" />
      <Field label="Topic" value={draft.topic} onChange={(v) => set("topic", v)} placeholder="Civil procedure" />
      <Field
        label="In short"
        value={draft.summary}
        onChange={(v) => set("summary", v)}
        multiline
        autoCapitalize="sentences"
        hint="What a reader sees before opening it."
      />
      <Field
        label="The writing"
        value={draft.body}
        onChange={(v) => set("body", v)}
        multiline
        autoCapitalize="sentences"
        hint="A phone suits notes and corrections. A long piece is easier at a desk."
      />
      <Field label="Tags" value={draft.tags} onChange={(v) => set("tags", v)} autoCapitalize="none" />

      <PublishSwitch
        published={draft.published}
        onChange={(v) => set("published", v)}
        blockedBecause={null}
        mayPublish={mayPublish}
      />

      {entryId !== null && data ? (
        <ShareRow
          shareState={data.shareState}
          onOffer={(v) => offer.mutate(v)}
          busy={offer.isPending}
          blockedBecause={shareBlocked}
          mayShare={mayPublish}
        />
      ) : null}

      {error ? (
        <View className="rounded-card border border-rule bg-gold-wash px-4 py-3">
          <Text className="text-sm leading-6 text-ink">{error}</Text>
        </View>
      ) : null}

      <Pressable
        onPress={submit}
        disabled={!ready}
        className={`items-center rounded-card py-4 ${ready ? "bg-ink active:bg-ink-soft" : "bg-ink/40"}`}
      >
        {save.isPending ? <ActivityIndicator color="#ffffff" /> : <Text className="text-base font-semibold text-white">Save</Text>}
      </Pressable>
    </ScrollView>
  );
}
