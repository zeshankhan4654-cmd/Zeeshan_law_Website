import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryProvider } from "@/lib/query-provider";
import "../global.css";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryProvider>
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
        </Stack>
      </QueryProvider>
    </SafeAreaProvider>
  );
}
