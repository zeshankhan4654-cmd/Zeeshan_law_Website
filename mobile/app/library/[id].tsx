import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { ArticleBody } from "@/components/ArticleBody";
import { useResearchArticle } from "@/lib/library";

export default function ResearchDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, isError, error } = useResearchArticle(Number(id));

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center gap-3">
        <ActivityIndicator color="#9a7622" />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-sm text-danger">
          {error instanceof Error ? error.message : "Could not load that article."}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerClassName="px-5 py-6">
      {data.topic ? (
        <View className="mb-2 self-start rounded-full bg-gold-wash px-2.5 py-1">
          <Text className="text-[11px] font-semibold text-gold">{data.topic}</Text>
        </View>
      ) : null}

      <Text className="mb-3 text-2xl font-semibold leading-8 text-ink">{data.title}</Text>

      {data.summary ? (
        <Text className="mb-5 text-base leading-6 italic text-ink-soft">{data.summary}</Text>
      ) : null}

      <View className="mb-5 h-px bg-rule" />

      <ArticleBody body={data.body} />

      {data.tags ? (
        <View className="mt-4 flex-row flex-wrap gap-2">
          {data.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
            .map((tag) => (
              <View key={tag} className="rounded-full bg-gold-wash px-2.5 py-1">
                <Text className="text-[11px] text-gold">{tag}</Text>
              </View>
            ))}
        </View>
      ) : null}
    </ScrollView>
  );
}
