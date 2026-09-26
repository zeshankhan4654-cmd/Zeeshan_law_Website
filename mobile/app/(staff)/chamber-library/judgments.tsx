import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { DateChoice } from "@/components/DateChoice";
import { Field } from "@/components/Field";
import { PublishSwitch, ShareRow } from "@/components/LibraryControls";
import { ApiError } from "@/lib/api";
import {
  useLibraryEntry,
  useOfferToShared,
  useSaveLibraryEntry,
  type JudgmentEntry,
} from "@/lib/library-admin";
import { can, useSession } from "@/lib/session";

type Draft = {
  title: string;
  citation: string;
  court: string;
  judges: string;
  judgmentDate: string;
  principle: string;
  summary: string;
  tags: string;
  sourceUrl: string;
  published: boolean;
};

const EMPTY: Draft = {
  title: "", citation: "", court: "", judges: "", judgmentDate: "",
  principle: "", summary: "", tags: "", sourceUrl: "", published: false,
};

export default function JudgmentEditor() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const entryId = id ? Number(id) : null;
  const router = useRouter();
  const session = useSession();
  const account = session.status === "signed-in" ? session.account : null;
  const mayPublish = can(account, "library.publish");

  const { data, isPending } = useLibraryEntry<JudgmentEntry>("judgments", entryId);
  const save = useSaveLibraryEntry("judgments", entryId);
  const offer = useOfferToShared("judgments", entryId ?? 0);

  const [draft, setDraft] = useState<Draft | null>(entryId === null ? EMPTY : null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data && !draft) {
      setDraft({
        title: data.title, citation: data.citation, court: data.court, judges: data.judges,
        judgmentDate: data.judgmentDate ? data.judgmentDate.slice(0, 10) : "",
        principle: data.principle, summary: data.summary, tags: data.tags,
        sourceUrl: data.sourceUrl, published: data.published,
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

  // The chamber's own rule, in the API and repeated here so it is read
  // before a switch is pressed rather than after.
  const noCitation = draft.citation.trim() === "";
  const publishBlocked = noCitation
    ? "A judgment cannot go on your site without its citation. Nothing is published here that has not been checked against the report."
    : null;

  const shareBlocked =
    noCitation
      ? "The shared library needs the citation, so another advocate can look it up."
      : draft.court.trim() === ""
        ? "The shared library needs the court that decided it."
        : draft.principle.trim() === "" && draft.summary.trim() === ""
          ? "Say what it decides. A citation with nothing beside it is of no use to anybody."
          : null;

  const ready = draft.title.trim().length >= 3 && !save.isPending;

  async function submit() {
    if (!draft) return;
    setError(null);
    try {
      await save.mutateAsync({
        ...draft,
        title: draft.title.trim(),
        judgmentDate: draft.judgmentDate || null,
      });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save. Try again.");
    }
  }

  return (
    <ScrollView contentContainerClassName="gap-5 p-4 pb-10" keyboardShouldPersistTaps="handled">
      <Field label="Title" value={draft.title} onChange={(v) => set("title", v)} autoCapitalize="sentences" />
      <Field
        label="Citation"
        value={draft.citation}
        onChange={(v) => set("citation", v)}
        autoCapitalize="characters"
        placeholder="PLD 2024 SC 115"
        hint="As reported. This is what lets anybody else find it."
      />
      <Field label="Court" value={draft.court} onChange={(v) => set("court", v)} placeholder="Supreme Court of Pakistan" />
      <Field label="Bench" value={draft.judges} onChange={(v) => set("judges", v)} />

      <View className="gap-1.5">
        <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-soft">
          Date of the judgment
        </Text>
        <DateChoice value={draft.judgmentDate} onChange={(v) => set("judgmentDate", v)} />
      </View>

      <Field
        label="What it decides"
        value={draft.principle}
        onChange={(v) => set("principle", v)}
        multiline
        autoCapitalize="sentences"
        hint="The principle, in your own words."
      />
      <Field label="Note" value={draft.summary} onChange={(v) => set("summary", v)} multiline autoCapitalize="sentences" />
      <Field label="Tags" value={draft.tags} onChange={(v) => set("tags", v)} autoCapitalize="none" placeholder="bail, section 497" />
      <Field label="Link to the report" value={draft.sourceUrl} onChange={(v) => set("sourceUrl", v)} autoCapitalize="none" placeholder="https://" />

      <PublishSwitch
        published={draft.published}
        onChange={(v) => set("published", v)}
        blockedBecause={publishBlocked}
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
        {save.isPending ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-base font-semibold text-white">Save</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
