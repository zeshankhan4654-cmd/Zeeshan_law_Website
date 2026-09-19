import { useRouter } from "expo-router";
import { BookOpen, Gavel, Phone, Scale, Video } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLibraryCounts } from "@/lib/library";

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

export default function Home() {
  const router = useRouter();
  const { data: counts } = useLibraryCounts();

  return (
    <ScrollView contentContainerClassName="gap-6 px-5 py-8">
      <View className="items-center gap-3">
        <View className="size-16 items-center justify-center rounded-card bg-gold-wash">
          <Scale size={32} color="#9a7622" strokeWidth={1.5} />
        </View>
        <Text className="text-center text-xl font-semibold text-ink">
          The Arbitrator &amp; Law Associates
        </Text>
        <Text className="text-center text-sm text-ink-soft">
          Advocates, Arbitrators &amp; Legal Consultants · Peshawar High Court
        </Text>
      </View>

      <View className="gap-2">
        <Text className="text-xs font-semibold uppercase tracking-[2px] text-gold">
          The library — open to all
        </Text>
        <Tile
          icon={<BookOpen size={20} color="#9a7622" />}
          title="Legal research"
          subtitle="Articles on limitation, arbitration, bail and more"
          count={counts?.research}
          onPress={() => router.push("/library")}
        />
        <Tile
          icon={<Gavel size={20} color="#9a7622" />}
          title="Judgments"
          subtitle="Reported decisions of the superior courts"
          count={counts?.judgments}
          onPress={() => router.push("/library/judgments")}
        />
        <Tile
          icon={<Video size={20} color="#9a7622" />}
          title="Videos &amp; lectures"
          subtitle="Recorded material from the chamber"
          count={counts?.media}
          disabled
        />
      </View>

      <View className="gap-2">
        <Text className="text-xs font-semibold uppercase tracking-[2px] text-gold">
          Coming next
        </Text>
        <Tile
          icon={<Phone size={20} color="#9a7622" />}
          title="Sign in"
          subtitle="Clients and chamber staff — arriving in the next release"
          disabled
        />
      </View>

      <Text className="px-2 text-center text-xs leading-5 text-ink-soft">
        Material in this library is general information, not legal advice on
        your matter.
      </Text>
    </ScrollView>
  );
}
