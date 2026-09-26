import { useRouter } from "expo-router";
import { Plus, Search } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";
import {
  useLibrary,
  type AnyEntry,
  type JudgmentEntry,
  type LibraryKind,
  type MediaEntry,
  type ResearchEntry,
} from "@/lib/library-admin";
import { can, useSession } from "@/lib/session";

const TABS: { key: LibraryKind; label: string }[] = [
  { key: "judgments", label: "Judgments" },
  { key: "research", label: "Writing" },
  { key: "media", label: "Recordings" },
];

export default function ChamberLibrary() {
  const [kind, setKind] = useState<LibraryKind>("judgments");
  const [q, setQ] = useState("");
  const router = useRouter();
  const session = useSession();
  const mayEdit = can(session.status === "signed-in" ? session.account : null, "library.edit");
  const { data, isPending } = useLibrary<AnyEntry>(kind, q);

  return (
    <View className="flex-1">
      <View className="gap-3 border-b border-rule bg-surface px-4 py-3">
        <View className="flex-row gap-2">
          {TABS.map((t) => {
            const on = kind === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setKind(t.key)}
                className={`flex-1 items-center rounded-card border py-2 ${
                  on ? "border-gold bg-gold-wash" : "border-rule"
                }`}
              >
                <Text className={`text-sm ${on ? "font-semibold text-gold" : "text-ink-soft"}`}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View className="flex-row items-center gap-2">
          <Search size={18} color="#4b443a" />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search the chamber's library"
            placeholderTextColor="#a29a8c"
            className="flex-1 text-base text-ink"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
      </View>

      {isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#9a7622" />
        </View>
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(e) => String(e.id)}
          contentContainerClassName="gap-3 p-4 pb-24"
          ListHeaderComponent={
            <Text className="pb-1 text-xs uppercase tracking-[1.5px] text-ink-soft">
              {data?.items.length ?? 0} here · {data?.published ?? 0} on your site ·{" "}
              {data?.shared ?? 0} in the shared library
            </Text>
          }
          ListEmptyComponent={
            <Text className="px-6 py-16 text-center text-sm leading-6 text-ink-soft">
              {q ? `Nothing matches “${q}”.` : "Nothing here yet."}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/chamber-library/${kind}?id=${item.id}`)}
              className="gap-1.5 rounded-card border border-rule bg-surface p-4 active:bg-gold-wash"
            >
              <Text className="text-base font-semibold leading-6 text-ink">{item.title}</Text>
              <Subtitle kind={kind} entry={item} />
              <View className="flex-row flex-wrap gap-1.5 pt-1">
                <Badge
                  text={item.published ? "On your site" : "Draft"}
                  tone={item.published ? "gold" : "plain"}
                />
                {item.shareState === "approved" ? <Badge text="Shared" tone="gold" /> : null}
                {item.shareState === "pending" ? <Badge text="Offered" tone="plain" /> : null}
                {item.shareState === "declined" ? <Badge text="Not taken" tone="plain" /> : null}
              </View>
            </Pressable>
          )}
        />
      )}

      {mayEdit ? (
        <Pressable
          onPress={() => router.push(`/chamber-library/${kind}`)}
          accessibilityRole="button"
          accessibilityLabel="Add to the library"
          className="absolute bottom-5 right-5 size-14 items-center justify-center rounded-full bg-ink active:bg-ink-soft"
        >
          <Plus size={26} color="#ffffff" />
        </Pressable>
      ) : null}
    </View>
  );
}

function Subtitle({ kind, entry }: { kind: LibraryKind; entry: AnyEntry }) {
  let line = "";
  if (kind === "judgments") {
    const j = entry as JudgmentEntry;
    // The missing citation is said out loud rather than left as an absence.
    // It is the one thing that decides whether this can ever be published,
    // and a court name alone reads like a complete entry.
    line = [j.citation || "No citation yet", j.court].filter(Boolean).join(" · ");
  } else if (kind === "research") {
    const r = entry as ResearchEntry;
    line = [r.topic, r.summary].filter(Boolean).join(" · ");
  } else {
    const m = entry as MediaEntry;
    line = [m.kind, m.topic].filter(Boolean).join(" · ");
  }
  return line ? (
    <Text numberOfLines={2} className="text-xs leading-5 text-ink-soft">
      {line}
    </Text>
  ) : null;
}

function Badge({ text, tone }: { text: string; tone: "gold" | "plain" }) {
  return (
    <View className={`rounded-full px-2 py-0.5 ${tone === "gold" ? "bg-gold-wash" : "bg-ground"}`}>
      <Text
        className={`text-[11px] font-semibold ${tone === "gold" ? "text-gold" : "text-ink-soft"}`}
      >
        {text}
      </Text>
    </View>
  );
}
