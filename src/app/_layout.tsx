import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { InvoiceProvider } from "../lib/store";
import { colors } from "../components/ui";
export default function Layout() {
  return (
    <InvoiceProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
          headerTitleAlign: "center",
          headerBackButtonDisplayMode: "minimal",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="scanner"
          options={{ title: "Scan invoice", presentation: "modal" }}
        />
        <Stack.Screen name="review" options={{ title: "Review extraction" }} />
      </Stack>
    </InvoiceProvider>
  );
}
