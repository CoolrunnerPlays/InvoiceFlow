import { Tabs } from "expo-router";
import { House, Files, ChartNoAxesColumn, Settings } from "lucide-react-native";
import { colors } from "../../components/ui";
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleAlign: "center",
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: colors.bg, borderTopWidth: 0 },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.muted,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "InvoiceFlow",
          tabBarAccessibilityLabel: "Dashboard",
          tabBarIcon: ({ color }) => <House color={color} size={23} />,
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: "Invoices",
          tabBarAccessibilityLabel: "Invoices",
          tabBarIcon: ({ color }) => <Files color={color} size={23} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          tabBarAccessibilityLabel: "Reports",
          tabBarIcon: ({ color }) => (
            <ChartNoAxesColumn color={color} size={23} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarAccessibilityLabel: "Settings",
          tabBarIcon: ({ color }) => <Settings color={color} size={23} />,
        }}
      />
    </Tabs>
  );
}
