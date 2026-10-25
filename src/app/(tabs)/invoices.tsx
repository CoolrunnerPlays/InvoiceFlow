import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { Search } from "lucide-react-native";
import { Screen, Button, Notice, styles, colors } from "../../components/ui";
import { InvoiceRow } from "../../components/invoice-row";
import { useInvoices } from "../../lib/store";
export default function Invoices() {
  const [query, setQuery] = useState("");
  const { invoices, loading, error, refresh } = useInvoices();
  const filtered = invoices.filter((i) =>
    `${i.vendor} ${i.number} ${i.company}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <Screen>
      <Text style={styles.title}>Your invoices</Text>
      <View
        style={{
          ...styles.card,
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 5,
        }}
      >
        <Search color={colors.muted} size={20} />
        <TextInput
          accessibilityLabel="Search invoices"
          placeholder="Search vendor, number or company"
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          style={{ ...styles.input, flex: 1, fontSize: 14 }}
        />
      </View>
      <Notice
        text={
          loading
            ? "Loading invoices…"
            : `${filtered.length} invoice${filtered.length === 1 ? "" : "s"}`
        }
      />
      {!!error && <Notice text={error} error />}
      <Button
        title="Refresh invoices"
        secondary
        onPress={() => void refresh()}
        disabled={loading}
      />
      {filtered.map((i) => (
        <InvoiceRow key={i.id} invoice={i} />
      ))}
      {!filtered.length && <Notice text="No invoices match your search." />}
    </Screen>
  );
}
