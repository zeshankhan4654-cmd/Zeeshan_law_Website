import { useRouter } from "expo-router";
import { Search, UserCircle, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { DateChoice, isoDay } from "@/components/DateChoice";
import { Field } from "@/components/Field";
import { ApiError } from "@/lib/api";
import { useClients, type ClientSummary } from "@/lib/clients";
import { METHOD_LABEL, useLogCommunication, type CommMethod } from "@/lib/contact";

const METHODS: CommMethod[] = ["call", "in_person", "whatsapp", "email", "letter"];

/**
 * Writing down what was said, while it is still accurate.
 *
 * The client is optional because a good deal of what a chamber is told
 * comes from somebody who is not yet anybody's client, and a note that
 * cannot be written until a record exists does not get written.
 */
export default function LogContact() {
  const router = useRouter();
  const log = useLogCommunication();

  const [method, setMethod] = useState<CommMethod>("call");
  const [summary, setSummary] = useState("");
  const [date, setDate] = useState(() => isoDay(new Date()));
  const [client, setClient] = useState<{ id: number; name: string } | null>(null);
  const [picking, setPicking] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const [error, setError] = useState<string | null>(null);

  const ready = summary.trim().length >= 2 && !log.isPending;

  async function save() {
    setError(null);
    try {
      await log.mutateAsync({
        clientId: client?.id ?? null,
        method,
        summary: summary.trim(),
        commDate: new Date(`${date}T00:00:00`).toISOString(),
        followUpDue: followUp ? new Date(`${followUp}T00:00:00`).toISOString() : null,
      });
      router.back();
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Could not save. Check the connection and try again."
      );
    }
  }

  if (picking) {
    return <PickClient onPick={(c) => { setClient(c); setPicking(false); }} onCancel={() => setPicking(false)} />;
  }

  return (
    <ScrollView contentContainerClassName="gap-5 p-4 pb-10" keyboardShouldPersistTaps="handled">
      <View className="gap-1.5">
        <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-soft">How</Text>
        <View className="flex-row flex-wrap gap-2">
          {METHODS.map((m) => {
            const on = method === m;
            return (
              <Pressable
                key={m}
                onPress={() => setMethod(m)}
                className={`rounded-card border px-3 py-2 ${
                  on ? "border-gold bg-gold-wash" : "border-rule bg-surface"
                }`}
              >
                <Text className={`text-sm ${on ? "font-semibold text-gold" : "text-ink-soft"}`}>
                  {METHOD_LABEL[m]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Field
        label="What was said"
        value={summary}
        onChange={setSummary}
        multiline
        autoCapitalize="sentences"
        hint="Enough that it still makes sense in a year."
      />

      <View className="gap-1.5">
        <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-soft">
          Who (optional)
        </Text>
        {client ? (
          <View className="flex-row items-center gap-3 rounded-card border border-rule bg-gold-wash p-4">
            <UserCircle size={20} color="#9a7622" />
            <Text className="flex-1 text-base font-semibold text-ink">{client.name}</Text>
            <Pressable onPress={() => setClient(null)} accessibilityLabel="Remove the client">
              <X size={18} color="#4b443a" />
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => setPicking(true)}
            className="items-center rounded-card border border-rule bg-surface py-3 active:bg-gold-wash"
          >
            <Text className="text-sm font-semibold text-ink-soft">Attach a client</Text>
          </Pressable>
        )}
        <Text className="text-xs leading-5 text-ink-soft">
          Leave it empty for somebody who is not a client yet.
        </Text>
      </View>

      <View className="gap-1.5">
        <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-soft">When</Text>
        <DateChoice value={date} onChange={setDate} />
      </View>

      <View className="gap-1.5">
        <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-soft">
          Follow up by (optional)
        </Text>
        {followUp ? (
          <Pressable onPress={() => setFollowUp("")} className="self-start py-1">
            <Text className="text-xs font-semibold text-gold">Clear the follow-up</Text>
          </Pressable>
        ) : null}
        <DateChoice value={followUp} onChange={setFollowUp} />
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
        {log.isPending ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-base font-semibold text-white">Save the note</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function PickClient({
  onPick,
  onCancel,
}: {
  onPick: (c: { id: number; name: string }) => void;
  onCancel: () => void;
}) {
  const [q, setQ] = useState("");
  const { data, isPending } = useClients(q);

  return (
    <View className="flex-1">
      <View className="border-b border-rule bg-surface px-4 py-3">
        <View className="flex-row items-center gap-2">
          <Search size={18} color="#4b443a" />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search your clients"
            placeholderTextColor="#a29a8c"
            className="flex-1 text-base text-ink"
            autoCorrect={false}
            autoCapitalize="none"
          />
          <Pressable onPress={onCancel} accessibilityLabel="Cancel">
            <X size={20} color="#4b443a" />
          </Pressable>
        </View>
      </View>

      {isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#9a7622" />
        </View>
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(c: ClientSummary) => String(c.id)}
          contentContainerClassName="gap-2 p-4"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onPick({ id: item.id, name: item.name })}
              className="flex-row items-center gap-3 rounded-card border border-rule bg-surface p-4 active:bg-gold-wash"
            >
              <UserCircle size={20} color="#9a7622" />
              <Text className="flex-1 text-base font-semibold text-ink">{item.name}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
