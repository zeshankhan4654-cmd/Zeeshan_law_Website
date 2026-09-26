import { useRouter } from "expo-router";
import { Plus, Search } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useClients, type ClientSummary } from "@/lib/clients";
import { can, useSession } from "@/lib/session";

export default function Clients() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const { data, isPending } = useClients(q);
  const session = useSession();
  const account = session.status === "signed-in" ? session.account : null;
  const mayAdd = can(account, "clients.edit");

  return (
    <View className="flex-1">
      <View className="flex-row items-center gap-2 border-b border-rule bg-surface px-4 py-3">
        <Search size={18} color="#4b443a" />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Name, telephone, or email"
          placeholderTextColor="#a29a8c"
          className="flex-1 text-base text-ink"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>

      {isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#9a7622" />
        </View>
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(c: ClientSummary) => String(c.id)}
          contentContainerClassName="gap-3 p-4"
          ListHeaderComponent={
            data && data.total > 0 ? (
              <Text className="pb-1 text-xs uppercase tracking-[1.5px] text-ink-soft">
                {data.total} client{data.total === 1 ? "" : "s"}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <Text className="px-6 py-16 text-center text-sm text-ink-soft">
              {q ? `Nobody matches “${q}”.` : "No clients yet."}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/clients/${item.id}`)}
              className="gap-1 rounded-card border border-rule bg-surface p-4 active:bg-gold-wash"
            >
              <View className="flex-row items-center gap-2">
                <Text className="flex-1 text-base font-semibold leading-6 text-ink">
                  {item.name}
                </Text>
                {item.portalEnabled ? (
                  <Text className="rounded-full bg-gold-wash px-2 py-0.5 text-[11px] font-semibold text-gold">
                    Has access
                  </Text>
                ) : null}
              </View>
              {item.phone ? <Text className="text-sm text-ink-soft">{item.phone}</Text> : null}
              <Text className="text-xs text-ink-soft">
                {item.caseCount} {item.caseCount === 1 ? "matter" : "matters"}
              </Text>
            </Pressable>
          )}
        />
      )}

      {mayAdd ? (
        <Pressable
          onPress={() => router.push("/clients/new")}
          accessibilityRole="button"
          accessibilityLabel="Add a client"
          className="absolute bottom-5 right-5 size-14 items-center justify-center rounded-full bg-ink active:bg-ink-soft"
        >
          <Plus size={26} color="#ffffff" />
        </Pressable>
      ) : null}
    </View>
  );
}
