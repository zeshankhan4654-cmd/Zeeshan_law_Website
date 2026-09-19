import { useRouter } from "expo-router";
import { CalendarDays, CheckCircle2, Phone, User } from "lucide-react-native";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { dayHeading, useDiary, useUnanswered, type DiaryHearing } from "@/lib/office";

/**
 * What the phone is actually for: standing in a corridor at half past
 * eight, wanting to know what is listed, where, and whose it is.
 */
function Listed({ hearing, onPress }: { hearing: DiaryHearing; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="gap-1.5 rounded-card border border-rule bg-surface p-4 active:bg-gold-wash"
    >
      <View className="flex-row items-start justify-between gap-3">
        <Text className="flex-1 text-base font-semibold leading-6 text-ink">
          {hearing.caseTitle}
        </Text>
        {hearing.recorded && <CheckCircle2 size={17} color="#2e6042" />}
      </View>

      {hearing.court ? <Text className="text-sm text-ink-soft">{hearing.court}</Text> : null}
      {hearing.purpose ? (
        <Text className="text-sm text-ink">{hearing.purpose}</Text>
      ) : null}

      <View className="flex-row items-center gap-3 pt-1">
        <View className="flex-row items-center gap-1.5">
          <User size={14} color="#4b443a" />
          <Text className="text-xs text-ink-soft">{hearing.clientName}</Text>
        </View>
        {hearing.clientPhone ? (
          <Pressable
            onPress={() => void Linking.openURL(`tel:${hearing.clientPhone}`)}
            hitSlop={8}
            className="flex-row items-center gap-1.5"
          >
            <Phone size={14} color="#9a7622" />
            <Text className="text-xs font-semibold text-gold">{hearing.clientPhone}</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function Diary() {
  const router = useRouter();
  const { data, isPending, isError, error, refetch, isRefetching } = useDiary(14);
  const { data: unanswered } = useUnanswered();

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center gap-3">
        <ActivityIndicator color="#9a7622" />
        <Text className="text-sm text-ink-soft">Loading the cause list…</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center gap-3 px-8">
        <Text className="text-center text-sm text-danger">
          {error instanceof Error ? error.message : "Could not load the diary."}
        </Text>
        <Pressable onPress={() => void refetch()} className="rounded-card bg-ink px-4 py-2.5">
          <Text className="text-sm font-semibold text-white">Try again</Text>
        </Pressable>
      </View>
    );
  }

  const waiting = unanswered?.items.length ?? 0;

  return (
    <ScrollView
      contentContainerClassName="gap-5 p-4 pb-10"
      refreshControl={
        // A cause list is checked again the moment it might have changed.
        <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor="#9a7622" />
      }
    >
      {waiting > 0 && (
        <Pressable
          onPress={() => router.push(`/files/${unanswered!.items[0]!.caseId}`)}
          className="flex-row items-center gap-3 rounded-card bg-gold-wash px-4 py-3.5 active:opacity-80"
        >
          <Text className="flex-1 text-sm font-semibold text-gold">
            {waiting} client question{waiting === 1 ? "" : "s"} waiting for an answer
          </Text>
        </Pressable>
      )}

      {data.days.length === 0 && (
        <View className="items-center gap-3 px-8 py-16">
          <CalendarDays size={28} color="#c9bfae" />
          <Text className="text-center text-sm leading-5 text-ink-soft">
            Nothing is listed in the next fortnight.
          </Text>
        </View>
      )}

      {data.days.map((day) => (
        <View key={day.date} className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-[2px] text-gold">
            {dayHeading(day.date)} · {day.hearings.length} matter
            {day.hearings.length === 1 ? "" : "s"}
          </Text>
          {day.hearings.map((h) => (
            <Listed key={h.id} hearing={h} onPress={() => router.push(`/files/${h.caseId}`)} />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
