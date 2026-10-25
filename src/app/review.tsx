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
import {
  checkTotals,
  currentWarnings,
  LineKind,
  money,
  parseAmount,
  validateInvoice,
} from "../lib/invoice";
const kinds: LineKind[] = ["item", "discount", "return"];
const kindLabel = { item: "Item", discount: "Discount", return: "Return" };
export default function Review() {
  const { draft, setDraft, save, remove } = useInvoices();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const errors = validateInvoice(draft);
  const totalsOk = !checkTotals(draft).length;
  const warnings = currentWarnings(draft);
  const acknowledged = warnings.every((w) =>
    draft.acknowledgedWarnings?.includes(w),
  );
  async function deleteDraft() {
    if (!confirmDelete) return setConfirmDelete(true);
    setBusy(true);
    try {
      await remove(draft);
      router.replace("/invoices");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to delete invoice.");
      setBusy(false);
    }
  }
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
      {totalsOk && (
        <View style={{ ...styles.row, justifyContent: "flex-start" }}>
          <CircleCheck size={18} color={colors.green} />
          <Text style={{ color: colors.green }}>Totals verified</Text>
        </View>
      )}
      {errors.map((error, n) => (
        <Notice key={n} text={error} error />
      ))}
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
      {!!warnings.length && <Text style={styles.section}>Review notes</Text>}
      {warnings.map((warning, n) => (
        <Notice
          key={n}
          text={warning}
          error={!draft.acknowledgedWarnings?.includes(warning)}
        />
      ))}
      {!!warnings.length && (
        <Button
          title={
            acknowledged
              ? `Acknowledged ${draft.warningsReviewedAt?.slice(0, 10) ?? ""}`
              : "I compared these notes with the original"
          }
          secondary
          disabled={acknowledged}
          onPress={() =>
            setDraft({
              ...draft,
              acknowledgedWarnings: warnings,
              warningsReviewedAt: new Date().toISOString(),
            })
          }
        />
      )}
      <Button
        title={`Document: ${draft.documentType === "credit_note" ? "Credit note" : "Invoice"}`}
        secondary
        onPress={() =>
          setDraft({
            ...draft,
            documentType:
              draft.documentType === "credit_note" ? "invoice" : "credit_note",
          })
        }
      />
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
          <Button
            title={`Type: ${kindLabel[item.kind ?? "item"]}`}
            secondary
            onPress={() =>
              setDraft({
                ...draft,
                items: draft.items.map((x, index) =>
                  index === n
                    ? {
                        ...x,
                        kind: kinds[
                          (kinds.indexOf(x.kind ?? "item") + 1) % kinds.length
                        ],
                      }
                    : x,
                ),
              })
            }
          />
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
                                : parseAmount(value),
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
              [key]: parseAmount(value),
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
      {draft.status === "saved" && (
        <>
          <Button
            title={confirmDelete ? "Tap again to delete" : "Delete invoice"}
            secondary
            disabled={busy}
            onPress={deleteDraft}
          />
          {confirmDelete && (
            <Notice text="The invoice is removed now; its scans are erased after 30 days." />
          )}
        </>
      )}
    </Screen>
  );
}
