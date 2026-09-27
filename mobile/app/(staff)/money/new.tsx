import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { DateChoice, isoDay } from "@/components/DateChoice";
import { Field } from "@/components/Field";
import { ApiError } from "@/lib/api";
import { useAddExpense, useAddOfficialFee } from "@/lib/money";

/** What chambers here actually pay out on, offered so it need not be typed. */
const EXPENSE_KINDS = ["Office rent", "Staff salary", "Stationery", "Travel", "Utilities", "Books"];
const COURT_KINDS = ["Court fee", "Process fee", "Copying fee", "Registry charge", "Stamp"];

export default function NewMoneyEntry() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  const isExpense = kind === "expense";
  const router = useRouter();

  const addExpense = useAddExpense();
  const addOfficial = useAddOfficialFee();
  const pending = addExpense.isPending || addOfficial.isPending;

  const [what, setWhat] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => isoDay(new Date()));
  const [note, setNote] = useState("");
  const [receiptNo, setReceiptNo] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [mode, setMode] = useState("");
  /** Court fees only: whether the chamber laid it out or the client paid it. */
  const [paidBy, setPaidBy] = useState("office");
  const [error, setError] = useState<string | null>(null);

  // Digits only. A rupee figure typed with commas is a string the server
  // rejects, and the refusal arrives long after the thought has moved on.
  const rupees = Number(amount.replace(/[^0-9.]/g, ""));
  const ready = what.trim().length >= 2 && rupees > 0 && date !== "" && !pending;

  async function save() {
    setError(null);
    try {
      if (isExpense) {
        await addExpense.mutateAsync({
          category: what.trim(),
          amount: rupees,
          expenseDate: new Date(`${date}T00:00:00`).toISOString(),
          description: note.trim(),
          paidTo: paidTo.trim(),
          mode: mode.trim(),
          caseId: null,
        });
      } else {
        await addOfficial.mutateAsync({
          caseId: null,
          kind: what.trim(),
          description: "",
          amount: rupees,
          entryDate: new Date(`${date}T00:00:00`).toISOString(),
          receiptNo: receiptNo.trim(),
          paidBy,
          note: note.trim(),
        });
      }
      router.back();
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Could not save. Check the connection and try again."
      );
    }
  }

  const suggestions = isExpense ? EXPENSE_KINDS : COURT_KINDS;

  return (
    <ScrollView contentContainerClassName="gap-5 p-4 pb-10" keyboardShouldPersistTaps="handled">
      <Field
        label={isExpense ? "What it was for" : "What was paid"}
        value={what}
        onChange={setWhat}
        autoCapitalize="sentences"
      />

      <View className="flex-row flex-wrap gap-2">
        {suggestions.map((s) => (
          <Pressable
            key={s}
            onPress={() => setWhat(s)}
            className={`rounded-card border px-3 py-2 ${
              what === s ? "border-gold bg-gold-wash" : "border-rule bg-surface"
            }`}
          >
            <Text className={`text-sm ${what === s ? "font-semibold text-gold" : "text-ink-soft"}`}>
              {s}
            </Text>
          </Pressable>
        ))}
      </View>

      <Field
        label="Amount in rupees"
        value={amount}
        onChange={setAmount}
        keyboardType="numeric"
        autoCapitalize="none"
        placeholder="0"
      />

      <View className="gap-1.5">
        <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-soft">Date</Text>
        <DateChoice value={date} onChange={setDate} />
      </View>

      {/* Court fees only. A court fee the chamber laid out is money owed
          back and belongs on the client's statement; one the client paid at
          the counter is neither. Which it was has to be recorded when it is
          spent, because nobody remembers in March. */}
      {!isExpense && (
        <View className="gap-1.5">
          <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-soft">
            Who paid it
          </Text>
          <View className="flex-row gap-2">
            {[
              { key: "office", label: "The chamber" },
              { key: "client", label: "The client" },
            ].map((o) => {
              const on = paidBy === o.key;
              return (
                <Pressable
                  key={o.key}
                  onPress={() => setPaidBy(o.key)}
                  className={`flex-1 items-center rounded-card border px-3 py-2.5 ${
                    on ? "border-gold bg-gold-wash" : "border-rule bg-surface"
                  }`}
                >
                  <Text className={`text-sm ${on ? "font-semibold text-gold" : "text-ink-soft"}`}>
                    {o.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text className="text-xs leading-5 text-ink-soft">
            What the chamber laid out is counted as still out of pocket until it is marked
            recovered.
          </Text>
        </View>
      )}

      {!isExpense && (
        <Field
          label="Receipt number"
          value={receiptNo}
          onChange={setReceiptNo}
          placeholder="R-8841"
          autoCapitalize="characters"
          hint="What the counter gave you. It is the answer when a client says they have already paid."
        />
      )}

      {isExpense && (
        <>
          <Field
            label="Paid to"
            value={paidTo}
            onChange={setPaidTo}
            placeholder="The stationer, the clerk, the courier"
          />
          <Field
            label="How"
            value={mode}
            onChange={setMode}
            placeholder="Cash, bank, easypaisa"
            autoCapitalize="sentences"
          />
        </>
      )}

      <Field label="Note" value={note} onChange={setNote} multiline autoCapitalize="sentences" />

      {error ? (
        <View className="rounded-card border border-rule bg-gold-wash px-4 py-3">
          <Text className="text-sm leading-6 text-ink">{error}</Text>
        </View>
      ) : null}

      <Pressable
        onPress={save}
        disabled={!ready}
        className={`items-center rounded-card py-4 ${ready ? "bg-ink active:bg-ink-soft" : "bg-ink/40"}`}
      >
        {pending ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-base font-semibold text-white">
            {isExpense ? "Record the expense" : "Record the payment"}
          </Text>
        )}
      </Pressable>

      {!isExpense ? (
        <Text className="px-1 text-center text-xs leading-5 text-ink-soft">
          Money paid to a court, not earned by the chamber. To attach it to a matter, record it
          from that case file.
        </Text>
      ) : null}
    </ScrollView>
  );
}
