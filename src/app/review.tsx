import { useState } from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { CircleCheck } from "lucide-react-native";
import {
  Screen,
  Card,
  Field,
  Button,
  Notice,
  colors,
  styles,
} from "../components/ui";
import { useInvoices } from "../lib/store";
import { money, validateInvoice } from "../lib/invoice";
export default function Review() {
  const { draft, setDraft, save } = useInvoices();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const errors = validateInvoice(draft);
  async function confirm() {
    setBusy(true);
    try {
      await save(draft);
      router.replace("/invoices");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to save invoice.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      {draft.pages.length ? (
        draft.pages.map((uri, n) => (
          <View key={uri}>
            <Text style={styles.muted}>Original · Page {n + 1}</Text>
            <Image
              source={uri}
              contentFit="contain"
              style={{
                height: 420,
                borderRadius: 12,
                backgroundColor: colors.paper,
              }}
            />
          </View>
        ))
      ) : (
        <View
          style={{
            backgroundColor: colors.paper,
            borderRadius: 13,
            padding: 20,
            gap: 24,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "600", color: colors.bg }}>
            {draft.vendor}
          </Text>
          <Text style={{ color: "#697386", fontSize: 13 }}>
            Invoice {draft.number} · Sample preview
          </Text>
          <View style={{ height: 1, backgroundColor: "#D5D8DC" }} />
          {draft.items.map((item, n) => (
            <View key={n} style={styles.row}>
              <Text style={{ color: "#374151", flex: 1 }}>
                {item.description} × {item.quantity}
              </Text>
              <Text style={{ color: "#374151" }}>
                {money(item.amount, draft.currency)}
              </Text>
            </View>
          ))}
          <View
            style={{ height: 1, backgroundColor: "#D5D8DC", marginTop: 16 }}
          />
          <View style={styles.row}>
            <Text>Tax</Text>
            <Text>{money(draft.tax, draft.currency)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={{ fontSize: 19, fontWeight: "600" }}>Total</Text>
            <Text style={{ fontSize: 19, fontWeight: "600" }}>
              {money(draft.total, draft.currency)}
            </Text>
          </View>
        </View>
      )}
      {!errors.length ? (
        <View style={{ ...styles.row, justifyContent: "flex-start" }}>
          <CircleCheck size={18} color={colors.green} />
          <Text style={{ color: colors.green }}>Totals verified</Text>
        </View>
      ) : (
        errors.map((error, n) => <Notice key={n} text={error} error />)
      )}
      <Field
        label="Company"
        value={draft.company}
        onChangeText={(company) => setDraft({ ...draft, company })}
      />
      <Card>
        <Text style={styles.muted}>Extracted products</Text>
        <Text style={styles.text}>{draft.items.length} line items</Text>
      </Card>
      <Text style={styles.section}>Invoice details</Text>
      {draft.extractionWarnings?.map((warning, n) => (
        <Notice key={n} text={warning} error />
      ))}
      {!!draft.extractionWarnings?.length && (
        <Button
          title={
            draft.warningsReviewed
              ? "Warnings acknowledged"
              : "I reviewed all extraction warnings"
          }
          secondary
          onPress={() => setDraft({ ...draft, warningsReviewed: true })}
        />
      )}
      {(["vendor", "number", "date", "currency"] as const).map((key) => (
        <Field
          key={key}
          label={key[0].toUpperCase() + key.slice(1)}
          value={draft[key]}
          onChangeText={(value) => setDraft({ ...draft, [key]: value })}
        />
      ))}
      <Text style={styles.section}>All line items</Text>
      {draft.items.map((item, n) => (
        <Card key={n}>
          <Text style={styles.muted}>Item {n + 1}</Text>
          {(["description", "quantity", "unitPrice", "amount"] as const).map(
            (key) => (
              <Field
                key={key}
                label={
                  key === "unitPrice"
                    ? "Unit price"
                    : key[0].toUpperCase() + key.slice(1)
                }
                value={
                  typeof item[key] === "number" && !Number.isFinite(item[key])
                    ? ""
                    : String(item[key])
                }
                numeric={key !== "description"}
                onChangeText={(value) =>
                  setDraft({
                    ...draft,
                    items: draft.items.map((x, index) =>
                      index === n
                        ? {
                            ...x,
                            [key]:
                              key === "description"
                                ? value
                                : value.trim() === ""
                                  ? NaN
                                  : Number(value),
                          }
                        : x,
                    ),
                  })
                }
              />
            ),
          )}
          <Button
            title={`Remove item ${n + 1}`}
            secondary
            onPress={() =>
              setDraft({
                ...draft,
                items: draft.items.filter((_, i) => i !== n),
              })
            }
          />
        </Card>
      ))}
      <Button
        title="Add line item"
        secondary
        onPress={() =>
          setDraft({
            ...draft,
            items: [
              ...draft.items,
              { description: "", quantity: 1, unitPrice: 0, amount: 0 },
            ],
          })
        }
      />
      {(["subtotal", "tax", "total"] as const).map((key) => (
        <Field
          key={key}
          label={key[0].toUpperCase() + key.slice(1)}
          value={Number.isFinite(draft[key]) ? String(draft[key]) : ""}
          numeric
          onChangeText={(value) =>
            setDraft({
              ...draft,
              [key]: value.trim() === "" ? NaN : Number(value),
            })
          }
        />
      ))}
      <Notice text="Compare every field with the original. Totals verification checks arithmetic, not the accuracy of extracted text." />
      {!!message && <Notice text={message} error />}
      <Button
        title={busy ? "Saving…" : "Confirm & Save"}
        disabled={busy || errors.length > 0}
        onPress={confirm}
      />
    </Screen>
  );
}
