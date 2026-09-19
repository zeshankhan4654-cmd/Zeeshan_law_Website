import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Banknote,
  CalendarDays,
  FileText,
  Gavel,
  MessageSquare,
  NotebookPen,
} from "lucide-react-native";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { formatDate, formatRupees, relativeDay, useCase } from "@/lib/portal";

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2">
        {icon}
        <Text className="text-xs font-semibold uppercase tracking-[2px] text-gold">{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <View className="rounded-card border border-rule bg-surface px-4 py-4">
      <Text className="text-sm text-ink-soft">{text}</Text>
    </View>
  );
}

/** KB below a megabyte, MB above — a client does not want six digits. */
function fileSize(bytes: number): string {
  if (bytes <= 0) return "";
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CaseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const caseId = Number(id);
  const { data, isPending, isError, error } = useCase(caseId);

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#9a7622" />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-sm text-danger">
          {error instanceof Error ? error.message : "Could not load this case."}
        </Text>
      </View>
    );
  }

  const when = relativeDay(data.nextHearing);

  return (
    <ScrollView contentContainerClassName="gap-6 p-4 pb-10">
      <View className="gap-2 rounded-card border border-rule bg-surface p-4">
        <Text className="text-lg font-semibold leading-7 text-ink">{data.title}</Text>
        {data.court ? <Text className="text-sm text-ink-soft">{data.court}</Text> : null}
        <View className="flex-row flex-wrap gap-2 pt-1">
          <View className="rounded-full bg-gold-wash px-2.5 py-0.5">
            <Text className="text-[11px] font-semibold text-gold">{data.status}</Text>
          </View>
          {data.caseType ? (
            <View className="rounded-full bg-gold-wash px-2.5 py-0.5">
              <Text className="text-[11px] font-semibold text-gold">{data.caseType}</Text>
            </View>
          ) : null}
        </View>
        {data.nextHearing && (
          <View className="mt-1 flex-row items-center gap-2 rounded-card bg-gold-wash px-3 py-2.5">
            <CalendarDays size={16} color="#9a7622" />
            <Text className="flex-1 text-sm font-semibold text-ink">
              Next hearing {formatDate(data.nextHearing)}
              {when ? <Text className="font-normal text-ink-soft"> · {when}</Text> : null}
            </Text>
          </View>
        )}
      </View>

      <Pressable
        onPress={() => router.push(`/cases/${caseId}/messages`)}
        className="flex-row items-center gap-3 rounded-card border border-rule bg-surface px-4 py-4 active:bg-gold-wash"
      >
        <View className="size-10 items-center justify-center rounded-card bg-gold-wash">
          <MessageSquare size={20} color="#9a7622" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-ink">Ask the office</Text>
          <Text className="text-sm text-ink-soft">
            Send a question, or speak it if that is easier
          </Text>
        </View>
      </Pressable>

      <Section icon={<NotebookPen size={15} color="#9a7622" />} title="What has happened">
        {data.updates.length === 0 ? (
          <Empty text="No progress has been posted on this matter yet." />
        ) : (
          data.updates.map((u) => (
            <View key={u.id} className="gap-1 rounded-card border border-rule bg-surface p-4">
              <Text className="text-xs font-semibold text-gold">{formatDate(u.updateDate)}</Text>
              <Text className="text-sm leading-6 text-ink">{u.message}</Text>
              {u.author ? <Text className="text-xs text-ink-soft">— {u.author}</Text> : null}
            </View>
          ))
        )}
      </Section>

      <Section icon={<Gavel size={15} color="#9a7622" />} title="Hearings">
        {data.hearings.length === 0 ? (
          <Empty text="No hearings have been recorded yet." />
        ) : (
          data.hearings.map((h) => (
            <View
              key={h.id}
              className="flex-row items-center gap-3 rounded-card border border-rule bg-surface px-4 py-3"
            >
              <Text className="w-24 text-sm font-semibold text-ink">
                {formatDate(h.hearingDate)}
              </Text>
              <Text className="flex-1 text-sm text-ink-soft">{h.purpose || "Hearing"}</Text>
            </View>
          ))
        )}
      </Section>

      <Section icon={<FileText size={15} color="#9a7622" />} title="Documents shared with you">
        {data.documents.length === 0 ? (
          <Empty text="The office has not shared any documents on this matter." />
        ) : (
          data.documents.map((d) => (
            <View key={d.id} className="gap-0.5 rounded-card border border-rule bg-surface p-4">
              <Text className="text-sm font-semibold text-ink">{d.title}</Text>
              <Text className="text-xs text-ink-soft">
                {[d.origName, fileSize(d.sizeBytes), formatDate(d.createdAt)]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </View>
          ))
        )}
      </Section>

      {data.fees.shown && (
        <Section icon={<Banknote size={15} color="#9a7622" />} title="Fees">
          <View className="gap-3 rounded-card border border-rule bg-surface p-4">
            <View className="flex-row justify-between">
              <Text className="text-sm text-ink-soft">Agreed</Text>
              <Text className="text-sm font-semibold text-ink">
                {formatRupees(data.fees.agreed)}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-ink-soft">Received</Text>
              <Text className="text-sm font-semibold text-ink">
                {formatRupees(data.fees.received)}
              </Text>
            </View>
            <View className="flex-row justify-between border-t border-rule pt-3">
              <Text className="text-sm font-semibold text-ink">Outstanding</Text>
              <Text className="text-sm font-semibold text-ink">
                {formatRupees(data.fees.agreed - data.fees.received)}
              </Text>
            </View>
          </View>
        </Section>
      )}
    </ScrollView>
  );
}
