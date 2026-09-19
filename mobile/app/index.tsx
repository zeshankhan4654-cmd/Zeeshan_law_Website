import { useQuery } from "@tanstack/react-query";
import { CircleAlert, CircleCheck, LoaderCircle, Scale } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";
import { apiFetch, API_URL } from "@/lib/api";

type HealthResponse = { status: "ok"; database: "connected" };

/**
 * A0's proof of life: the app renders with the brand tokens, and reaches the
 * same Express API the website uses. Real screens arrive in A1 onward.
 */
export default function Home() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["health"],
    queryFn: () => apiFetch<HealthResponse>("/api/health"),
  });

  return (
    <ScrollView contentContainerClassName="flex-1 items-center justify-center gap-6 px-6 py-16">
      <View className="size-16 items-center justify-center rounded-card bg-gold-wash">
        <Scale size={32} color="#9a7622" strokeWidth={1.5} />
      </View>

      <View className="items-center gap-2">
        <Text className="text-xs font-semibold uppercase tracking-[2px] text-gold">
          Phase A0 — walking skeleton
        </Text>
        <Text className="text-center text-2xl font-semibold text-ink">
          The Arbitrator &amp; Law Associates
        </Text>
        <Text className="text-center text-base text-ink-soft">
          Advocates, Arbitrators &amp; Legal Consultants
        </Text>
      </View>

      <View className="w-full rounded-card border border-rule bg-surface px-4 py-3">
        {isPending && (
          <View className="flex-row items-center gap-2">
            <LoaderCircle size={16} color="#9a7622" />
            <Text className="text-sm text-ink-soft">Reaching the API…</Text>
          </View>
        )}
        {isError && (
          <View className="flex-row items-start gap-2">
            <CircleAlert size={16} color="#8e2f1f" />
            <View className="flex-1">
              <Text className="text-sm text-danger">
                {error instanceof Error ? error.message : "API unreachable."}
              </Text>
              <Text className="mt-1 text-xs text-ink-soft">Tried {API_URL}</Text>
            </View>
          </View>
        )}
        {data && (
          <View className="flex-row items-center gap-2">
            <CircleCheck size={16} color="#2e6042" />
            <Text className="text-sm text-ink-soft">
              API {data.status} · database {data.database}
            </Text>
          </View>
        )}
      </View>

      <Text className="text-center text-xs text-ink-soft">
        Next: the Library — searchable judgments and legal research, open to
        anyone, no sign-in.
      </Text>
    </ScrollView>
  );
}
