import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Banknote,
  FileText,
  Gavel,
  Lock,
  MessageSquare,
  NotebookPen,
  Phone,
  Send,
  User,
} from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  useOfficeCase,
  usePostUpdate,
  useDeleteHearing,
  useEditHearing,
  useReplyToClient,
} from "@/lib/office";
import { HearingEdit } from "@/components/HearingEdit";
import { statementUrl, useStatementLink, whatsappUrl } from "@/lib/money";
import { formatDate, formatRupees } from "@/lib/portal";
import { can, useSession } from "@/lib/session";

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
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

/** A one-line composer used for an update, a reply, and a hearing outcome. */
function Composer({
  placeholder,
  onSubmit,
  busy,
}: {
  placeholder: string;
  onSubmit: (text: string) => Promise<void>;
  busy: boolean;
}) {
  const [text, setText] = useState("");
  const ready = !busy && text.trim().length > 0;

  return (
    <View className="flex-row items-end gap-2">
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor="#a29a8c"
        multiline
        className="max-h-28 flex-1 rounded-card border border-rule bg-surface px-3 py-2.5 text-sm text-ink"
      />
      <Pressable
        onPress={() => {
          if (!ready) return;
          const value = text.trim();
          setText("");
          void onSubmit(value);
        }}
        disabled={!ready}
        className={`size-10 items-center justify-center rounded-card ${
          ready ? "bg-ink active:bg-ink-soft" : "bg-rule"
        }`}
      >
        {busy ? (
          <ActivityIndicator color="#4b443a" size="small" />
        ) : (
          <Send size={16} color={ready ? "#ffffff" : "#4b443a"} />
        )}
      </Pressable>
    </View>
  );
}

export default function OfficeCaseFile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const caseId = Number(id);
  const session = useSession();
  const account = session.status === "signed-in" ? session.account : null;
  const router = useRouter();
  const mayEdit = can(account, "cases.edit");
  const mayList = can(account, "hearings.edit");

  const { data, isPending, isError, error } = useOfficeCase(caseId);
  const postUpdate = usePostUpdate(caseId);
  const reply = useReplyToClient(caseId);

  const [openHearing, setOpenHearing] = useState<number | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [statementProblem, setStatementProblem] = useState<string | null>(null);
  const statement = useStatementLink();
  const editHearing = useEditHearing(caseId);
  const deleteHearing = useDeleteHearing(caseId);

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
          {error instanceof Error ? error.message : "Could not open this file."}
        </Text>
      </View>
    );
  }

  /** Every write goes through here, so one refusal is reported one way. */
  const run = async (action: Promise<unknown>) => {
    setProblem(null);
    try {
      await action;
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "That did not save.");
    }
  };

  /**
   * The reminder is composed here and handed to WhatsApp unsent. An advocate
   * reads it, and changes it, before it reaches a client — software that
   * demands money on a chamber's behalf without the chamber seeing the words
   * is how a chamber loses a client it still had.
   */
  const outstanding = data.fees.shown ? data.fees.agreed - data.fees.received : 0;
  const reminder =
    data.fees.shown && outstanding > 0 && data.client.phone
      ? whatsappUrl(
          data.client.phone,
          `Assalam-o-Alaikum ${data.client.name}. Regarding ${
            data.caseNo ? `${data.caseNo}, ` : ""
          }${data.title}: ${formatRupees(outstanding)} is outstanding on the chamber's record. ` +
            `Please telephone the office if this does not agree with yours.`
        )
      : null;

  async function openStatement() {
    setStatementProblem(null);
    try {
      const { path } = await statement.mutateAsync({ scope: "case", id: caseId });
      await Linking.openURL(statementUrl(path));
    } catch (e) {
      setStatementProblem(
        e instanceof Error ? e.message : "Could not draw the statement."
      );
    }
  }

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerClassName="gap-6 p-4 pb-12">
        <View className="gap-2 rounded-card border border-rule bg-surface p-4">
          {/* The number first, because it is what the matter is called at
              the counter and in the cause list, and an advocate checking
              they have the right file looks for it before the title. */}
          {/* Not uppercased, though every other label on this screen is.
              A case number is a citation: "Suit 512/2026" is how it is
              written on the file and how the court writes it back, and
              shouting it in capitals changes what the advocate typed. */}
          {data.caseNo ? (
            <Text className="text-xs font-semibold tracking-[1.5px] text-gold">{data.caseNo}</Text>
          ) : null}
          <Text className="text-lg font-semibold leading-7 text-ink">{data.title}</Text>
          {data.court ? <Text className="text-sm text-ink-soft">{data.court}</Text> : null}
          {data.judge ? <Text className="text-sm text-ink-soft">{data.judge}</Text> : null}

          <View className="flex-row flex-wrap gap-2 pt-1">
            <View className="rounded-full bg-gold-wash px-2.5 py-0.5">
              <Text className="text-[11px] font-semibold text-gold">{data.status}</Text>
            </View>
            {data.stage ? (
              <View className="rounded-full bg-gold-wash px-2.5 py-0.5">
                <Text className="text-[11px] font-semibold text-gold">{data.stage}</Text>
              </View>
            ) : null}
            {data.caseType ? (
              <View className="rounded-full bg-gold-wash px-2.5 py-0.5">
                <Text className="text-[11px] font-semibold text-gold">{data.caseType}</Text>
              </View>
            ) : null}
          </View>

          {data.ourSide || data.opposingParty ? (
            <Text className="pt-1 text-sm leading-6 text-ink-soft">
              {data.ourSide ? (
                <Text>
                  We are <Text className="font-semibold text-ink">{data.ourSide}</Text>
                </Text>
              ) : null}
              {data.ourSide && data.opposingParty ? " · " : null}
              {data.opposingParty ? (
                <Text>
                  Against <Text className="font-semibold text-ink">{data.opposingParty}</Text>
                </Text>
              ) : null}
            </Text>
          ) : null}

          {data.sections ? (
            <Text className="text-sm leading-6 text-ink-soft">{data.sections}</Text>
          ) : null}
          {data.firDetails ? (
            <Text className="text-sm leading-6 text-ink-soft">{data.firDetails}</Text>
          ) : null}

          {data.nextHearing && (
            <Text className="pt-1 text-sm text-ink">
              Next hearing <Text className="font-semibold">{formatDate(data.nextHearing)}</Text>
            </Text>
          )}

          {data.filedOn || data.assignedTo ? (
            <Text className="text-xs leading-5 text-ink-soft">
              {data.filedOn ? `Filed ${formatDate(data.filedOn)}` : ""}
              {data.filedOn && data.assignedTo ? " · " : ""}
              {data.assignedTo ? `Carried by ${data.assignedTo}` : ""}
            </Text>
          ) : null}

          {mayEdit || mayList ? (
            <View className="flex-row gap-2 pt-2">
              {mayList ? (
                <Pressable
                  onPress={() => router.push(`/files/${caseId}/hearing`)}
                  className="flex-1 items-center rounded-card bg-ink py-2.5 active:bg-ink-soft"
                >
                  <Text className="text-sm font-semibold text-white">Add a hearing</Text>
                </Pressable>
              ) : null}
              {mayEdit ? (
                <Pressable
                  onPress={() => router.push(`/files/${caseId}/edit`)}
                  className="flex-1 items-center rounded-card border border-rule py-2.5 active:bg-gold-wash"
                >
                  <Text className="text-sm font-semibold text-ink">Edit the matter</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>

        <Section icon={<User size={15} color="#9a7622" />} title="Client">
          <View className="gap-1 rounded-card border border-rule bg-surface p-4">
            <Text className="text-base font-semibold text-ink">{data.client.name}</Text>
            {data.client.phone ? (
              <Pressable
                onPress={() => void Linking.openURL(`tel:${data.client.phone}`)}
                className="flex-row items-center gap-2 pt-1"
              >
                <Phone size={15} color="#9a7622" />
                <Text className="text-sm font-semibold text-gold">{data.client.phone}</Text>
              </Pressable>
            ) : null}
            {data.client.email ? (
              <Text className="text-sm text-ink-soft">{data.client.email}</Text>
            ) : null}
            <Text className="pt-1 text-xs text-ink-soft">
              Portal {data.client.portalEnabled ? "is switched on" : "is off"}
            </Text>
          </View>
        </Section>

        {data.notes ? (
          <Section icon={<Lock size={15} color="#9a7622" />} title="Chamber note — not shared">
            <View className="rounded-card border border-rule bg-gold-wash p-4">
              <Text className="text-sm leading-6 text-ink">{data.notes}</Text>
            </View>
          </Section>
        ) : null}

        {problem && (
          <View className="rounded-card bg-danger-wash px-3 py-2.5">
            <Text className="text-sm text-danger">{problem}</Text>
          </View>
        )}

        <Section icon={<Gavel size={15} color="#9a7622" />} title="Hearings">
          {data.hearings.map((h) => (
            <View key={h.id} className="gap-2 rounded-card border border-rule bg-surface p-4">
              <View className="flex-row items-center gap-3">
                <Text className="text-sm font-semibold text-ink">{formatDate(h.hearingDate)}</Text>
                <Text className="flex-1 text-sm text-ink-soft">{h.purpose || "Hearing"}</Text>
              </View>

              {/* The court's own words, set apart so they are not read as
                  the chamber's. One is the record; the other is the
                  reading of it, and an advocate quoting the wrong one at
                  the next date would be quoting themselves. */}
              {h.orderSheet ? (
                <View className="gap-1 rounded-card border-l-2 border-l-gold bg-gold-wash px-3 py-2">
                  <Text className="text-[10px] font-semibold uppercase tracking-wider text-gold">
                    Order sheet
                  </Text>
                  <Text className="text-sm leading-5 text-ink">{h.orderSheet}</Text>
                </View>
              ) : null}

              {h.outcome ? (
                <Text className="text-sm leading-5 text-ink">{h.outcome}</Text>
              ) : (
                <Text className="text-xs text-ink-soft">No outcome recorded.</Text>
              )}

              {h.attendedBy ? (
                <Text className="text-xs text-ink-soft">Appeared: {h.attendedBy}</Text>
              ) : null}

              {can(account, "hearings.edit") &&
                (openHearing === h.id ? (
                  <HearingEdit
                    hearing={h}
                    busy={editHearing.isPending || deleteHearing.isPending}
                    onCancel={() => setOpenHearing(null)}
                    onSave={async (changes) => {
                      if (Object.keys(changes).length > 0) {
                        await run(editHearing.mutateAsync({ hearingId: h.id, changes }));
                      }
                      setOpenHearing(null);
                    }}
                    onDelete={async () => {
                      await run(deleteHearing.mutateAsync(h.id));
                      setOpenHearing(null);
                    }}
                  />
                ) : (
                  <Pressable onPress={() => setOpenHearing(h.id)} hitSlop={6}>
                    <Text className="text-xs font-semibold text-gold">
                      {h.outcome || h.orderSheet ? "Correct this hearing" : "Write it up"}
                    </Text>
                  </Pressable>
                ))}
            </View>
          ))}
        </Section>

        <Section icon={<NotebookPen size={15} color="#9a7622" />} title="Posted to the client">
          {data.updates.map((u) => (
            <View key={u.id} className="gap-1 rounded-card border border-rule bg-surface p-4">
              <Text className="text-xs font-semibold text-gold">{formatDate(u.updateDate)}</Text>
              <Text className="text-sm leading-6 text-ink">{u.message}</Text>
              {u.author ? <Text className="text-xs text-ink-soft">— {u.author}</Text> : null}
            </View>
          ))}
          {can(account, "updates.edit") && (
            <Composer
              placeholder="Post an update the client will see"
              busy={postUpdate.isPending}
              onSubmit={(message) => run(postUpdate.mutateAsync(message))}
            />
          )}
        </Section>

        <Section icon={<MessageSquare size={15} color="#9a7622" />} title="Messages">
          {data.messages.length === 0 ? (
            <View className="rounded-card border border-rule bg-surface p-4">
              <Text className="text-sm text-ink-soft">Nothing has been sent on this matter.</Text>
            </View>
          ) : (
            data.messages.map((m) => (
              <View
                key={m.id}
                className={`gap-1 rounded-card p-4 ${
                  m.authorType === "client"
                    ? "border border-rule bg-surface"
                    : "bg-gold-wash"
                }`}
              >
                <Text className="text-xs font-semibold text-gold">
                  {m.authorType === "client" ? m.authorName || "The client" : "The office"}
                  {m.hasVoiceNote ? " · voice note" : ""}
                  {m.authorType === "client" && !m.answered ? " · unanswered" : ""}
                </Text>
                {m.body ? <Text className="text-sm leading-6 text-ink">{m.body}</Text> : null}
              </View>
            ))
          )}
          {can(account, "messages.reply") && (
            <Composer
              placeholder="Answer the client"
              busy={reply.isPending}
              onSubmit={(body) => run(reply.mutateAsync(body))}
            />
          )}
        </Section>

        <Section icon={<FileText size={15} color="#9a7622" />} title="Documents">
          {data.documents.length === 0 ? (
            <View className="rounded-card border border-rule bg-surface p-4">
              <Text className="text-sm text-ink-soft">Nothing on file yet.</Text>
            </View>
          ) : (
            data.documents.map((d) => (
              <View key={d.id} className="gap-0.5 rounded-card border border-rule bg-surface p-4">
                <Text className="text-sm font-semibold text-ink">{d.title}</Text>
                <Text className="text-xs text-ink-soft">
                  {d.clientVisible ? "Shared with the client" : "Not shared"}
                </Text>
              </View>
            ))
          )}
        </Section>

        {data.fees.shown && (
          <Section icon={<Banknote size={15} color="#9a7622" />} title="Fees">
          {can(account, "money.edit") ? (
            <Pressable
              onPress={() => router.push(`/files/${caseId}/fee`)}
              className="items-center rounded-card border border-gold py-2.5 active:bg-gold-wash"
            >
              <Text className="text-sm font-semibold text-gold">Record a fee</Text>
            </Pressable>
          ) : null}
            <View className="gap-3 rounded-card border border-rule bg-surface p-4">
              <View className="flex-row justify-between">
                <Text className="text-sm text-ink-soft">Agreed</Text>
                <Text className="text-sm font-semibold text-ink">{formatRupees(data.fees.agreed)}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-ink-soft">Received</Text>
                <Text className="text-sm font-semibold text-ink">{formatRupees(data.fees.received)}</Text>
              </View>
              <View className="flex-row justify-between border-t border-rule pt-3">
                <Text className="text-sm font-semibold text-ink">Outstanding</Text>
                <Text className="text-sm font-semibold text-ink">
                  {formatRupees(data.fees.agreed - data.fees.received)}
                </Text>
              </View>
            </View>

            {/* What a client actually asks for. The statement is a page the
                browser opens and prints; the app asks for a link to it at
                the moment it is wanted rather than holding one, because the
                link is a credential with ten minutes on it. */}
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => void openStatement()}
                disabled={statement.isPending}
                className="flex-1 items-center rounded-card border border-rule py-2.5 active:bg-gold-wash"
              >
                <Text className="text-sm font-semibold text-ink">
                  {statement.isPending ? "Drawing…" : "Statement"}
                </Text>
              </Pressable>

              {reminder ? (
                <Pressable
                  onPress={() => void Linking.openURL(reminder)}
                  className="flex-1 items-center rounded-card border border-rule py-2.5 active:bg-gold-wash"
                >
                  <Text className="text-sm font-semibold text-ink">Remind on WhatsApp</Text>
                </Pressable>
              ) : null}
            </View>

            {statementProblem ? (
              <Text className="text-xs text-danger">{statementProblem}</Text>
            ) : null}
          </Section>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
