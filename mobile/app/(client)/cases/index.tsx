import { useRouter } from "expo-router";
import { CalendarDays, FileText, FolderOpen, MessageSquare } from "lucide-react-native";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { formatDate, relativeDay, useCases, type CaseSummary } from "@/lib/portal";

/** Active matters read differently from closed ones at a glance. */
function statusStyle(status: string): string {
  const s = status.toLowerCase();
  if (s === "active") return "bg-success-wash text-success";
  if (s === "closed" || s === "decided") return "bg-rule text-ink-soft";
  return "bg-gold-wash text-gold";
}

export default function CasesList() {
  const router = useRouter();
  const { data, isPending, isError, error, refetch, isRefetching } = useCases();

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center gap-3">
        <ActivityIndicator color="#9a7622" />
        <Text className="text-sm text-ink-soft">Loading your matters…</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center gap-3 px-8">
        <Text className="text-center text-sm text-danger">
          {error instanceof Error ? error.message : "Could not load your cases."}
        </Text>
        <Pressable onPress={() => void refetch()} className="rounded-card bg-ink px-4 py-2.5">
          <Text className="text-sm font-semibold text-white">Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={data.items}
      keyExtractor={(c: CaseSummary) => String(c.id)}
      contentContainerClassName="gap-3 p-4"
      onRefresh={() => void refetch()}
      refreshing={isRefetching}
      ListEmptyComponent={
        <View className="items-center gap-3 py-16 px-8">
          <FolderOpen size={28} color="#c9bfae" />
          <Text className="text-center text-sm leading-5 text-ink-soft">
            There is nothing on your file yet. When the chamber opens a matter
            for you it will appear here.
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const when = relativeDay(item.nextHearing);
        return (
          <Pressable
            onPress={() => router.push(`/cases/${item.id}`)}
            className="gap-2 rounded-card border border-rule bg-surface p-4 active:bg-gold-wash"
          >
            <View className="flex-row items-start justify-between gap-3">
              <Text className="flex-1 text-base font-semibold leading-6 text-ink">
                {item.title}
              </Text>
              <View className={`rounded-full px-2.5 py-0.5 ${statusStyle(item.status).split(" ")[0]}`}>
                <Text className={`text-[11px] font-semibold ${statusStyle(item.status).split(" ")[1]}`}>
                  {item.status}
                </Text>
              </View>
            </View>

            {item.court ? <Text className="text-sm text-ink-soft">{item.court}</Text> : null}

            {item.nextHearing && (
              <View className="flex-row items-center gap-2">
                <CalendarDays size={15} color="#9a7622" />
                <Text className="text-sm text-ink">
                  Next hearing {formatDate(item.nextHearing)}
                  {when ? <Text className="text-ink-soft"> · {when}</Text> : null}
                </Text>
              </View>
            )}

            <View className="flex-row gap-4 pt-0.5">
              <View className="flex-row items-center gap-1.5">
                <FileText size={14} color="#4b443a" />
                <Text className="text-xs text-ink-soft">
                  {item.documentCount} document{item.documentCount === 1 ? "" : "s"}
                </Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <MessageSquare size={14} color="#4b443a" />
                <Text className="text-xs text-ink-soft">
                  {item.messageCount} message{item.messageCount === 1 ? "" : "s"}
                </Text>
              </View>
            </View>
          </Pressable>
        );
      }}
    />
  );
}
