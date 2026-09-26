import { useRouter } from "expo-router";
import {
  AlertTriangle,
  Banknote,
  Globe,
  BookOpen,
  MessageSquare,
  Briefcase,
  CalendarDays,
  FolderOpen,
  KeyRound,
  Users,
  LogOut,
  User,
} from "lucide-react-native";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { can, useSession } from "@/lib/session";

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
        {/* The chamber, named. Every advocate has their own here, and a
            screen that says only "Chamber staff" would not tell somebody
            with an account in two places which one they are in. */}
        <Text className="text-center text-sm text-ink-soft">
          {isClient
            ? "Client of the chamber"
            : `${account.chamber?.name ?? "Your chamber"} · ${account.role}`}
        </Text>
        <Text className="text-center text-xs text-ink-soft">
          {isClient ? account.username : account.email}
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

      {!isClient && account.emailIsPlaceholder && (
        <View className="gap-1 rounded-card bg-gold-wash px-4 py-3.5">
          <Text className="text-sm leading-5 text-ink">
            You sign in with {account.email}, which was written for you and cannot
            receive mail.
          </Text>
          <Text className="text-xs leading-5 text-ink-soft">
            Put your real address in from the office website, so a password can be
            recovered later.
          </Text>
        </View>
      )}

      {!isClient && account.chamber && !account.chamber.verified && (
        <View className="gap-1 rounded-card border border-rule bg-surface px-4 py-3.5">
          <Text className="text-sm font-semibold text-ink">
            {account.chamber.name} is not verified yet
          </Text>
          <Text className="text-xs leading-5 text-ink-soft">
            That restricts nothing you do inside your chamber. It matters only for
            work you offer to the shared library, which every advocate can read.
          </Text>
        </View>
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

          <Row
            icon={<Banknote size={20} color="#9a7622" />}
            title="Money"
            subtitle="Fees, court fees and the chamber's own costs"
            onPress={() => router.push("/money")}
          />

          <Row
            icon={<MessageSquare size={20} color="#9a7622" />}
            title={"Calls & enquiries"}
            subtitle="What was said, and who wrote in from the website"
            onPress={() => router.push("/contact")}
          />

          <Row
            icon={<BookOpen size={20} color="#9a7622" />}
            title="Your library"
            subtitle="Judgments, writing and recordings — yours, your site, or shared"
            onPress={() => router.push("/chamber-library")}
          />

          {can(session.account, "users.manage") && (
            <Row
              icon={<Users size={20} color="#9a7622" />}
              title="Your colleagues"
              subtitle="Who works here, and what each of them may do"
              onPress={() => router.push("/chamber/staff")}
            />
          )}

          {can(session.account, "settings.edit") && (
            <Row
              icon={<Globe size={20} color="#9a7622" />}
              title="What the site says"
              subtitle="The telephone number and address your clients see"
              onPress={() => router.push("/chamber/settings")}
            />
          )}
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
