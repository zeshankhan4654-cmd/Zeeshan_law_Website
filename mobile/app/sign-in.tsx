import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { AtSign, Briefcase, Building2, Eye, EyeOff, Lock, ShieldCheck, User } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { DEMO } from "@/lib/demo";
import { useSession, type Audience } from "@/lib/session";

const TABS: { key: Audience; label: string; hint: string }[] = [
  {
    key: "client",
    label: "Client",
    hint: "Sign in with the chamber's link and the username your advocate gave you.",
  },
  {
    key: "staff",
    label: "Advocate or staff",
    hint: "Your email address — the same sign-in as the website.",
  },
];

/** The shared look of every field on this screen. */
function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-1.5">
      <View className="flex-row items-center gap-1.5">
        {icon}
        <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-soft">
          {label}
        </Text>
      </View>
      {children}
    </View>
  );
}

export default function SignIn() {
  const router = useRouter();
  const { signIn } = useSession();

  /**
   * The chamber, when the client arrived here from their advocate's link.
   *
   * An advocate sends `.../client/login/<chamber>`; the app claims that
   * path, so tapping it on a phone with the app installed lands here with
   * the chamber already filled in. Typed by hand otherwise.
   */
  const params = useLocalSearchParams<{ chamber?: string }>();

  const [audience, setAudience] = useState<Audience>(params.chamber ? "client" : "client");
  const [chamber, setChamber] = useState(params.chamber ?? "");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tab = TABS.find((t) => t.key === audience)!;

  const ready =
    !busy &&
    password.length > 0 &&
    (audience === "staff"
      ? email.trim().includes("@")
      : chamber.trim().length > 0 && username.trim().length > 0);

  async function submit() {
    if (!ready) return;
    setError(null);
    setBusy(true);
    try {
      const account = await signIn(
        audience === "staff"
          ? { kind: "staff", email: email.trim().toLowerCase(), password }
          : {
              kind: "client",
              firm: chamber.trim().toLowerCase(),
              username: username.trim().toLowerCase(),
              password,
            }
      );
      setPassword("");
      // A password the office chose is not a password its holder chose.
      router.replace(account.mustChangePassword ? "/change-password" : "/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  function switchTo(next: Audience) {
    setAudience(next);
    setError(null);
    setPassword("");
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerClassName="gap-6 px-5 py-8" keyboardShouldPersistTaps="handled">
        <View className="items-center gap-2">
          <View className="size-14 items-center justify-center rounded-card bg-gold-wash">
            <Lock size={26} color="#9a7622" strokeWidth={1.5} />
          </View>
          <Text className="text-center text-lg font-semibold text-ink">Sign in</Text>
          <Text className="text-center text-sm text-ink-soft">
            The library is open to everyone. Signing in is for advocates, their
            staff, and their clients.
          </Text>
        </View>

        <View className="flex-row rounded-card border border-rule bg-surface p-1">
          {TABS.map((t) => (
            <Pressable
              key={t.key}
              onPress={() => switchTo(t.key)}
              className={`flex-1 flex-row items-center justify-center gap-2 rounded-card py-2.5 ${
                audience === t.key ? "bg-gold-wash" : ""
              }`}
            >
              {t.key === "client" ? (
                <User size={16} color={audience === t.key ? "#9a7622" : "#4b443a"} />
              ) : (
                <Briefcase size={16} color={audience === t.key ? "#9a7622" : "#4b443a"} />
              )}
              <Text
                className={`text-sm font-semibold ${
                  audience === t.key ? "text-gold" : "text-ink-soft"
                }`}
              >
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="gap-4 rounded-card border border-rule bg-surface p-4">
          <Text className="text-sm text-ink-soft">{tab.hint}</Text>

          {audience === "staff" ? (
            <Field label="Email" icon={<AtSign size={13} color="#a29a8c" />}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                placeholder="you@example.com"
                placeholderTextColor="#a29a8c"
                className="rounded-card border border-rule px-3 py-3 text-base text-ink"
              />
            </Field>
          ) : (
            <>
              <Field label="Chamber" icon={<Building2 size={13} color="#a29a8c" />}>
                <TextInput
                  value={chamber}
                  onChangeText={setChamber}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="the-name-in-your-advocate's-link"
                  placeholderTextColor="#a29a8c"
                  className="rounded-card border border-rule px-3 py-3 text-base text-ink"
                />
                <Text className="text-xs leading-5 text-ink-soft">
                  The last part of the link your advocate sent you. Two chambers may
                  have a client of the same name, so this is what says which is yours.
                </Text>
              </Field>

              <Field label="Username" icon={<User size={13} color="#a29a8c" />}>
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  textContentType="username"
                  placeholder="fazal.rehman"
                  placeholderTextColor="#a29a8c"
                  className="rounded-card border border-rule px-3 py-3 text-base text-ink"
                />
              </Field>
            </>
          )}

          <Field label="Password" icon={<Lock size={13} color="#a29a8c" />}>
            <View className="flex-row items-center rounded-card border border-rule pr-2">
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!reveal}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
                onSubmitEditing={submit}
                returnKeyType="go"
                placeholderTextColor="#a29a8c"
                className="flex-1 px-3 py-3 text-base text-ink"
              />
              <Pressable onPress={() => setReveal((r) => !r)} hitSlop={10} className="p-2">
                {reveal ? <EyeOff size={18} color="#4b443a" /> : <Eye size={18} color="#4b443a" />}
              </Pressable>
            </View>
          </Field>

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
              {busy ? "Signing in…" : "Sign in"}
            </Text>
          </Pressable>
        </View>

        {DEMO && (
          <View className="gap-3 rounded-card border border-gold/40 bg-gold-wash p-4">
            <Text className="text-sm font-semibold text-ink">This is the demonstration</Text>
            <Text className="text-sm leading-6 text-ink-soft">
              There are no real accounts, so nothing here needs a password. Tap to see
              either side of the app.
            </Text>
            <Pressable
              onPress={() => {
                setAudience("staff");
                setEmail("you@example.com");
                setPassword("demonstration");
              }}
              className="items-center rounded-card bg-ink py-3 active:bg-ink-soft"
            >
              <Text className="text-base font-semibold text-white">Fill in an advocate</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setAudience("client");
                setChamber("demo-chamber");
                setUsername("fazal.rehman");
                setPassword("demonstration");
              }}
              className="items-center rounded-card border border-gold py-3"
            >
              <Text className="text-base font-semibold text-gold">Fill in a client</Text>
            </Pressable>
          </View>
        )}

        {audience === "staff" ? (
          <View className="gap-3 rounded-card border border-rule bg-surface p-4">
            <Text className="text-sm font-semibold text-ink">No chamber yet?</Text>
            <Text className="text-sm leading-6 text-ink-soft">
              Any advocate can register one and start keeping their diary the same
              afternoon. Your chamber is yours alone — no other chamber can see your
              clients, your files or your diary.
            </Text>
            <Link href="/sign-up" asChild>
              <Pressable className="items-center rounded-card border border-gold py-3">
                <Text className="text-base font-semibold text-gold">Register my chamber</Text>
              </Pressable>
            </Link>
          </View>
        ) : (
          <View className="flex-row gap-2.5 px-1">
            <ShieldCheck size={16} color="#9a7622" />
            <Text className="flex-1 text-xs leading-5 text-ink-soft">
              Client accounts are issued by your own advocate&rsquo;s office, never
              signed up for here. Telephone the chamber if you need one, or if you
              have forgotten your password.
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
