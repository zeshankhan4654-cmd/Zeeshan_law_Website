import { ChevronDown, ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { DateChoice } from "@/components/DateChoice";
import { Field } from "@/components/Field";
import type { CaseDraft } from "@/lib/office";

/**
 * Everything a matter holds, in one place.
 *
 * Opening a matter and editing one ask for exactly the same things, and
 * keeping two copies of fourteen fields is how a field ends up on one form
 * and not the other — added when a matter is opened and then impossible to
 * correct, or the reverse.
 *
 * The order is the order an advocate would say them: what it is called,
 * what the court calls it, where it is heard, who is on each side, where it
 * has reached. The rest is real but not asked for every time, so it is
 * folded away rather than made to scroll past on a telephone. Folded, not
 * dropped: an advocate opening a criminal matter needs the FIR on the same
 * screen, one tap down.
 */

const STATUSES = ["Active", "Reserved", "Decided", "Withdrawn", "Dormant"];

export function CaseFields({
  draft,
  set,
  /** Open the fuller half straight away, which editing an existing matter wants. */
  detailsOpen = false,
}: {
  draft: CaseDraft;
  set: <K extends keyof CaseDraft>(k: K, v: CaseDraft[K]) => void;
  detailsOpen?: boolean;
}) {
  const [open, setOpen] = useState(detailsOpen);

  return (
    <>
      <Field
        label="Title"
        value={draft.title}
        onChange={(v) => set("title", v)}
        placeholder="Mst Nargas Bibi vs Muhammad Fahim"
        autoCapitalize="words"
        hint="The parties, as the matter is called in court."
      />
      <Field
        label="Case number"
        value={draft.caseNo}
        onChange={(v) => set("caseNo", v)}
        placeholder="Suit 214/2026"
        // Not "characters". A case number is a citation — "Cr.A. 412/2026",
        // "W.P. 1234/2026" — and forcing capitals rewrites it into
        // something the court did not write.
        autoCapitalize="sentences"
        hint="What the court knows it by, and what you are asked for at the counter."
      />
      <Field
        label="Court"
        value={draft.court}
        onChange={(v) => set("court", v)}
        placeholder="Peshawar High Court"
      />
      <Field
        label="Kind of matter"
        value={draft.caseType}
        onChange={(v) => set("caseType", v)}
        placeholder="Criminal appeal, civil suit, writ…"
      />
      <Field
        label="Our side"
        value={draft.ourSide}
        onChange={(v) => set("ourSide", v)}
        placeholder="Petitioner, respondent, complainant, accused"
      />
      <Field
        label="The other side"
        value={draft.opposingParty}
        onChange={(v) => set("opposingParty", v)}
        placeholder="The party opposite"
      />
      <Field
        label="Stage"
        value={draft.stage}
        onChange={(v) => set("stage", v)}
        placeholder="Framing of issues, evidence, arguments, reserved"
        autoCapitalize="sentences"
        hint="Where it has reached. Not the same question as the status below."
      />

      <View className="gap-1.5">
        <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-soft">
          Status
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {STATUSES.map((s) => {
            const on = draft.status === s;
            return (
              <Pressable
                key={s}
                onPress={() => set("status", s)}
                className={`rounded-card border px-3 py-2 ${
                  on ? "border-gold bg-gold-wash" : "border-rule bg-surface"
                }`}
              >
                <Text className={`text-sm ${on ? "font-semibold text-gold" : "text-ink-soft"}`}>
                  {s}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="gap-1.5">
        <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-soft">
          Next hearing
        </Text>
        <DateChoice value={draft.nextHearing} onChange={(v) => set("nextHearing", v)} />
        {draft.nextHearing ? (
          <Pressable onPress={() => set("nextHearing", "")} className="self-start py-1">
            <Text className="text-xs font-semibold text-gold">Clear the date</Text>
          </Pressable>
        ) : (
          <Text className="text-xs leading-5 text-ink-soft">
            Nothing listed. The matter stays off the cause list until a date is set.
          </Text>
        )}
      </View>

      <Pressable
        testID="case-more"
        onPress={() => setOpen((o) => !o)}
        className="flex-row items-center gap-2 rounded-card border border-rule bg-surface px-4 py-3 active:bg-gold-wash"
      >
        {open ? (
          <ChevronDown size={18} color="#9a7622" />
        ) : (
          <ChevronRight size={18} color="#9a7622" />
        )}
        <Text className="flex-1 text-sm font-semibold text-ink">
          {open ? "Fewer details" : "Sections, FIR, judge, and who is carrying it"}
        </Text>
      </Pressable>

      {open && (
        <>
          <Field
            label="Sections"
            value={draft.sections}
            onChange={(v) => set("sections", v)}
            placeholder="Section 5, Family Courts Act 1964"
            autoCapitalize="sentences"
            hint="The provisions the matter turns on."
          />
          <Field
            label="FIR"
            value={draft.firDetails}
            onChange={(v) => set("firDetails", v)}
            placeholder="FIR 214/2026, Police Station Gulbahar, 4 May 2026"
            autoCapitalize="sentences"
            hint="For a criminal matter: the number, the police station and the date."
          />
          <Field
            label="Judge"
            value={draft.judge}
            onChange={(v) => set("judge", v)}
            placeholder="The judge or the bench it is before"
          />
          <Field
            label="Carried by"
            value={draft.assignedTo}
            onChange={(v) => set("assignedTo", v)}
            placeholder="Who in the chamber is doing it"
          />

          <View className="gap-1.5">
            <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-soft">
              Filed on
            </Text>
            <DateChoice value={draft.filedOn} onChange={(v) => set("filedOn", v)} />
          </View>
        </>
      )}

      <Field
        label="Note"
        value={draft.notes}
        onChange={(v) => set("notes", v)}
        placeholder="For the chamber only"
        autoCapitalize="sentences"
        multiline
        hint="Never shown to the client."
      />
    </>
  );
}
