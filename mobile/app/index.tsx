import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { BookOpen, Building2, Gavel, LogIn, Scale, UserCircle, Video } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { usePublicSignup } from "@/lib/platform-settings";
import { useLibraryCounts } from "@/lib/library";
import { useSession } from "@/lib/session";

function Tile({
  icon,
  title,
  subtitle,
  count,
  onPress,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  count?: number;
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
      {count !== undefined && (
        <View className="rounded-full bg-gold-wash px-2.5 py-1">
          <Text className="text-xs font-semibold text-gold">{count}</Text>
        </View>
      )}
    </Pressable>
  );
}

/**
 * The app's name, from app.config.js rather than written in here.
 *
 * It is still the first chamber's name, which is wrong for an app every
 * advocate downloads — but naming the product is not a decision to make in
 * a component. Reading it from the config means renaming it is one line in
 * one file and every screen follows.
 */
const APP_NAME = Constants.expoConfig?.name ?? "Chambers";

export default function Home() {
  const publicSignup = usePublicSignup();
  const router = useRouter();
  const { data: counts } = useLibraryCounts();
  const session = useSession();

  return (
    <ScrollView contentContainerClassName="gap-6 px-5 py-8">
      <View className="items-center gap-3">
        <View className="size-16 items-center justify-center rounded-card bg-gold-wash">
          <Scale size={32} color="#9a7622" strokeWidth={1.5} />
        </View>
        <Text className="text-center text-xl font-semibold text-ink">{APP_NAME}</Text>
        <Text className="text-center text-sm leading-5 text-ink-soft">
          A chamber in your pocket — your diary, your clients&rsquo; files, and a
          library every advocate contributes to.
        </Text>
      </View>

      <View className="gap-2">
        <Text className="text-xs font-semibold uppercase tracking-[2px] text-gold">
          The shared library — open to all
        </Text>
        <Tile
          icon={<BookOpen size={20} color="#9a7622" />}
          title="Legal research"
          subtitle="Contributed by chambers across the country"
          count={counts?.research}
          onPress={() => router.push("/library")}
        />
        <Tile
          icon={<Gavel size={20} color="#9a7622" />}
          title="Judgments"
          subtitle="Reported decisions, each checked before it appears"
          count={counts?.judgments}
          onPress={() => router.push("/library/judgments")}
        />
        <Tile
          icon={<Video size={20} color="#9a7622" />}
          title="Videos &amp; lectures"
          subtitle="Recorded material from contributing chambers"
          count={counts?.media}
          disabled
        />
      </View>

      <View className="gap-2">
        <Text className="text-xs font-semibold uppercase tracking-[2px] text-gold">
          Your chamber
        </Text>
        {session.status === "signed-in" ? (
          <Tile
            icon={<UserCircle size={20} color="#9a7622" />}
            title="Your account"
            subtitle={
              session.account.kind === "client"
                ? session.account.name
                : `${session.account.fullName} · ${session.account.chamber?.name ?? "chamber staff"}`
            }
            onPress={() => router.push("/account")}
          />
        ) : (
          <>
            <Tile
              icon={<LogIn size={20} color="#9a7622" />}
              title="Sign in"
              subtitle="Advocates, their staff, and their clients"
              // Nothing to press while the saved sign-in is still being read.
              disabled={session.status === "loading"}
              onPress={() => router.push("/sign-in")}
            />
            {/* The reason an advocate who found this in the store would
                keep it: they can have their own chamber in a minute —
                while the platform is taking them. */}
            {publicSignup && (
              <Tile
                icon={<Building2 size={20} color="#9a7622" />}
                title="Register your chamber"
                subtitle="Your own diary, clients and files — private to you"
                disabled={session.status === "loading"}
                onPress={() => router.push("/sign-up")}
              />
            )}
          </>
        )}
      </View>

      <Text className="px-2 text-center text-xs leading-5 text-ink-soft">
        Material in the shared library is general information, not legal advice on
        your matter, and each entry names the chamber that contributed it.
      </Text>
    </ScrollView>
  );
}
