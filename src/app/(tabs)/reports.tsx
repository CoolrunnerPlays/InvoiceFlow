import { useState } from "react";
import { Text, View, Pressable } from "react-native";
import { Download, FileSpreadsheet } from "lucide-react-native";
import {
  Screen,
  Card,
  Button,
  Notice,
  colors,
  styles,
} from "../../components/ui";
import { useInvoices } from "../../lib/store";
import { money } from "../../lib/invoice";
import { exportInvoices } from "../../lib/export";
export default function Reports() {
  const { invoices } = useInvoices();
  const [company, setCompany] = useState("All companies");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const filtered = invoices.filter(
    (i) => company === "All companies" || i.company === company,
  );
  const totals = Object.entries(
    filtered.reduce<Record<string, number>>(
      (s, i) => ({ ...s, [i.currency]: (s[i.currency] ?? 0) + i.total }),
      {},
    ),
  );
  async function download() {
    setBusy(true);
    setMessage("");
    try {
      await exportInvoices(filtered);
      setMessage(
        "Workbook prepared. Save or share it with your preferred app.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Text style={styles.title}>Reports & exports</Text>
      <Notice text="Keep your books in order. Every invoice, every line item." />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {["All companies", ...new Set(invoices.map((i) => i.company))].map(
          (c) => (
            <Pressable
              key={c}
              accessibilityRole="button"
              accessibilityState={{ selected: c === company }}
              onPress={() => setCompany(c)}
              style={{
                padding: 12,
                borderRadius: 10,
                backgroundColor: c === company ? colors.blue : colors.card,
              }}
            >
              <Text style={{ color: colors.text }}>{c}</Text>
            </Pressable>
          ),
        )}
      </View>
      <Card>
        <Text style={styles.muted}>Total invoice value</Text>
        {totals.map(([currency, total]) => (
          <Text
            key={currency}
            selectable
            style={{ ...styles.title, fontSize: 34 }}
          >
            {money(total, currency)}{" "}
            <Text style={styles.muted}>{currency}</Text>
          </Text>
        ))}
        <Text style={styles.muted}>
          {filtered.length} invoices ·{" "}
          {filtered.reduce((s, i) => s + i.items.length, 0)} line items
        </Text>
      </Card>
      <Card>
        <FileSpreadsheet size={30} color={colors.green} />
        <Text style={styles.section}>Ready for your spreadsheet</Text>
        <Notice text="An Excel workbook with invoice totals and a separate sheet containing every item, quantity, unit price and amount." />
      </Card>
      <Button
        title={busy ? "Preparing workbook…" : "Export Excel workbook"}
        disabled={busy || !filtered.length}
        onPress={download}
      >
        <Download size={22} color="white" />
      </Button>
      {!!message && <Notice text={message} />}
    </Screen>
  );
}
