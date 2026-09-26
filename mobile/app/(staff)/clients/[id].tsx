import { useLocalSearchParams, useRouter } from "expo-router";
import { FolderOpen, KeyRound, Mail, MapPin, Phone } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Share, Text, View } from "react-native";
import { useClient, useSetPortalAccess, type PortalResult } from "@/lib/clients";
import { formatDate } from "@/lib/portal";
import { can, useSession } from "@/lib/session";

/**
 * One client: how to reach them, what the chamber is doing for them, and
 * whether they can see any of it themselves.
 */
export default function ClientFileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const clientId = Number(id);
  const router = useRouter();
  const { data: client, isPending } = useClient(clientId);
  const portal = useSetPortalAccess(clientId);
  const session = useSession();
  const account = session.status === "signed-in" ? session.account : null;
  const mayIssue = can(account, "clients.portal");

  /** Shown once, never fetched again — the server keeps only its hash. */
  const [issued, setIssued] = useState<PortalResult | null>(null);

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#9a7622" />
      </View>
    );
  }

  if (!client) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-sm text-ink-soft">This client is no longer here.</Text>
      </View>
    );
  }

  async function grant(resetPassword: boolean) {
    const result = await portal.mutateAsync({
      enabled: true,
      showFees: client?.portalShowFees ?? false,
      resetPassword,
    });
    setIssued(result);
  }

  return (
    <ScrollView contentContainerClassName="gap-5 p-4 pb-10">
      <View className="gap-1">
        <Text className="text-xl font-semibold leading-7 text-ink">{client.name}</Text>
        <Text className="text-xs text-ink-soft">
          With the chamber since {formatDate(client.createdAt)}
        </Text>
      </View>

      <View className="gap-2 rounded-card border border-rule bg-surface p-4">
        {client.phone ? <Line icon={<Phone size={16} color="#9a7622" />} text={client.phone} /> : null}
        {client.email ? <Line icon={<Mail size={16} color="#9a7622" />} text={client.email} /> : null}
        {client.address ? (
          <Line icon={<MapPin size={16} color="#9a7622" />} text={client.address} />
        ) : null}
        {!client.phone && !client.email && !client.address ? (
          <Text className="text-sm text-ink-soft">
            No contact details recorded. Add them from the office on a computer.
          </Text>
        ) : null}
      </View>

      {client.notes ? (
        <View className="gap-1.5 rounded-card border border-rule bg-surface p-4">
          <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-soft">
            Chamber note
          </Text>
          <Text className="text-sm leading-6 text-ink">{client.notes}</Text>
          <Text className="text-xs text-ink-soft">The client never sees this.</Text>
        </View>
      ) : null}

      <View className="gap-2">
        <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-gold">
          {client.cases.length} {client.cases.length === 1 ? "matter" : "matters"}
        </Text>
        {client.cases.length === 0 ? (
          <Text className="px-1 text-sm text-ink-soft">Nothing opened for them yet.</Text>
        ) : (
          client.cases.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => router.push(`/files/${c.id}`)}
              className="flex-row items-center gap-3 rounded-card border border-rule bg-surface p-4 active:bg-gold-wash"
            >
              <FolderOpen size={18} color="#9a7622" />
              <View className="flex-1 gap-0.5">
                <Text className="text-base font-semibold leading-6 text-ink">{c.title}</Text>
                <Text className="text-xs text-ink-soft">
                  {[c.court, c.status, c.nextHearing ? formatDate(c.nextHearing) : null]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </View>

      {/* Access to their own matters — issued by the chamber, never asked
          for. This is the whole of what a client can ever see. */}
      <View className="gap-3 rounded-card border border-rule bg-surface p-4">
        <View className="flex-row items-center gap-2">
          <KeyRound size={16} color="#9a7622" />
          <Text className="text-sm font-semibold text-ink">Their own access</Text>
        </View>

        {issued ? (
          <View className="gap-2 rounded-card bg-gold-wash p-3">
            <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-gold">
              Read this to them once
            </Text>
            <Detail label="Username" value={issued.username ?? ""} />
            {issued.password ? (
              <Detail label="Password" value={issued.password} />
            ) : (
              <Text className="text-sm leading-6 text-ink">
                Their existing password still works — nothing new to pass on.
              </Text>
            )}
            <Text className="text-xs leading-5 text-ink-soft">
              Shown once. The chamber keeps no copy, so if it is lost, issue a new one.
            </Text>
            {issued.password ? (
              <Pressable
                onPress={() =>
                  void Share.share({
                    message: `Lawyer360 — your case file\nUsername: ${issued.username}\nPassword: ${issued.password}`,
                  })
                }
                className="items-center rounded-card border border-gold py-2.5"
              >
                <Text className="text-sm font-semibold text-gold">Send it to them</Text>
              </Pressable>
            ) : null}
          </View>
        ) : client.portalEnabled ? (
          <Text className="text-sm leading-6 text-ink-soft">
            Signs in as <Text className="font-semibold text-ink">{client.portalUsername}</Text>.
            They see their own matters and nothing else
            {client.portalShowFees ? ", fees included" : ", fees kept back"}.
          </Text>
        ) : (
          <Text className="text-sm leading-6 text-ink-soft">
            They cannot see anything yet. Giving access shows them their own matters — progress,
            next hearing, and the documents you have marked for them.
          </Text>
        )}

        {mayIssue ? (
          <Pressable
            onPress={() => void grant(client.portalEnabled)}
            disabled={portal.isPending}
            className="items-center rounded-card bg-ink py-3 active:bg-ink-soft"
          >
            {portal.isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-base font-semibold text-white">
                {client.portalEnabled ? "Issue a new password" : "Give them access"}
              </Text>
            )}
          </Pressable>
        ) : (
          <Text className="text-xs leading-5 text-ink-soft">
            Issuing access is not among your permissions.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

function Line({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View className="flex-row items-start gap-2.5">
      {icon}
      <Text className="flex-1 text-sm leading-6 text-ink">{text}</Text>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-baseline gap-2">
      <Text className="w-20 text-xs text-ink-soft">{label}</Text>
      <Text selectable className="flex-1 text-base font-semibold text-ink">
        {value}
      </Text>
    </View>
  );
}
