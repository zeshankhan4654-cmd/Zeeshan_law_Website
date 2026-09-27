import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react-native";
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { DateChoice } from "@/components/DateChoice";
import { Field } from "@/components/Field";
import { ApiError } from "@/lib/api";
import { useAddHearing } from "@/lib/office";

/**
 * Listing the next date, from the corridor outside court.
 *
 * The one thing an advocate does between leaving a courtroom and reaching
 * the car, so it asks for two things and nothing else — and everything
 * else is folded away rather than added beneath them. A screen that grew
 * from two fields to seven would stop being usable in the minute it has.
 *
 * Folded away, not left out: writing the matter up on the spot, while the
 * order sheet is still in hand, is worth far more than writing it up from
 * memory that evening. Both are the same record, so both are the same
 * screen.
 */
export default function AddHearing() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const caseId = Number(id);
  const router = useRouter();
  const add = useAddHearing(caseId);

  const [date, setDate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [setAsNext, setSetAsNext] = useState(true);
  const [writeUp, setWriteUp] = useState(false);
  const [attendedBy, setAttendedBy] = useState("");
  const [orderSheet, setOrderSheet] = useState("");
  const [outcome, setOutcome] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const ready = date !== "" && !add.isPending;

  async function save() {
    setError(null);
    try {
      await add.mutateAsync({
        hearingDate: new Date(`${date}T00:00:00`).toISOString(),
        purpose: purpose.trim(),
        outcome: outcome.trim(),
        orderSheet: orderSheet.trim(),
        attendedBy: attendedBy.trim(),
        nextDate: nextDate ? new Date(`${nextDate}T00:00:00`).toISOString() : null,
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

      {/* Only asked while no date has been given from the bench. Once one
          has, it is the answer, and a switch offering to use something else
          would be offering to be wrong. */}
      {nextDate === "" && (
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
              Switch off to record a date that has already passed without moving the
              matter&rsquo;s next hearing.
            </Text>
          </View>
        </View>
      )}

      <Pressable
        testID="hearing-writeup"
        onPress={() => setWriteUp((w) => !w)}
        className="flex-row items-center gap-2 rounded-card border border-rule bg-surface px-4 py-3 active:bg-gold-wash"
      >
        {writeUp ? (
          <ChevronDown size={18} color="#9a7622" />
        ) : (
          <ChevronRight size={18} color="#9a7622" />
        )}
        <Text className="flex-1 text-sm font-semibold text-ink">
          {writeUp ? "Just the date" : "Write it up — order sheet, who appeared, next date"}
        </Text>
      </Pressable>

      {writeUp && (
        <>
          <Field
            label="Who appeared"
            value={attendedBy}
            onChange={setAttendedBy}
            placeholder="Left empty, it is taken as you"
          />
          <Field
            label="Order sheet"
            value={orderSheet}
            onChange={setOrderSheet}
            placeholder="What the court wrote, as it reads"
            autoCapitalize="sentences"
            multiline
            hint="The court's own words. Never shown to the client."
          />
          <Field
            label="What happened"
            value={outcome}
            onChange={setOutcome}
            placeholder="The chamber's note of it"
            autoCapitalize="sentences"
            multiline
            hint="Your reading of it, kept apart from the court's words. Also never shown to the client."
          />

          <View className="gap-1.5">
            <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-soft">
              Date given from the bench
            </Text>
            <DateChoice value={nextDate} onChange={setNextDate} />
            {nextDate ? (
              <Pressable onPress={() => setNextDate("")} className="self-start py-1">
                <Text className="text-xs font-semibold text-gold">Clear it</Text>
              </Pressable>
            ) : (
              <Text className="text-xs leading-5 text-ink-soft">
                Putting it here moves the matter&rsquo;s next hearing, so the cause list is right
                before you reach the car.
              </Text>
            )}
          </View>
        </>
      )}

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
