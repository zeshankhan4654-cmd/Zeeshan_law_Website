import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { DateChoice } from "@/components/DateChoice";
import { Field } from "@/components/Field";
import { PublishSwitch, ShareRow } from "@/components/LibraryControls";
import { ApiError } from "@/lib/api";
import { useLibraryEntry, useOfferToShared, useSaveLibraryEntry, type MediaEntry } from "@/lib/library-admin";
import { can, useSession } from "@/lib/session";

type Draft = {
  title: string; kind: string; description: string; topic: string;
  url: string; recordedOn: string; published: boolean;
};
const EMPTY: Draft = { title: "", kind: "Video", description: "", topic: "", url: "", recordedOn: "", published: false };
const KINDS = ["Video", "Lecture", "Seminar", "Interview"];

export default function MediaEditor() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const entryId = id ? Number(id) : null;
  const router = useRouter();
  const session = useSession();
  const mayPublish = can(session.status === "signed-in" ? session.account : null, "library.publish");

  const { data, isPending } = useLibraryEntry<MediaEntry>("media", entryId);
  const save = useSaveLibraryEntry("media", entryId);
  const offer = useOfferToShared("media", entryId ?? 0);

  const [draft, setDraft] = useState<Draft | null>(entryId === null ? EMPTY : null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data && !draft) {
      setDraft({
        title: data.title, kind: data.kind, description: data.description, topic: data.topic,
        url: data.url, recordedOn: data.recordedOn ? data.recordedOn.slice(0, 10) : "",
        published: data.published,
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

  const noLink = draft.url.trim() === "";
  const blocked = noLink ? "A recording needs its link before it can go up." : null;

  const ready = draft.title.trim().length >= 3 && !save.isPending;

  async function submit() {
    if (!draft) return;
    setError(null);
    try {
      await save.mutateAsync({ ...draft, title: draft.title.trim(), recordedOn: draft.recordedOn || null });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save. Try again.");
    }
  }

  return (
    <ScrollView contentContainerClassName="gap-5 p-4 pb-10" keyboardShouldPersistTaps="handled">
      <Field label="Title" value={draft.title} onChange={(v) => set("title", v)} autoCapitalize="sentences" />

      <View className="gap-1.5">
        <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-soft">Kind</Text>
        <View className="flex-row flex-wrap gap-2">
          {KINDS.map((k) => {
            const on = draft.kind === k;
            return (
              <Pressable
                key={k}
                onPress={() => set("kind", k)}
                className={`rounded-card border px-3 py-2 ${on ? "border-gold bg-gold-wash" : "border-rule bg-surface"}`}
              >
                <Text className={`text-sm ${on ? "font-semibold text-gold" : "text-ink-soft"}`}>{k}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Field label="Link" value={draft.url} onChange={(v) => set("url", v)} autoCapitalize="none" placeholder="https://" hint="Where the recording actually lives." />
      <Field label="Topic" value={draft.topic} onChange={(v) => set("topic", v)} />
      <Field label="Description" value={draft.description} onChange={(v) => set("description", v)} multiline autoCapitalize="sentences" />

      <View className="gap-1.5">
        <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-soft">Recorded on</Text>
        <DateChoice value={draft.recordedOn} onChange={(v) => set("recordedOn", v)} />
      </View>

      <PublishSwitch
        published={draft.published}
        onChange={(v) => set("published", v)}
        blockedBecause={blocked}
        mayPublish={mayPublish}
      />

      {entryId !== null && data ? (
        <ShareRow
          shareState={data.shareState}
          onOffer={(v) => offer.mutate(v)}
          busy={offer.isPending}
          blockedBecause={blocked}
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
