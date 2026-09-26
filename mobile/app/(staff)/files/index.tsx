import { useRouter } from "expo-router";
import { Plus, Search } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useOfficeCases, type OfficeCaseSummary } from "@/lib/office";
import { can, useSession } from "@/lib/session";
import { formatDate } from "@/lib/portal";

export default function OfficeCases() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const { data, isPending } = useOfficeCases(q);
  const session = useSession();
  const mayOpen = can(session.status === "signed-in" ? session.account : null, "cases.edit");

  return (
    <View className="flex-1">
      <View className="flex-row items-center gap-2 border-b border-rule bg-surface px-4 py-3">
        <Search size={18} color="#4b443a" />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Case, court, or client"
          placeholderTextColor="#a29a8c"
          className="flex-1 text-base text-ink"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>

      {isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#9a7622" />
        </View>
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(c: OfficeCaseSummary) => String(c.id)}
          contentContainerClassName="gap-3 p-4"
          ListHeaderComponent={
            data && data.total > 0 ? (
              <Text className="pb-1 text-xs uppercase tracking-[1.5px] text-ink-soft">
                {data.total} case{data.total === 1 ? "" : "s"}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <Text className="px-6 py-16 text-center text-sm text-ink-soft">
              {q ? `Nothing matches “${q}”.` : "No cases yet."}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/files/${item.id}`)}
              className="gap-1 rounded-card border border-rule bg-surface p-4 active:bg-gold-wash"
            >
              <Text className="text-base font-semibold leading-6 text-ink">{item.title}</Text>
              <Text className="text-sm text-ink-soft">{item.client.name}</Text>
              <Text className="text-xs text-ink-soft">
                {[item.court, item.status, item.nextHearing ? formatDate(item.nextHearing) : null]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </Pressable>
          )}
        />
      )}

      {mayOpen ? (
        <Pressable
          onPress={() => router.push("/files/new")}
          accessibilityRole="button"
          accessibilityLabel="Open a matter"
          className="absolute bottom-5 right-5 size-14 items-center justify-center rounded-full bg-ink active:bg-ink-soft"
        >
          <Plus size={26} color="#ffffff" />
        </Pressable>
      ) : null}
    </View>
  );
}
