import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Invoice, money } from "../lib/invoice";
import { useInvoices } from "../lib/store";
import { colors, styles } from "./ui";
export function InvoiceRow({
  invoice,
  compact = false,
}: {
  invoice: Invoice;
  compact?: boolean;
}) {
  const { setDraft } = useInvoices();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Review ${invoice.vendor} ${invoice.number}`}
      onPress={() => {
        setDraft(JSON.parse(JSON.stringify(invoice)));
        router.push("/review");
      }}
      style={({ pressed }) => ({
        backgroundColor: colors.card,
        borderRadius: 10,
        padding: compact ? 14 : 18,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={styles.row}>
        <View style={{ flex: 1, gap: 7 }}>
          <Text style={{ ...styles.text, fontSize: compact ? 14 : 16 }}>
            {invoice.vendor}
          </Text>
          {!compact && (
            <Text style={styles.muted}>
              {invoice.number} · {invoice.date}
            </Text>
          )}
        </View>
        <Text
          selectable
          style={{ color: colors.text, fontVariant: ["tabular-nums"] }}
        >
          {money(invoice.total, invoice.currency)}
        </Text>
      </View>
      {!compact && (
        <Text style={{ color: colors.green, fontSize: 12, marginTop: 12 }}>
          {invoice.company} ·{" "}
          {invoice.status === "saved" ? "Saved" : "Needs review"}
        </Text>
      )}
    </Pressable>
  );
}
