import { useRouter } from "expo-router";
import { BookOpen, Search } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useResearch, type ResearchSummary } from "@/lib/library";

export default function ResearchList() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const { data, isPending, isError, error } = useResearch(q);

  return (
    <View className="flex-1">
      <View className="flex-row items-center gap-2 border-b border-rule bg-surface px-4 py-3">
        <Search size={18} color="#4b443a" />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search the research library"
          placeholderTextColor="#a29a8c"
          className="flex-1 text-base text-ink"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      {isPending && (
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator color="#9a7622" />
          <Text className="text-sm text-ink-soft">Loading the library…</Text>
        </View>
      )}

      {isError && (
        <View className="flex-1 items-center justify-center gap-2 px-8">
          <Text className="text-center text-sm text-danger">
            {error instanceof Error ? error.message : "Could not load the library."}
          </Text>
        </View>
      )}

      {data && (
        <FlatList
          data={data.items}
          keyExtractor={(item: ResearchSummary) => String(item.id)}
          contentContainerClassName="gap-3 p-4"
          ListEmptyComponent={
            <View className="items-center gap-3 py-16">
              <BookOpen size={28} color="#c9bfae" />
              <Text className="text-center text-sm text-ink-soft">
                {q ? `Nothing in the library matches “${q}”.` : "The library is empty."}
              </Text>
            </View>
          }
          ListHeaderComponent={
            data.items.length > 0 ? (
              <Text className="pb-1 text-xs uppercase tracking-[1.5px] text-ink-soft">
                {data.total} article{data.total === 1 ? "" : "s"}
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/library/${item.id}`)}
              className="gap-1.5 rounded-card border border-rule bg-surface p-4 active:bg-gold-wash"
            >
              {item.topic ? (
                <View className="self-start rounded-full bg-gold-wash px-2.5 py-0.5">
                  <Text className="text-[11px] font-semibold text-gold">{item.topic}</Text>
                </View>
              ) : null}
              <Text className="text-base font-semibold leading-6 text-ink">{item.title}</Text>
              {item.summary ? (
                <Text className="text-sm leading-5 text-ink-soft" numberOfLines={3}>
                  {item.summary}
                </Text>
              ) : null}
              {/* Whose note it is. Chambers across the platform contribute
                  here, so a reader may never have heard of the author. */}
              <Text className="pt-1 text-xs text-ink-soft">{item.firm.name}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
