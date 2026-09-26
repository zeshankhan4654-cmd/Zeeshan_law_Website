import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useSession } from "@/lib/session";

/** The chamber's side of the app. Clients are sent back to their own. */
export default function StaffLayout() {
  const session = useSession();

  if (session.status === "loading") {
    return (
      <View className="flex-1 items-center justify-center bg-ground">
        <ActivityIndicator color="#9a7622" />
      </View>
    );
  }

  if (session.status === "signed-out") return <Redirect href="/sign-in" />;
  if (session.account.kind !== "staff") return <Redirect href="/account" />;
  if (session.account.mustChangePassword) return <Redirect href="/change-password" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#17140f" },
        headerTintColor: "#ffffff",
        headerTitleStyle: { fontWeight: "600", fontSize: 16 },
        contentStyle: { backgroundColor: "#faf8f5" },
      }}
    >
      <Stack.Screen name="diary" options={{ title: "Cause list" }} />
      <Stack.Screen name="files/index" options={{ title: "Cases" }} />
      <Stack.Screen name="files/new" options={{ title: "New matter" }} />
      <Stack.Screen name="files/[id]/index" options={{ title: "Case file" }} />
      <Stack.Screen name="files/[id]/edit" options={{ title: "Edit the matter" }} />
      <Stack.Screen name="files/[id]/hearing" options={{ title: "Add a hearing" }} />
      <Stack.Screen name="files/[id]/fee" options={{ title: "Record a fee" }} />
      <Stack.Screen name="contact/index" options={{ title: "Calls & enquiries" }} />
      <Stack.Screen name="contact/new" options={{ title: "Log a contact" }} />
      <Stack.Screen name="money/index" options={{ title: "Money" }} />
      <Stack.Screen name="money/new" options={{ title: "New entry" }} />
      <Stack.Screen name="clients/index" options={{ title: "Clients" }} />
      <Stack.Screen name="clients/new" options={{ title: "New client" }} />
      <Stack.Screen name="clients/[id]" options={{ title: "Client" }} />
    </Stack>
  );
}
