import { useRouter } from "expo-router";
import { Briefcase, Eye, EyeOff, Lock, ShieldCheck, User } from "lucide-react-native";
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
import { useSession, type Audience } from "@/lib/session";

const TABS: { key: Audience; label: string; hint: string }[] = [
  { key: "client", label: "Client", hint: "Sign in with the username the office gave you." },
  { key: "staff", label: "Chamber staff", hint: "Your office account — the same one you use on the website." },
];

export default function SignIn() {
  const router = useRouter();
  const { signIn } = useSession();

  const [audience, setAudience] = useState<Audience>("client");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tab = TABS.find((t) => t.key === audience)!;
  const ready = !busy && username.trim().length > 0 && password.length > 0;

  async function submit() {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const account = await signIn(audience, username.trim().toLowerCase(), password);
      setPassword("");
      // A password the office chose is not a password the holder chose.
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
            The library is open to everyone. Signing in is for clients of the
            firm and for chamber staff.
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

          <View className="gap-1.5">
            <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-soft">
              Username
            </Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              placeholder={audience === "client" ? "fazal.rehman" : "your office username"}
              placeholderTextColor="#a29a8c"
              className="rounded-card border border-rule px-3 py-3 text-base text-ink"
            />
          </View>

          <View className="gap-1.5">
            <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-soft">
              Password
            </Text>
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
          </View>

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

        <View className="flex-row gap-2.5 px-1">
          <ShieldCheck size={16} color="#9a7622" />
          <Text className="flex-1 text-xs leading-5 text-ink-soft">
            There is no public sign-up. Client accounts are issued by the
            office — telephone the chamber if you need one, or if you have
            forgotten your password.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
