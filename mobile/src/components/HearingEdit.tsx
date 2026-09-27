import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { DateChoice } from "@/components/DateChoice";
import { Field } from "@/components/Field";
import type { OfficeHearing } from "@/lib/office";

/**
 * Correcting a hearing, where the hearing is.
 *
 * A hearing gets written up in two minutes outside a courtroom, and two
 * minutes is not always enough. The order sheet is copied out properly that
 * evening; a purpose is mistyped; a date is misheard and the client has to
 * be told again. A record that cannot be corrected is one that stops being
 * written at all, so this asks for the same four things the corridor form
 * does and sends only what changed.
 *
 * Kept on the case file rather than behind its own screen, because the
 * thing being corrected is in front of you and a correction that costs a
 * journey is a correction nobody makes.
 */
export function HearingEdit({
  hearing,
  busy,
  onSave,
  onCancel,
  onDelete,
}: {
  hearing: OfficeHearing;
  busy: boolean;
  onSave: (changes: Record<string, string>) => Promise<void>;
  onCancel: () => void;
  onDelete: () => Promise<void>;
}) {
  const [purpose, setPurpose] = useState(hearing.purpose);
  const [orderSheet, setOrderSheet] = useState(hearing.orderSheet);
  const [outcome, setOutcome] = useState(hearing.outcome);
  const [attendedBy, setAttendedBy] = useState(hearing.attendedBy);
  const [nextDate, setNextDate] = useState(hearing.nextDate ? hearing.nextDate.slice(0, 10) : "");
  const [confirming, setConfirming] = useState(false);

  /** Only what actually changed, so an untouched field cannot overwrite. */
  function changes(): Record<string, string> {
    const out: Record<string, string> = {};
    if (purpose !== hearing.purpose) out.purpose = purpose;
    if (orderSheet !== hearing.orderSheet) out.orderSheet = orderSheet;
    if (outcome !== hearing.outcome) out.outcome = outcome;
    if (attendedBy !== hearing.attendedBy) out.attendedBy = attendedBy;
    const was = hearing.nextDate ? hearing.nextDate.slice(0, 10) : "";
    if (nextDate !== was) out.nextDate = nextDate;
    return out;
  }

  const touched = Object.keys(changes()).length > 0;

  return (
    <View className="gap-4 rounded-card border border-gold bg-gold-wash p-3.5">
      <Field label="Listed for" value={purpose} onChange={setPurpose} autoCapitalize="sentences" />
      <Field
        label="Order sheet"
        value={orderSheet}
        onChange={setOrderSheet}
        placeholder="What the court wrote, as it reads"
        autoCapitalize="sentences"
        multiline
      />
      <Field
        label="What happened"
        value={outcome}
        onChange={setOutcome}
        placeholder="The chamber's note of it"
        autoCapitalize="sentences"
        multiline
      />
      <Field label="Who appeared" value={attendedBy} onChange={setAttendedBy} />

      <View className="gap-1.5">
        <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-soft">
          Date given from the bench
        </Text>
        <DateChoice value={nextDate} onChange={setNextDate} />
        {nextDate ? (
          <Pressable onPress={() => setNextDate("")} className="self-start py-1">
            <Text className="text-xs font-semibold text-gold">Clear it</Text>
          </Pressable>
        ) : null}
        <Text className="text-xs leading-5 text-ink-soft">
          A date still ahead moves the matter&rsquo;s next hearing. One already past does not — the
          cause list is never sent backwards.
        </Text>
      </View>

      <View className="flex-row gap-2">
        <Pressable
          onPress={onCancel}
          className="flex-1 items-center rounded-card border border-rule bg-surface py-2.5"
        >
          <Text className="text-sm font-semibold text-ink-soft">Leave it</Text>
        </Pressable>
        <Pressable
          onPress={() => void onSave(changes())}
          disabled={!touched || busy}
          className={`flex-1 items-center rounded-card py-2.5 ${
            touched && !busy ? "bg-ink active:bg-ink-soft" : "bg-ink/40"
          }`}
        >
          {busy ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-sm font-semibold text-white">Save the correction</Text>
          )}
        </Pressable>
      </View>

      {/* Two taps, because a hearing removed is a hearing an advocate can
          no longer prove took place. */}
      {confirming ? (
        <View className="gap-2 rounded-card border border-danger bg-danger-wash p-3">
          <Text className="text-xs leading-5 text-ink">
            Remove this hearing from the file? What was written on it goes with it.
          </Text>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => setConfirming(false)}
              className="flex-1 items-center rounded-card border border-rule bg-surface py-2"
            >
              <Text className="text-sm font-semibold text-ink-soft">Keep it</Text>
            </Pressable>
            <Pressable
              onPress={() => void onDelete()}
              className="flex-1 items-center rounded-card bg-danger py-2"
            >
              <Text className="text-sm font-semibold text-white">Remove it</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setConfirming(true)} hitSlop={6} className="self-start">
          <Text className="text-xs font-semibold text-danger">Remove this hearing</Text>
        </Pressable>
      )}
    </View>
  );
}
