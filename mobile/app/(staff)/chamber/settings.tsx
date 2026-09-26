import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Field } from "@/components/Field";
import { ApiError } from "@/lib/api";
import { useSaveSettings, useSiteSettings } from "@/lib/chamber-admin";

/**
 * What the public website says about the chamber.
 *
 * Only the details that go wrong at inconvenient moments are here. A
 * telephone number that has changed, or an office that has moved, is
 * something a client discovers at the worst possible time, and it should be
 * fixable from wherever the advocate happens to be standing.
 *
 * Every one of these is empty until it is filled in, and the site hides
 * what is empty rather than inventing it. A wrong telephone number on a law
 * firm's website is worse than no telephone number: it sends a client in
 * distress to a stranger.
 */
const FIELDS: { key: string; label: string; hint?: string; keyboard?: "phone-pad" | "email-address" }[] = [
  { key: "contact.phone", label: "Telephone", keyboard: "phone-pad" },
  { key: "contact.phone2", label: "Second telephone", keyboard: "phone-pad" },
  { key: "contact.whatsapp", label: "WhatsApp", keyboard: "phone-pad" },
  { key: "contact.email", label: "Email", keyboard: "email-address" },
  { key: "firm.address", label: "Address" },
  { key: "firm.hours", label: "Hours", hint: "When somebody can actually reach the chamber." },
];

export default function SiteSettings() {
  const { data, isPending } = useSiteSettings();
  const save = useSaveSettings();
  const router = useRouter();

  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data && !draft) {
      setDraft(Object.fromEntries(FIELDS.map((f) => [f.key, data[f.key] ?? ""])));
    }
  }, [data, draft]);

  if (isPending || !draft) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#9a7622" />
      </View>
    );
  }

  const set = (k: string, v: string) => {
    setSaved(false);
    setDraft((d) => (d ? { ...d, [k]: v } : d));
  };

  async function submit() {
    if (!draft) return;
    setError(null);
    try {
      await save.mutateAsync(draft);
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save. Try again.");
    }
  }

  return (
    <ScrollView contentContainerClassName="gap-5 p-4 pb-10" keyboardShouldPersistTaps="handled">
      <Text className="px-1 text-xs leading-5 text-ink-soft">
        These appear on your public website. Anything left empty is hidden there rather than
        guessed at — a wrong number sends a client in distress to a stranger.
      </Text>

      {FIELDS.map((f) => (
        <Field
          key={f.key}
          label={f.label}
          value={draft[f.key] ?? ""}
          onChange={(v) => set(f.key, v)}
          hint={f.hint}
          keyboardType={f.keyboard}
          autoCapitalize={f.keyboard ? "none" : "sentences"}
          multiline={f.key === "firm.address"}
        />
      ))}

      {error ? (
        <View className="rounded-card border border-rule bg-gold-wash px-4 py-3">
          <Text className="text-sm leading-6 text-ink">{error}</Text>
        </View>
      ) : null}

      {saved ? (
        <View className="rounded-card border border-rule bg-gold-wash px-4 py-3">
          <Text className="text-sm leading-6 text-ink">
            Saved. Your website shows this from the next visit.
          </Text>
        </View>
      ) : null}

      <Pressable
        onPress={submit}
        disabled={save.isPending}
        className="items-center rounded-card bg-ink py-4 active:bg-ink-soft"
      >
        {save.isPending ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-base font-semibold text-white">Save</Text>
        )}
      </Pressable>

      <Text className="px-1 text-center text-xs leading-5 text-ink-soft">
        The rest of the site — the writing, the practice areas, the testimonials — is edited from
        the office on a computer.
      </Text>
    </ScrollView>
  );
}
