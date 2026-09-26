import { useRouter } from "expo-router";
import { Mail, MessageSquare, Phone, Plus, User } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import {
  METHOD_LABEL,
  useCommunications,
  useEnquiries,
  useMarkEnquiry,
  type Enquiry,
} from "@/lib/contact";
import { formatDate } from "@/lib/portal";
import { can, useSession } from "@/lib/session";

export default function Contact() {
  const [tab, setTab] = useState<"log" | "enquiries">("log");
  const router = useRouter();
  const session = useSession();
  const account = session.status === "signed-in" ? session.account : null;
  const { data: enquiries } = useEnquiries();
  const mayLog = can(account, "comms.edit");

  return (
    <View className="flex-1">
      <View className="flex-row gap-2 border-b border-rule bg-surface px-4 py-3">
        {(["log", "enquiries"] as const).map((k) => {
          const on = tab === k;
          const unread = k === "enquiries" ? (enquiries?.unread ?? 0) : 0;
          return (
            <Pressable
              key={k}
              onPress={() => setTab(k)}
              className={`flex-1 flex-row items-center justify-center gap-2 rounded-card border py-2 ${
                on ? "border-gold bg-gold-wash" : "border-rule"
              }`}
            >
              <Text className={`text-sm ${on ? "font-semibold text-gold" : "text-ink-soft"}`}>
                {k === "log" ? "The log" : "From the website"}
              </Text>
              {unread > 0 ? (
                <View className="rounded-full bg-gold px-1.5">
                  <Text className="text-[11px] font-semibold text-white">{unread}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {tab === "log" ? <Log /> : <Enquiries />}

      {tab === "log" && mayLog ? (
        <Pressable
          onPress={() => router.push("/contact/new")}
          accessibilityRole="button"
          accessibilityLabel="Log a contact"
          className="absolute bottom-5 right-5 size-14 items-center justify-center rounded-full bg-ink active:bg-ink-soft"
        >
          <Plus size={26} color="#ffffff" />
        </Pressable>
      ) : null}
    </View>
  );
}

function Loading() {
  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator color="#9a7622" />
    </View>
  );
}

function Log() {
  const { data, isPending } = useCommunications();
  if (isPending) return <Loading />;

  return (
    <ScrollView contentContainerClassName="gap-3 p-4 pb-24">
      {(data?.due ?? 0) > 0 ? (
        <View className="rounded-card bg-gold-wash px-4 py-3">
          <Text className="text-sm font-semibold text-ink">
            {data?.due} {data?.due === 1 ? "follow-up is" : "follow-ups are"} due
          </Text>
        </View>
      ) : null}

      {(data?.items ?? []).length === 0 ? (
        <Text className="px-6 py-16 text-center text-sm leading-6 text-ink-soft">
          Nothing logged yet. A note of what was said, and when, is what settles a dispute about
          what the chamber advised.
        </Text>
      ) : (
        data?.items.map((c) => {
          const overdue =
            c.followUpDue !== null && new Date(c.followUpDue) <= new Date();
          return (
            <View key={c.id} className="gap-2 rounded-card border border-rule bg-surface p-4">
              <View className="flex-row items-center gap-2">
                <Text className="rounded-full bg-gold-wash px-2 py-0.5 text-[11px] font-semibold text-gold">
                  {METHOD_LABEL[c.method] ?? c.method}
                </Text>
                <Text className="flex-1 text-xs text-ink-soft">{formatDate(c.commDate)}</Text>
              </View>
              {c.client ? (
                <View className="flex-row items-center gap-2">
                  <User size={14} color="#9a7622" />
                  <Text className="text-sm font-semibold text-ink">{c.client.name}</Text>
                </View>
              ) : null}
              <Text className="text-sm leading-6 text-ink">{c.summary}</Text>
              {c.followUpDue ? (
                <Text
                  className={`text-xs font-semibold ${overdue ? "text-danger" : "text-ink-soft"}`}
                >
                  Follow up by {formatDate(c.followUpDue)}
                </Text>
              ) : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function Enquiries() {
  const { data, isPending } = useEnquiries();
  if (isPending) return <Loading />;

  return (
    <ScrollView contentContainerClassName="gap-3 p-4 pb-24">
      <Text className="px-1 text-xs leading-5 text-ink-soft">
        Sent by strangers through the form on your website. They are not clients and see nothing
        of the chamber.
      </Text>

      {(data?.items ?? []).length === 0 ? (
        <Text className="px-6 py-16 text-center text-sm text-ink-soft">Nothing has come in.</Text>
      ) : (
        data?.items.map((e) => <EnquiryCard key={e.id} enquiry={e} />)
      )}
    </ScrollView>
  );
}

function EnquiryCard({ enquiry }: { enquiry: Enquiry }) {
  const mark = useMarkEnquiry(enquiry.id);

  return (
    <View
      className={`gap-2 rounded-card border p-4 ${
        enquiry.read ? "border-rule bg-surface" : "border-gold bg-gold-wash"
      }`}
    >
      <View className="flex-row items-center gap-2">
        <Text className="flex-1 text-base font-semibold text-ink">{enquiry.name}</Text>
        <Text className="text-xs text-ink-soft">{formatDate(enquiry.createdAt)}</Text>
      </View>

      {enquiry.subject ? (
        <Text className="text-sm font-semibold text-ink">{enquiry.subject}</Text>
      ) : null}
      <Text className="text-sm leading-6 text-ink">{enquiry.message}</Text>

      {/* Shown as selectable text rather than as a link: a tap that silently
          does nothing is worse than a number the reader can copy. */}
      <View className="gap-1 border-t border-rule pt-2">
        {enquiry.phone ? (
          <View className="flex-row items-center gap-2">
            <Phone size={14} color="#9a7622" />
            <Text selectable className="text-sm text-ink">
              {enquiry.phone}
            </Text>
          </View>
        ) : null}
        {enquiry.email ? (
          <View className="flex-row items-center gap-2">
            <Mail size={14} color="#9a7622" />
            <Text selectable className="text-sm text-ink">
              {enquiry.email}
            </Text>
          </View>
        ) : null}
        {!enquiry.phone && !enquiry.email ? (
          <View className="flex-row items-center gap-2">
            <MessageSquare size={14} color="#9a7622" />
            <Text className="text-xs text-ink-soft">
              They left no way of being reached.
            </Text>
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={() => mark.mutate(!enquiry.read)}
        disabled={mark.isPending}
        className="items-center rounded-card border border-rule py-2 active:bg-surface"
      >
        <Text className="text-sm font-semibold text-ink-soft">
          {enquiry.read ? "Mark unread" : "Mark as dealt with"}
        </Text>
      </Pressable>
    </View>
  );
}
