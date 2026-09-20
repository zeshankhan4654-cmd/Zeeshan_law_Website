import { Gavel, Search } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, FlatList, Text, TextInput, View } from "react-native";
import { useJudgments, type JudgmentSummary } from "@/lib/library";

export default function JudgmentsList() {
  const [q, setQ] = useState("");
  const { data, isPending, isError, error } = useJudgments(q);

  return (
    <View className="flex-1">
      <View className="flex-row items-center gap-2 border-b border-rule bg-surface px-4 py-3">
        <Search size={18} color="#4b443a" />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search by citation, court or principle"
          placeholderTextColor="#a29a8c"
          className="flex-1 text-base text-ink"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      {isPending && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#9a7622" />
        </View>
      )}

      {isError && (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-sm text-danger">
            {error instanceof Error ? error.message : "Could not load the judgments."}
          </Text>
        </View>
      )}

      {data && (
        <FlatList
          data={data.items}
          keyExtractor={(item: JudgmentSummary) => String(item.id)}
          contentContainerClassName="gap-3 p-4"
          ListEmptyComponent={
            <View className="items-center gap-3 px-6 py-16">
              <Gavel size={28} color="#c9bfae" />
              <Text className="text-center text-base font-semibold text-ink">
                {q ? "Nothing matches that search" : "No judgments published yet"}
              </Text>
              <Text className="text-center text-sm leading-5 text-ink-soft">
                {q
                  ? `The library holds nothing matching “${q}”.`
                  : "Chambers across the platform contribute judgments, and each is checked against the law report before it appears here."}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View className="gap-1.5 rounded-card border border-rule bg-surface p-4">
              <Text className="text-base font-semibold leading-6 text-ink">{item.title}</Text>
              <Text className="text-sm font-medium text-gold">{item.citation}</Text>
              {item.court ? <Text className="text-sm text-ink-soft">{item.court}</Text> : null}
              {item.principle ? (
                <Text className="mt-1 text-sm leading-5 text-ink-soft">{item.principle}</Text>
              ) : null}
              <Text className="pt-1 text-xs text-ink-soft">
                Contributed by {item.firm.name}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
