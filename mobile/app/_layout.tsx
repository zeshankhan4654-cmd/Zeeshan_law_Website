import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryProvider } from "@/lib/query-provider";
import { SessionProvider } from "@/lib/session";
import "../global.css";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryProvider>
        {/* Inside QueryProvider: signing out clears the query cache, so nothing
            fetched as one identity can be shown to the next. */}
        <SessionProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: "#17140f" },
              headerTintColor: "#ffffff",
              headerTitleStyle: { fontWeight: "600", fontSize: 16 },
              contentStyle: { backgroundColor: "#faf8f5" },
            }}
          >
            <Stack.Screen name="index" options={{ title: "The Chamber" }} />
            <Stack.Screen name="library/index" options={{ title: "Legal Research" }} />
            <Stack.Screen name="library/judgments" options={{ title: "Judgments" }} />
            <Stack.Screen name="library/[id]" options={{ title: "", headerBackTitle: "Library" }} />
            <Stack.Screen name="sign-in" options={{ title: "Sign in" }} />
            <Stack.Screen name="account" options={{ title: "Your account" }} />
            <Stack.Screen name="change-password" options={{ title: "Password" }} />
          </Stack>
        </SessionProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
}
