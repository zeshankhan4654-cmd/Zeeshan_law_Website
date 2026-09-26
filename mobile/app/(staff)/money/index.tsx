import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useExpenses, useFeeLedger, useOfficialFees } from "@/lib/money";
import { formatDate, formatRupees } from "@/lib/portal";
import { can, useSession } from "@/lib/session";

type Ledger = "fees" | "official" | "expenses";

const TABS: { key: Ledger; label: string }[] = [
  { key: "fees", label: "Fees" },
  { key: "official", label: "Court fees" },
  { key: "expenses", label: "Expenses" },
];

export default function Money() {
  const [ledger, setLedger] = useState<Ledger>("fees");
  const router = useRouter();
  const session = useSession();
  const mayEdit = can(session.status === "signed-in" ? session.account : null, "money.edit");

  return (
    <View className="flex-1">
      <View className="flex-row gap-2 border-b border-rule bg-surface px-4 py-3">
        {TABS.map((t) => {
          const on = ledger === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setLedger(t.key)}
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

      {ledger === "fees" ? <Fees /> : ledger === "official" ? <Official /> : <Expenses />}

      {mayEdit ? (
        <Pressable
          onPress={() =>
            router.push(
              ledger === "expenses" ? "/money/new?kind=expense" : "/money/new?kind=official"
            )
          }
          accessibilityRole="button"
          accessibilityLabel="Add an entry"
          className="absolute bottom-5 right-5 size-14 items-center justify-center rounded-full bg-ink active:bg-ink-soft"
        >
          <Plus size={26} color="#ffffff" />
        </Pressable>
      ) : null}
    </View>
  );
}

function Loading() {
  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator color="#9a7622" />
    </View>
  );
}

function Empty({ children }: { children: string }) {
  return <Text className="px-6 py-16 text-center text-sm leading-6 text-ink-soft">{children}</Text>;
}

function Total({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <View className="flex-1 gap-0.5">
      <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-ink-soft">
        {label}
      </Text>
      <Text className={`text-lg font-semibold ${muted ? "text-ink-soft" : "text-ink"}`}>
        {formatRupees(value)}
      </Text>
    </View>
  );
}

function Row({
  title,
  subtitle,
  amount,
  date,
}: {
  title: string;
  subtitle?: string | null;
  amount: number;
  date: string;
}) {
  return (
    <View className="flex-row items-start gap-3 rounded-card border border-rule bg-surface p-4">
      <View className="flex-1 gap-0.5">
        <Text className="text-base font-semibold leading-6 text-ink">{title}</Text>
        {subtitle ? <Text className="text-xs leading-5 text-ink-soft">{subtitle}</Text> : null}
        <Text className="text-xs text-ink-soft">{formatDate(date)}</Text>
      </View>
      <Text className="text-base font-semibold text-ink">{formatRupees(amount)}</Text>
    </View>
  );
}

function Fees() {
  const { data, isPending } = useFeeLedger();
  if (isPending) return <Loading />;

  const outstanding = (data?.agreed ?? 0) - (data?.received ?? 0);

  return (
    <ScrollView contentContainerClassName="gap-3 p-4 pb-24">
      <View className="flex-row gap-3 rounded-card border border-rule bg-surface p-4">
        <Total label="Agreed" value={data?.agreed ?? 0} />
        <Total label="Received" value={data?.received ?? 0} />
        <Total label="Outstanding" value={outstanding} muted={outstanding === 0} />
      </View>
      <Text className="px-1 text-xs leading-5 text-ink-soft">
        A fee belongs to a matter, so it is recorded on the case file rather than here.
      </Text>

      {(data?.items ?? []).length === 0 ? (
        <Empty>Nothing recorded yet.</Empty>
      ) : (
        data?.items.map((f) => (
          <Row
            key={f.id}
            title={`${f.kind === "agreed" ? "Agreed" : "Received"} — ${f.clientName}`}
            subtitle={[f.caseTitle, f.note].filter(Boolean).join(" · ")}
            amount={f.amount}
            date={f.entryDate}
          />
        ))
      )}
    </ScrollView>
  );
}

function Official() {
  const { data, isPending } = useOfficialFees();
  if (isPending) return <Loading />;

  return (
    <ScrollView contentContainerClassName="gap-3 p-4 pb-24">
      <View className="flex-row gap-3 rounded-card border border-rule bg-surface p-4">
        <Total label="Paid to courts" value={data?.total ?? 0} />
      </View>
      <Text className="px-1 text-xs leading-5 text-ink-soft">
        Money paid to a court or registry — through the chamber, never to it. Kept apart from
        fees so it is never counted as what the chamber earned.
      </Text>

      {(data?.items ?? []).length === 0 ? (
        <Empty>Nothing recorded yet.</Empty>
      ) : (
        data?.items.map((f) => (
          <Row
            key={f.id}
            title={f.kind}
            subtitle={[f.caseTitle, f.note].filter(Boolean).join(" · ") || "Not against a matter"}
            amount={f.amount}
            date={f.entryDate}
          />
        ))
      )}
    </ScrollView>
  );
}

function Expenses() {
  const { data, isPending } = useExpenses();
  if (isPending) return <Loading />;

  return (
    <ScrollView contentContainerClassName="gap-3 p-4 pb-24">
      <View className="gap-3 rounded-card border border-rule bg-surface p-4">
        <Total label="The chamber's own costs" value={data?.total ?? 0} />
        {(data?.byCategory ?? []).length > 0 ? (
          <View className="gap-1 border-t border-rule pt-3">
            {data?.byCategory.slice(0, 5).map((c) => (
              <View key={c.category} className="flex-row justify-between">
                <Text className="text-sm text-ink-soft">{c.category}</Text>
                <Text className="text-sm font-semibold text-ink">{formatRupees(c.total)}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {(data?.items ?? []).length === 0 ? (
        <Empty>Nothing recorded yet.</Empty>
      ) : (
        data?.items.map((e) => (
          <Row
            key={e.id}
            title={e.category}
            subtitle={e.description}
            amount={e.amount}
            date={e.expenseDate}
          />
        ))
      )}
    </ScrollView>
  );
}
