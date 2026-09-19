import { useRouter } from "expo-router";
import {
  AlertTriangle,
  Briefcase,
  CalendarDays,
  FolderOpen,
  KeyRound,
  LogOut,
  User,
} from "lucide-react-native";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSession } from "@/lib/session";

function Row({
  icon,
  title,
  subtitle,
  onPress,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`flex-row items-center gap-3 rounded-card border border-rule bg-surface px-4 py-4 ${
        disabled ? "opacity-50" : "active:bg-gold-wash"
      }`}
    >
      <View className="size-10 items-center justify-center rounded-card bg-gold-wash">{icon}</View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-ink">{title}</Text>
        <Text className="text-sm text-ink-soft">{subtitle}</Text>
      </View>
    </Pressable>
  );
}

export default function AccountScreen() {
  const router = useRouter();
  const session = useSession();

  if (session.status === "loading") {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#9a7622" />
      </View>
    );
  }

  if (session.status === "signed-out") {
    return (
      <View className="flex-1 items-center justify-center gap-4 px-8">
        <Text className="text-center text-sm text-ink-soft">
          You are not signed in.
        </Text>
        <Pressable
          onPress={() => router.replace("/sign-in")}
          className="rounded-card bg-ink px-5 py-3 active:bg-ink-soft"
        >
          <Text className="text-base font-semibold text-white">Sign in</Text>
        </Pressable>
      </View>
    );
  }

  const { account } = session;
  const isClient = account.kind === "client";
  const displayName = isClient ? account.name : account.fullName;

  return (
    <ScrollView contentContainerClassName="gap-6 px-5 py-8">
      <View className="items-center gap-2">
        <View className="size-16 items-center justify-center rounded-card bg-gold-wash">
          {isClient ? (
            <User size={30} color="#9a7622" strokeWidth={1.5} />
          ) : (
            <Briefcase size={30} color="#9a7622" strokeWidth={1.5} />
          )}
        </View>
        <Text className="text-center text-lg font-semibold text-ink">{displayName}</Text>
        <Text className="text-center text-sm text-ink-soft">
          {isClient ? "Client of the firm" : `Chamber staff · ${account.role}`} ·{" "}
          {account.username}
        </Text>
      </View>

      {account.mustChangePassword && (
        <Pressable
          onPress={() => router.push("/change-password")}
          className="flex-row items-center gap-3 rounded-card bg-danger-wash px-4 py-3.5 active:opacity-80"
        >
          <AlertTriangle size={18} color="#8e2f1f" />
          <Text className="flex-1 text-sm leading-5 text-danger">
            You are still using the password the office gave you. Tap here to
            choose your own.
          </Text>
        </Pressable>
      )}

      {isClient ? (
        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-[2px] text-gold">
            Your matters
          </Text>
          <Row
            icon={<FolderOpen size={20} color="#9a7622" />}
            title="Your cases"
            subtitle="Hearings, progress, documents and questions"
            onPress={() => router.push("/cases")}
          />
        </View>
      ) : (
        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-[2px] text-gold">
            The chamber
          </Text>
          <Row
            icon={<CalendarDays size={20} color="#9a7622" />}
            title="Cause list"
            subtitle="What is listed today and the fortnight ahead"
            onPress={() => router.push("/diary")}
          />
          <Row
            icon={<FolderOpen size={20} color="#9a7622" />}
            title="Case files"
            subtitle="Search every matter in the chamber"
            onPress={() => router.push("/files")}
          />
        </View>
      )}

      <View className="gap-2">
        <Text className="text-xs font-semibold uppercase tracking-[2px] text-gold">
          This account
        </Text>
        <Row
          icon={<KeyRound size={20} color="#9a7622" />}
          title="Change your password"
          subtitle="Set a new one"
          onPress={() => router.push("/change-password")}
        />
        <Row
          icon={<LogOut size={20} color="#9a7622" />}
          title="Sign out"
          subtitle="Removes the saved sign-in from this phone"
          onPress={() => void session.signOut().then(() => router.replace("/"))}
        />
      </View>
    </ScrollView>
  );
}
