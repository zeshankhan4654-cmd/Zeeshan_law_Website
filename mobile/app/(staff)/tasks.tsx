import { useLocalSearchParams, useRouter } from "expo-router";
import { CheckCircle2, Circle, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useDeleteTask, useSetTaskDone, useTasks, type DiaryTask } from "@/lib/diary";
import { formatDate } from "@/lib/portal";

/**
 * Everything in the diary, not only what falls in the day being looked at.
 *
 * The day screen answers "what is there today"; this answers "what is still
 * not done", which is a different question and the one an overdue count
 * raises. Without it that count is a number telling an advocate something
 * has been missed and giving no way to find out what.
 */

const TABS = [
  { key: "overdue", label: "Overdue" },
  { key: "open", label: "To be done" },
  { key: "done", label: "Done" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function Tasks() {
  const params = useLocalSearchParams<{ state?: string }>();
  const [tab, setTab] = useState<TabKey>(
    params.state === "overdue" || params.state === "done" ? params.state : "open"
  );

  // Overdue is the open list read more narrowly, so it is one request, not two.
  const { data, isLoading, isError } = useTasks(tab === "done" ? "done" : "open");

  const items =
    tab === "overdue" ? (data?.items ?? []).filter((t) => t.taskDate < today()) : (data?.items ?? []);

  return (
    <View className="flex-1">
      <View className="flex-row gap-2 border-b border-rule bg-surface px-4 py-3">
        {TABS.map((t) => {
          const on = t.key === tab;
          const badge = t.key === "overdue" ? (data?.overdue ?? 0) : 0;
          return (
            <Pressable
              key={t.key}
              testID={`tasks-${t.key}`}
              onPress={() => setTab(t.key)}
              className={`flex-1 flex-row items-center justify-center gap-2 rounded-card border py-2 ${
                on ? "border-gold bg-gold-wash" : "border-rule"
              }`}
            >
              <Text className={`text-sm ${on ? "font-semibold text-gold" : "text-ink-soft"}`}>
                {t.label}
              </Text>
              {badge > 0 ? (
                <View className="rounded-full bg-danger px-1.5">
                  <Text className="text-[11px] font-semibold text-white">{badge}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <ActivityIndicator className="mt-10" color="#9a7622" />
      ) : isError ? (
        <Text className="p-6 text-center text-sm leading-5 text-danger">
          The diary could not be opened. Pull down on the day to try again.
        </Text>
      ) : items.length === 0 ? (
        <Text className="p-6 text-center text-sm leading-5 text-ink-soft">
          {tab === "overdue"
            ? "Nothing is overdue."
            : tab === "done"
              ? "Nothing has been ticked off yet."
              : "Nothing is outstanding."}
        </Text>
      ) : (
        <ScrollView contentContainerClassName="gap-3 p-4 pb-10">
          {items.map((task) => (
            <Row key={task.id} task={task} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function Row({ task }: { task: DiaryTask }) {
  const router = useRouter();
  const setDone = useSetTaskDone();
  const remove = useDeleteTask();
  const late = !task.done && task.taskDate < today();

  return (
    <View className="flex-row items-start gap-3 rounded-card border border-rule bg-surface p-3.5">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={task.done ? "Put it back" : "Tick it off"}
        onPress={() => setDone.mutate({ id: task.id, done: !task.done })}
        className="pt-0.5"
      >
        {task.done ? (
          <CheckCircle2 size={20} color="#2e6042" />
        ) : (
          <Circle size={20} color={late ? "#8e2f1f" : "#a29a8c"} />
        )}
      </Pressable>

      <Pressable
        className="flex-1 gap-1"
        onPress={() => task.case && router.push(`/files/${task.case.id}`)}
      >
        <Text
          className={`text-sm font-semibold leading-5 ${
            task.done ? "text-ink-soft line-through" : "text-ink"
          }`}
        >
          {task.title}
        </Text>

        {task.notes ? <Text className="text-xs leading-5 text-ink-soft">{task.notes}</Text> : null}

        <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
          <Text className={`text-xs ${late ? "font-semibold text-danger" : "text-ink-soft"}`}>
            {formatDate(task.taskDate)}
          </Text>
          {task.priority && task.priority !== "Normal" ? (
            <Text className="text-[11px] font-semibold uppercase tracking-wide text-gold">
              {task.priority}
            </Text>
          ) : null}
          {task.case ? (
            <Text className="text-xs text-ink-soft">{task.case.title}</Text>
          ) : task.client ? (
            <Text className="text-xs text-ink-soft">{task.client.name}</Text>
          ) : null}
        </View>
      </Pressable>

      {/* Asked first. A diary entry removed by a misplaced thumb is gone. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Remove it from the diary"
        onPress={() =>
          Alert.alert("Remove this?", task.title, [
            { text: "Keep it", style: "cancel" },
            { text: "Remove", style: "destructive", onPress: () => remove.mutate(task.id) },
          ])
        }
        className="pt-0.5"
      >
        <Trash2 size={17} color="#a29a8c" />
      </Pressable>
    </View>
  );
}
