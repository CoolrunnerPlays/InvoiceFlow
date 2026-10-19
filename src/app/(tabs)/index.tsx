import { Text, View, Pressable } from "react-native";
import { router } from "expo-router";
import { Camera, CircleCheck, ArrowRight } from "lucide-react-native";
import {
  Screen,
  Card,
  Button,
  Notice,
  colors,
  styles,
} from "../../components/ui";
import { InvoiceRow } from "../../components/invoice-row";
import { useInvoices } from "../../lib/store";
export default function Dashboard() {
  const { invoices, demo, error, loading } = useInvoices();
  const month = demo
    ? "2026-10"
    : new Date().toLocaleDateString("en-CA").slice(0, 7);
  const monthly = invoices.filter((i) => i.date.startsWith(month));
  return (
    <Screen>
      <Text style={styles.muted}>
        {demo
          ? "October 2026"
          : new Date().toLocaleDateString("en-CA", {
              month: "long",
              year: "numeric",
            })}
      </Text>
      <Text style={styles.title}>Overview</Text>
      {loading && <Notice text="Loading invoices…" />}
      {!!error && <Notice text={error} error />}
      <Card>
        <Text style={styles.muted}>Invoices this month</Text>
        <Text
          selectable
          style={{
            color: colors.text,
            fontSize: 38,
            fontWeight: "600",
            fontVariant: ["tabular-nums"],
          }}
        >
          {monthly.length.toLocaleString()}
        </Text>
        <View
          style={{ ...styles.row, justifyContent: "flex-start", marginTop: 7 }}
        >
          <CircleCheck size={17} color={colors.green} />
          <Text style={{ color: colors.green }}>
            {monthly.filter((i) => i.status === "saved").length} processed
          </Text>
        </View>
      </Card>
      <Button title="Scan Invoice" onPress={() => router.push("/scanner")}>
        <Camera color="white" size={29} />
      </Button>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/invoices")}
        style={{ ...styles.row, marginTop: 10 }}
      >
        <Text style={styles.section}>Recent invoices</Text>
        <ArrowRight color={colors.text} size={20} />
      </Pressable>
      <View style={{ gap: 14 }}>
        {invoices.slice(0, 3).map((i) => (
          <InvoiceRow key={i.id} invoice={i} compact />
        ))}
      </View>
      {demo && (
        <Notice text="Sample workspace · Explore with realistic demo invoices" />
      )}
    </Screen>
  );
}
