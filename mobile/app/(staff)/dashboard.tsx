import { useRouter } from "expo-router";
import {
  AlertTriangle,
  Briefcase,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  Phone,
  Plus,
  Square,
} from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  periodDates,
  useAddTask,
  useDashboard,
  useSetTaskDone,
  type DashboardFollowUp,
  type DashboardHearing,
  type DiaryTask,
  type PeriodKey,
} from "@/lib/diary";

/**
 * The day, as an advocate opens it.
 *
 * Four numbers and two lists: what is listed, what has to be done, what is
 * already late, and how many matters are live. The period is the whole
 * control — today, tomorrow, the week, the month — because every other
 * question on this screen is the same question asked over different dates.
 */

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
];

function Count({
  value,
  label,
  tone,
  icon: Icon,
}: {
  value: number;
  label: string;
  tone: "plain" | "gold" | "danger" | "success";
  icon: typeof CalendarDays;
}) {
  const border = {
    plain: "border-l-ink-soft",
    gold: "border-l-gold",
    danger: "border-l-danger",
    success: "border-l-success",
  }[tone];
  const colour = { plain: "#4b443a", gold: "#9a7622", danger: "#8e2f1f", success: "#2e6042" }[tone];

  return (
    <View className={`min-w-[46%] flex-1 gap-1 rounded-card border border-rule border-l-4 bg-surface p-3.5 ${border}`}>
      <View className="flex-row items-start justify-between">
        <Text className="text-2xl font-semibold text-ink">{value}</Text>
        <Icon size={17} color={colour} />
      </View>
      <Text className="text-[11px] uppercase leading-4 tracking-wider text-ink-soft">{label}</Text>
    </View>
  );
}

function Listed({ hearing, onPress }: { hearing: DashboardHearing; onPress: () => void }) {
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

      <View className="flex-row flex-wrap items-center gap-x-2">
        {hearing.caseNo ? (
          <Text className="text-xs font-semibold text-gold">{hearing.caseNo}</Text>
        ) : null}
        {hearing.court ? <Text className="text-sm text-ink-soft">{hearing.court}</Text> : null}
      </View>

      {hearing.purpose ? <Text className="text-sm text-ink">{hearing.purpose}</Text> : null}
      {hearing.stage ? <Text className="text-xs text-ink-soft">{hearing.stage}</Text> : null}

      <View className="flex-row items-center gap-3 pt-1">
        <Text className="text-xs text-ink-soft">{hearing.clientName}</Text>
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

function Task({ task, onToggle }: { task: DiaryTask; onToggle: () => void }) {
  const late = !task.done && task.taskDate < periodDates("today").from;

  return (
    <Pressable
      onPress={onToggle}
      className="flex-row items-start gap-3 rounded-card border border-rule bg-surface p-3.5 active:bg-gold-wash"
    >
      {task.done ? (
        <CheckCircle2 size={20} color="#2e6042" />
      ) : (
        <Circle size={20} color={late ? "#8e2f1f" : "#a29a8c"} />
      )}

      <View className="flex-1 gap-1">
        <Text
          className={`text-sm font-semibold leading-5 ${
            task.done ? "text-ink-soft line-through" : "text-ink"
          }`}
        >
          {task.title}
        </Text>

        {task.notes ? <Text className="text-xs leading-5 text-ink-soft">{task.notes}</Text> : null}

        <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
          {late && (
            <Text className="text-[11px] font-semibold uppercase tracking-wide text-danger">
              Overdue
            </Text>
          )}
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
      </View>
    </Pressable>
  );
}

function FollowUp({ item }: { item: DashboardFollowUp }) {
  return (
    <View className="flex-row items-start gap-3 rounded-card border border-rule bg-gold-wash p-3.5">
      <Phone size={18} color="#9a7622" />
      <View className="flex-1 gap-1">
        <Text className="text-sm font-semibold leading-5 text-ink">
          {item.subject || "Follow up"}
        </Text>
        <Text className="text-xs leading-5 text-ink-soft" numberOfLines={2}>
          {item.summary}
        </Text>
        <Text className="text-xs text-ink-soft">
          {item.client?.name || item.personName || "the chamber"}
        </Text>
      </View>
    </View>
  );
}

/**
 * Writing a task down where it will be read.
 *
 * Kept on the day itself rather than behind a button, because the moment a
 * task occurs to an advocate is the moment they are looking at their day,
 * and a form one tap away is a form that gets used.
 */
function QuickAdd({ date }: { date: string }) {
  const add = useAddTask();
  const [title, setTitle] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const text = title.trim();
    if (text.length < 2) return;
    setError(null);
    try {
      await add.mutateAsync({
        title: text,
        taskDate: date,
        priority: urgent ? "Urgent" : "Normal",
        notes: "",
        caseId: null,
        clientId: null,
      });
      setTitle("");
      setUrgent(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add that.");
    }
  }

  return (
    <View className="gap-2.5 rounded-card border border-rule bg-surface p-4">
      <Text className="text-[11px] uppercase tracking-wider text-gold">Add to the diary</Text>

      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="What needs to be done?"
        placeholderTextColor="#a29a8c"
        className="rounded-card border border-rule px-3 py-2.5 text-base text-ink"
        onSubmitEditing={() => void submit()}
        returnKeyType="done"
      />

      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={() => setUrgent((u) => !u)}
          hitSlop={6}
          className="flex-row items-center gap-2 py-1"
        >
          {urgent ? <Check size={18} color="#8e2f1f" /> : <Square size={18} color="#a29a8c" />}
          <Text className={`text-sm ${urgent ? "font-semibold text-danger" : "text-ink-soft"}`}>
            Urgent
          </Text>
        </Pressable>

        <View className="flex-1" />

        <Pressable
          onPress={() => void submit()}
          disabled={title.trim().length < 2 || add.isPending}
          className={`flex-row items-center gap-1.5 rounded-card px-4 py-2.5 ${
            title.trim().length < 2 || add.isPending ? "bg-rule" : "bg-ink active:bg-ink-soft"
          }`}
        >
          <Plus size={16} color={title.trim().length < 2 ? "#4b443a" : "#ffffff"} />
          <Text
            className={`text-sm font-semibold ${
              title.trim().length < 2 ? "text-ink-soft" : "text-white"
            }`}
          >
            {add.isPending ? "Adding…" : "Add"}
          </Text>
        </Pressable>
      </View>

      {error ? <Text className="text-xs text-danger">{error}</Text> : null}
    </View>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [period, setPeriod] = useState<PeriodKey>("today");
  const { from, to } = periodDates(period);
  const { data, isPending, isError, error, refetch, isRefetching } = useDashboard(from, to);
  const setDone = useSetTaskDone();

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center gap-3">
        <ActivityIndicator color="#9a7622" />
        <Text className="text-sm text-ink-soft">Opening your day…</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center gap-3 px-8">
        <Text className="text-center text-sm text-danger">
          {error instanceof Error ? error.message : "Could not open the day."}
        </Text>
        <Pressable onPress={() => void refetch()} className="rounded-card bg-ink px-4 py-2.5">
          <Text className="text-sm font-semibold text-white">Try again</Text>
        </Pressable>
      </View>
    );
  }

  const nothing =
    data.hearings.length === 0 && data.tasks.length === 0 && data.followUps.length === 0;

  return (
    <ScrollView
      contentContainerClassName="gap-5 p-4 pb-10"
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor="#9a7622" />
      }
    >
      {/* The period. Everything below answers for whatever is chosen here. */}
      <View className="flex-row flex-wrap gap-2">
        {PERIODS.map((p) => {
          const on = p.key === period;
          return (
            <Pressable
              key={p.key}
              testID={`period-${p.key}`}
              onPress={() => setPeriod(p.key)}
              className={`rounded-card border px-3.5 py-2 ${
                on ? "border-ink bg-ink" : "border-rule bg-surface active:bg-gold-wash"
              }`}
            >
              <Text className={`text-sm font-semibold ${on ? "text-white" : "text-ink-soft"}`}>
                {p.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="flex-row flex-wrap gap-3">
        <Count value={data.counts.hearings} label="Hearings" tone="success" icon={CalendarDays} />
        <Count value={data.counts.tasks} label="To be done" tone="gold" icon={Circle} />
        <Count value={data.counts.overdue} label="Overdue" tone="danger" icon={AlertTriangle} />
        <Count value={data.counts.activeCases} label="Active cases" tone="plain" icon={Briefcase} />
      </View>

      <QuickAdd date={from} />

      {nothing && (
        <Text className="px-4 py-6 text-center text-sm leading-5 text-ink-soft">
          Nothing listed and nothing outstanding for this period.
        </Text>
      )}

      {data.tasks.length > 0 && (
        <View className="gap-2.5">
          <Text className="px-1 text-[11px] uppercase tracking-wider text-gold">
            To be done — tap to tick off
          </Text>
          {data.tasks.map((t) => (
            <Task
              key={t.id}
              task={t}
              onToggle={() => void setDone.mutateAsync({ id: t.id, done: !t.done })}
            />
          ))}
        </View>
      )}

      {data.followUps.length > 0 && (
        <View className="gap-2.5">
          <Text className="px-1 text-[11px] uppercase tracking-wider text-gold">
            Follow up
          </Text>
          {data.followUps.map((f) => (
            <FollowUp key={f.id} item={f} />
          ))}
        </View>
      )}

      {data.hearings.length > 0 && (
        <View className="gap-2.5">
          <View className="flex-row items-center justify-between px-1">
            <Text className="text-[11px] uppercase tracking-wider text-gold">Listed</Text>
            <Pressable onPress={() => router.navigate("/diary")} hitSlop={8}>
              <Text className="text-xs font-semibold text-gold">The full cause list →</Text>
            </Pressable>
          </View>
          {data.hearings.map((h) => (
            <Listed key={h.id} hearing={h} onPress={() => router.navigate(`/files/${h.caseId}`)} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
