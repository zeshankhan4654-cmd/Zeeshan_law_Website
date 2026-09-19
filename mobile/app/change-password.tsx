import { useRouter } from "expo-router";
import { KeyRound } from "lucide-react-native";
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
import { apiFetch } from "@/lib/api";
import { useSession } from "@/lib/session";

const MIN_LENGTH = 10;

/**
 * Shown when the office issued the password rather than its holder choosing
 * it. The server enforces this too — the account can do nothing else until
 * it is done — so this screen is the courtesy, not the control.
 */
export default function ChangePassword() {
  const router = useRouter();
  const session = useSession();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session.status !== "signed-in") {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-sm text-ink-soft">Sign in first.</Text>
      </View>
    );
  }

  const base = session.account.kind === "client" ? "/api/portal" : "/api/auth";
  const tooShort = newPassword.length > 0 && newPassword.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== newPassword;
  const ready =
    currentPassword.length > 0 && newPassword.length >= MIN_LENGTH && confirm === newPassword;

  async function submit() {
    if (busy || !ready) return;
    setError(null);
    setBusy(true);
    try {
      await apiFetch(`${base}/change-password`, {
        method: "POST",
        token: session.status === "signed-in" ? session.token : null,
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      // Re-reads the account, which clears mustChangePassword.
      await session.refresh();
      router.replace("/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change the password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerClassName="gap-6 px-5 py-8" keyboardShouldPersistTaps="handled">
        <View className="items-center gap-2">
          <View className="size-14 items-center justify-center rounded-card bg-gold-wash">
            <KeyRound size={26} color="#9a7622" strokeWidth={1.5} />
          </View>
          <Text className="text-center text-lg font-semibold text-ink">
            Choose your own password
          </Text>
          <Text className="text-center text-sm leading-5 text-ink-soft">
            The password you were given is known to the office. Set one only
            you know before going any further.
          </Text>
        </View>

        <View className="gap-4 rounded-card border border-rule bg-surface p-4">
          <View className="gap-1.5">
            <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-soft">
              The password you were given
            </Text>
            <TextInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              className="rounded-card border border-rule px-3 py-3 text-base text-ink"
            />
          </View>

          <View className="gap-1.5">
            <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-soft">
              Your new password
            </Text>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              className="rounded-card border border-rule px-3 py-3 text-base text-ink"
            />
            <Text className={`text-xs ${tooShort ? "text-danger" : "text-ink-soft"}`}>
              At least {MIN_LENGTH} characters. Three unrelated words are
              easier to remember and harder to guess than one word with
              digits on the end.
            </Text>
          </View>

          <View className="gap-1.5">
            <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-soft">
              Type it again
            </Text>
            <TextInput
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={submit}
              returnKeyType="go"
              className="rounded-card border border-rule px-3 py-3 text-base text-ink"
            />
            {mismatch && <Text className="text-xs text-danger">The two do not match.</Text>}
          </View>

          {error && (
            <View className="rounded-card bg-danger-wash px-3 py-2.5">
              <Text className="text-sm text-danger">{error}</Text>
            </View>
          )}

          <Pressable
            onPress={submit}
            disabled={!ready || busy}
            className={`flex-row items-center justify-center gap-2 rounded-card py-3.5 ${
              !ready || busy ? "bg-rule" : "bg-ink active:bg-ink-soft"
            }`}
          >
            {busy && <ActivityIndicator color="#4b443a" size="small" />}
            <Text
              className={`text-base font-semibold ${
                !ready || busy ? "text-ink-soft" : "text-white"
              }`}
            >
              {busy ? "Saving…" : "Save the new password"}
            </Text>
          </Pressable>
        </View>

        <Pressable onPress={() => void session.signOut().then(() => router.replace("/"))}>
          <Text className="text-center text-sm text-ink-soft underline">Sign out instead</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
