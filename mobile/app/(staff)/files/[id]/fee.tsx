import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { DateChoice, isoDay } from "@/components/DateChoice";
import { Field } from "@/components/Field";
import { ApiError } from "@/lib/api";
import { useAddFee } from "@/lib/money";

/**
 * A fee against one matter.
 *
 * Two kinds, and the difference matters: what was agreed is what the client
 * owes, what was received is what has actually come in. A chamber that
 * records only one of them cannot say what is outstanding.
 */
export default function RecordFee() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const caseId = Number(id);
  const router = useRouter();
  const add = useAddFee(caseId);

  const [kind, setKind] = useState<"agreed" | "received">("received");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => isoDay(new Date()));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const rupees = Number(amount.replace(/[^0-9.]/g, ""));
  const ready = rupees > 0 && !add.isPending;

  async function save() {
    setError(null);
    try {
      await add.mutateAsync({
        kind,
        amount: rupees,
        entryDate: new Date(`${date}T00:00:00`).toISOString(),
        note: note.trim(),
      });
      router.back();
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Could not save. Check the connection and try again."
      );
    }
  }

  return (
    <ScrollView contentContainerClassName="gap-5 p-4 pb-10" keyboardShouldPersistTaps="handled">
      <View className="flex-row gap-2">
        {(["agreed", "received"] as const).map((k) => {
          const on = kind === k;
          return (
            <Pressable
              key={k}
              onPress={() => setKind(k)}
              className={`flex-1 items-center rounded-card border py-3 ${
                on ? "border-gold bg-gold-wash" : "border-rule bg-surface"
              }`}
            >
              <Text className={`text-base ${on ? "font-semibold text-gold" : "text-ink-soft"}`}>
                {k === "agreed" ? "Agreed" : "Received"}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text className="-mt-3 px-1 text-xs leading-5 text-ink-soft">
        {kind === "agreed"
          ? "What the client has undertaken to pay."
          : "What has actually come in."}
      </Text>

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

      <Field label="Note" value={note} onChange={setNote} autoCapitalize="sentences" />

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
        {add.isPending ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-base font-semibold text-white">Record it</Text>
        )}
      </Pressable>

      <Text className="px-1 text-center text-xs leading-5 text-ink-soft">
        Whether the client sees fees at all is set per client, from their own screen.
      </Text>
    </ScrollView>
  );
}
