import { useRouter } from "expo-router";
import { Building2, Check, Lock, ScrollText, Share2, ShieldCheck } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import { apiFetch } from "@/lib/api";
import { useSession, type Chamber } from "@/lib/session";

/** The server enforces the same floor; saying so here saves a round trip. */
const MIN_PASSWORD = 10;

type Registered = { chamber: Chamber; email: string };

/**
 * An advocate registering their own chamber, from the phone.
 *
 * The one place in the app where somebody creates their own account, and
 * deliberately so: the whole idea is that an advocate can download this,
 * register, and have their diary the same afternoon. What it creates is a
 * new, empty chamber — it is not a way into anybody else's. Staff and
 * clients inside a chamber are still issued by the advocate.
 */
export default function SignUp() {
  const router = useRouter();
  const { signInWithToken } = useSession();

  const [fullName, setFullName] = useState("");
  const [chamberName, setChamberName] = useState("");
  const [email, setEmail] = useState("");
  const [enrolmentNo, setEnrolmentNo] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Registered | null>(null);

  const ready =
    !busy &&
    fullName.trim().length > 1 &&
    chamberName.trim().length > 1 &&
    email.trim().includes("@") &&
    password.length >= MIN_PASSWORD;

  async function submit() {
    if (!ready) return;
    setError(null);
    setBusy(true);
    try {
      const created = await apiFetch<{
        token: string;
        email: string;
        chamber: Chamber;
      }>("/api/signup", {
        method: "POST",
        body: JSON.stringify({
          fullName: fullName.trim(),
          chamberName: chamberName.trim(),
          email: email.trim().toLowerCase(),
          password,
          enrolmentNo: enrolmentNo.trim(),
        }),
      });

      setPassword("");
      // Signed in from here rather than by asking for the password again:
      // they chose it thirty seconds ago and the server just returned a
      // token for it.
      await signInWithToken("staff", created.token);
      setDone({ chamber: created.chamber, email: created.email });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register the chamber.");
    } finally {
      setBusy(false);
    }
  }

  if (done) return <Welcome registered={done} onEnter={() => router.replace("/account")} />;

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerClassName="gap-6 px-5 py-8" keyboardShouldPersistTaps="handled">
        <View className="items-center gap-2">
          <View className="size-14 items-center justify-center rounded-card bg-gold-wash">
            <Building2 size={26} color="#9a7622" strokeWidth={1.5} />
          </View>
          <Text className="text-center text-lg font-semibold text-ink">
            Register your chamber
          </Text>
          <Text className="text-center text-sm leading-6 text-ink-soft">
            Your diary, your clients&rsquo; files and your own library — visible to
            nobody outside your chamber.
          </Text>
        </View>

        <View className="gap-4 rounded-card border border-rule bg-surface p-4">
          <Entry label="Your name" value={fullName} onChange={setFullName} autoComplete="name" />
          <Entry
            label="Chamber name"
            value={chamberName}
            onChange={setChamberName}
            hint="As you would write it on a letterhead. It appears in the link you give your clients."
          />
          <Entry
            label="Email"
            value={email}
            onChange={setEmail}
            keyboardType="email-address"
            autoComplete="email"
            hint="This is what you will sign in with."
          />
          <Entry
            label="Enrolment number"
            value={enrolmentNo}
            onChange={setEnrolmentNo}
            hint="Optional. Helps us verify the chamber; nothing waits on it."
          />
          <Entry
            label="Password"
            value={password}
            onChange={setPassword}
            secure
            autoComplete="new-password"
            hint={`At least ${MIN_PASSWORD} characters. Three unrelated words beat one word with digits on the end.`}
          />

          {error && (
            <View className="rounded-card bg-danger-wash px-3 py-2.5">
              <Text className="text-sm text-danger">{error}</Text>
            </View>
          )}

          <Pressable
            onPress={submit}
            disabled={!ready}
            className={`flex-row items-center justify-center gap-2 rounded-card py-3.5 ${
              ready ? "bg-ink active:bg-ink-soft" : "bg-rule"
            }`}
          >
            {busy && <ActivityIndicator color="#4b443a" size="small" />}
            <Text className={`text-base font-semibold ${ready ? "text-white" : "text-ink-soft"}`}>
              {busy ? "Creating your chamber…" : "Create my chamber"}
            </Text>
          </Pressable>
        </View>

        <View className="flex-row gap-2.5 px-1">
          <ShieldCheck size={16} color="#9a7622" />
          <Text className="flex-1 text-xs leading-5 text-ink-soft">
            Every record in your chamber carries the chamber it belongs to, and the
            database itself refuses a query that reaches outside it. Not a rule we
            remember to follow — one the code cannot break.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Entry({
  label,
  value,
  onChange,
  hint,
  secure,
  keyboardType,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  secure?: boolean;
  keyboardType?: "email-address";
  autoComplete?: "name" | "email" | "new-password";
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-soft">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure}
        autoCapitalize={keyboardType === "email-address" || secure ? "none" : "words"}
        autoCorrect={false}
        keyboardType={keyboardType}
        autoComplete={autoComplete}
        placeholderTextColor="#a29a8c"
        className="rounded-card border border-rule px-3 py-3 text-base text-ink"
      />
      {hint && <Text className="text-xs leading-5 text-ink-soft">{hint}</Text>}
    </View>
  );
}

/** The two things an advocate needs in the first minute. */
function Welcome({ registered, onEnter }: { registered: Registered; onEnter: () => void }) {
  const link = `${process.env.EXPO_PUBLIC_SITE_URL ?? "https://arbitratorandlaw.com"}${registered.chamber.clientLoginPath}`;

  /**
   * The system share sheet rather than the clipboard.
   *
   * What an advocate actually does with this link is send it to a client,
   * and here that means WhatsApp. A share sheet gets them there in one tap;
   * a clipboard copy makes them go and find the app themselves.
   */
  async function send() {
    await Share.share({
      message: `Sign in to your matter with ${registered.chamber.name}: ${link}`,
    }).catch(() => undefined);
  }

  return (
    <ScrollView contentContainerClassName="gap-5 px-5 py-8">
      <View className="items-center gap-2">
        <View className="size-14 items-center justify-center rounded-card bg-gold-wash">
          <Check size={26} color="#9a7622" strokeWidth={1.5} />
        </View>
        <Text className="text-center text-lg font-semibold text-ink">
          {registered.chamber.name} is ready
        </Text>
        <Text className="text-center text-sm leading-6 text-ink-soft">
          Signed in as {registered.email}. No other chamber on this platform can see
          your clients, your files or your diary.
        </Text>
      </View>

      <View className="gap-2 rounded-card border border-rule bg-surface p-4">
        <View className="flex-row items-center gap-2">
          <ScrollText size={16} color="#9a7622" />
          <Text className="text-sm font-semibold text-ink">The link for your clients</Text>
        </View>
        <Text className="text-xs leading-5 text-ink-soft">
          Give this to a client once you switch their portal access on. Signing in
          needs the link as well as their username, which is why a client of another
          chamber cannot reach yours.
        </Text>
        <Text selectable className="rounded-card bg-ground px-3 py-2.5 text-xs text-ink">
          {link}
        </Text>
        <Pressable onPress={send} className="flex-row items-center gap-1.5 py-1">
          <Share2 size={14} color="#9a7622" />
          <Text className="text-xs font-semibold text-gold">Send it to a client</Text>
        </Pressable>
      </View>

      <View className="flex-row gap-2.5 px-1">
        <Lock size={16} color="#9a7622" />
        <Text className="flex-1 text-xs leading-5 text-ink-soft">
          Your chamber is not yet verified. That restricts nothing you do inside it —
          it matters only for work you later offer to the shared library, which every
          advocate can read.
        </Text>
      </View>

      <Pressable
        onPress={onEnter}
        className="items-center rounded-card bg-ink py-3.5 active:bg-ink-soft"
      >
        <Text className="text-base font-semibold text-white">Go to my chamber</Text>
      </Pressable>
    </ScrollView>
  );
}
