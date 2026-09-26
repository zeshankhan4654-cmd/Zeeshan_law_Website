import { useLocalSearchParams, useRouter } from "expo-router";
import { Search, UserCircle } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { DateChoice } from "@/components/DateChoice";
import { Field } from "@/components/Field";
import { ApiError } from "@/lib/api";
import { useClients, type ClientSummary } from "@/lib/clients";
import { useCreateCase, type CaseDraft } from "@/lib/office";

const STATUSES = ["Active", "Reserved", "Decided", "Withdrawn", "Dormant"];

/**
 * Opening a matter.
 *
 * Two steps in one screen, because a matter always belongs to somebody. Come
 * from a client and that step is already answered; come from the case list
 * and it is the first thing asked, since choosing a client from a picker
 * buried inside a long form is how a matter ends up filed under the wrong
 * name.
 */
export default function NewCase() {
  const params = useLocalSearchParams<{ clientId?: string; clientName?: string }>();
  const router = useRouter();
  const create = useCreateCase();

  const [client, setClient] = useState<{ id: number; name: string } | null>(
    params.clientId ? { id: Number(params.clientId), name: params.clientName ?? "" } : null
  );

  if (!client) return <ChooseClient onPick={setClient} />;

  return <CaseForm client={client} onChange={() => setClient(null)} create={create} router={router} />;
}

function ChooseClient({ onPick }: { onPick: (c: { id: number; name: string }) => void }) {
  const [q, setQ] = useState("");
  const { data, isPending } = useClients(q);

  return (
    <View className="flex-1">
      <View className="border-b border-rule bg-surface px-4 py-3">
        <Text className="pb-2 text-xs font-semibold uppercase tracking-[1.5px] text-gold">
          Whose matter is it?
        </Text>
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
          ListEmptyComponent={
            <Text className="px-6 py-16 text-center text-sm leading-6 text-ink-soft">
              {q ? `Nobody matches “${q}”.` : "No clients yet. Add the client first, from Clients."}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onPick({ id: item.id, name: item.name })}
              className="flex-row items-center gap-3 rounded-card border border-rule bg-surface p-4 active:bg-gold-wash"
            >
              <UserCircle size={20} color="#9a7622" />
              <View className="flex-1">
                <Text className="text-base font-semibold text-ink">{item.name}</Text>
                {item.phone ? <Text className="text-xs text-ink-soft">{item.phone}</Text> : null}
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function CaseForm({
  client,
  onChange,
  create,
  router,
}: {
  client: { id: number; name: string };
  onChange: () => void;
  create: ReturnType<typeof useCreateCase>;
  router: ReturnType<typeof useRouter>;
}) {
  const [draft, setDraft] = useState<CaseDraft>({
    title: "",
    court: "",
    caseType: "",
    status: "Active",
    nextHearing: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof CaseDraft>(k: K, v: CaseDraft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const ready = draft.title.trim().length >= 3 && !create.isPending;

  async function save() {
    setError(null);
    try {
      const made = await create.mutateAsync({
        ...draft,
        title: draft.title.trim(),
        clientId: client.id,
      });
      router.replace(`/files/${made.id}`);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Could not save. Check the connection and try again."
      );
    }
  }

  return (
    <ScrollView contentContainerClassName="gap-5 p-4 pb-10" keyboardShouldPersistTaps="handled">
      <Pressable
        onPress={onChange}
        className="flex-row items-center gap-3 rounded-card border border-rule bg-gold-wash p-4"
      >
        <UserCircle size={20} color="#9a7622" />
        <View className="flex-1">
          <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-gold">Client</Text>
          <Text className="text-base font-semibold text-ink">{client.name}</Text>
        </View>
        <Text className="text-xs font-semibold text-gold">Change</Text>
      </Pressable>

      <Field
        label="Title"
        value={draft.title}
        onChange={(v) => set("title", v)}
        placeholder="How the matter is known"
        autoCapitalize="sentences"
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
          First hearing
        </Text>
        <DateChoice value={draft.nextHearing} onChange={(v) => set("nextHearing", v)} />
        <Text className="text-xs leading-5 text-ink-soft">
          Leave it if nothing is listed yet. You can add the date the moment you have it.
        </Text>
      </View>

      <Field
        label="Chamber note"
        value={draft.notes}
        onChange={(v) => set("notes", v)}
        multiline
        hint="Internal. The client never sees this."
      />

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
        {create.isPending ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-base font-semibold text-white">Open the matter</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
