import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { DateChoice } from "@/components/DateChoice";
import { Field } from "@/components/Field";
import { ApiError } from "@/lib/api";
import { useAddHearing } from "@/lib/office";

/**
 * Listing the next date, from the corridor outside court.
 *
 * The one thing an advocate does between leaving a courtroom and reaching
 * the car, so it asks for two things and nothing else.
 */
export default function AddHearing() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const caseId = Number(id);
  const router = useRouter();
  const add = useAddHearing(caseId);

  const [date, setDate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [setAsNext, setSetAsNext] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ready = date !== "" && !add.isPending;

  async function save() {
    setError(null);
    try {
      await add.mutateAsync({
        hearingDate: new Date(`${date}T00:00:00`).toISOString(),
        purpose: purpose.trim(),
        setAsNext,
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
      <View className="gap-1.5">
        <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-soft">
          Date
        </Text>
        <DateChoice value={date} onChange={setDate} />
      </View>

      <Field
        label="Listed for"
        value={purpose}
        onChange={setPurpose}
        placeholder="Arguments, evidence, framing of issues…"
        autoCapitalize="sentences"
      />

      <View className="flex-row items-center gap-3 rounded-card border border-rule bg-surface p-4">
        <Switch
          value={setAsNext}
          onValueChange={setSetAsNext}
          trackColor={{ true: "#9a7622", false: "#d8d2c8" }}
          thumbColor="#ffffff"
        />
        <View className="flex-1">
          <Text className="text-sm font-semibold text-ink">Put it on the cause list</Text>
          <Text className="text-xs leading-5 text-ink-soft">
            Switch off to record a date that has already passed without moving the matter&rsquo;s
            next hearing.
          </Text>
        </View>
      </View>

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
          <Text className="text-base font-semibold text-white">Add the hearing</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
