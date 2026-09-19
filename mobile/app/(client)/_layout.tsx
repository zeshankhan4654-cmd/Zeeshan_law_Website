import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useSession } from "@/lib/session";

/**
 * The gate on everything a client sees of their own matters.
 *
 * The web app does this in a Server Component, before a protected page
 * renders at all. There is no server here, so it happens in the one layout
 * every case screen sits inside — which means a deep link straight to
 * `/cases/3`, or a token that expired while the phone was in a pocket,
 * lands on the sign-in screen rather than on a spinner that never resolves.
 *
 * This is convenience, not security: the API refuses the request regardless
 * of what the app chooses to render.
 */
export default function ClientLayout() {
  const session = useSession();

  if (session.status === "loading") {
    return (
      <View className="flex-1 items-center justify-center bg-ground">
        <ActivityIndicator color="#9a7622" />
      </View>
    );
  }

  if (session.status === "signed-out") {
    return <Redirect href="/sign-in" />;
  }

  // Staff sign in too, but their screens are their own (phase A4).
  if (session.account.kind !== "client") {
    return <Redirect href="/account" />;
  }

  if (session.account.mustChangePassword) {
    return <Redirect href="/change-password" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#17140f" },
        headerTintColor: "#ffffff",
        headerTitleStyle: { fontWeight: "600", fontSize: 16 },
        contentStyle: { backgroundColor: "#faf8f5" },
      }}
    >
      <Stack.Screen name="cases/index" options={{ title: "Your cases" }} />
      <Stack.Screen name="cases/[id]/index" options={{ title: "Your case" }} />
      <Stack.Screen name="cases/[id]/messages" options={{ title: "Ask the office" }} />
    </Stack>
  );
}
