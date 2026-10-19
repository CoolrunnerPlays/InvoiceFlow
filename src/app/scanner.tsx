import { useState } from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { ScanLine } from "lucide-react-native";
import { Screen, Button, Notice, colors, styles } from "../components/ui";
import { useInvoices } from "../lib/store";
import { sampleInvoices } from "../lib/invoice";
import { scanDocuments } from "../lib/scan";
import { extractPages } from "../lib/repository";
export default function Scanner() {
  const { setDraft, demo, session } = useInvoices();
  const [pages, setPages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function scan() {
    setBusy(true);
    setError("");
    try {
      const added = await scanDocuments();
      if (pages.length + added.length > 10)
        throw new Error(
          "Maximum 10 pages. Remove pages or scan a smaller batch.",
        );
      setPages([...pages, ...added]);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Camera unavailable. Check camera permission in iPhone Settings.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function extract() {
    setBusy(true);
    setError("");
    try {
      setDraft(await extractPages(pages));
      router.replace("/review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extraction failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Text style={styles.title}>A clear scan. Every detail.</Text>
      <Notice text="Place your invoice on a flat surface with good lighting. Add all pages before reviewing." />
      {!pages.length && (
        <View
          style={{
            height: 280,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
            backgroundColor: colors.card,
          }}
        >
          <ScanLine size={72} color={colors.blue} />
          <Text style={styles.section}>Ready to scan</Text>
          <Text style={styles.muted}>Automatic edges · Multiple pages</Text>
        </View>
      )}
      {pages.map((uri, n) => (
        <View key={uri} style={{ gap: 10 }}>
          <Image
            source={uri}
            style={{ height: 250, borderRadius: 12 }}
            contentFit="contain"
          />
          <Button
            secondary
            title={`Remove page ${n + 1}`}
            disabled={busy}
            onPress={() => setPages(pages.filter((_, i) => i !== n))}
          />
        </View>
      ))}
      <Button
        title={
          busy
            ? "Working…"
            : pages.length
              ? "Scan more pages"
              : "Open document camera"
        }
        disabled={busy}
        onPress={scan}
      />
      {!!pages.length && (
        <>
          <Notice text="Extract sends these pages to your private Supabase storage and Anthropic for invoice recognition." />
          <Button
            title={`Extract ${pages.length} ${pages.length === 1 ? "page" : "pages"}`}
            onPress={extract}
            disabled={busy || demo || !session}
          />
          {(demo || !session) && (
            <Notice text="Sign in and switch to your live workspace in Settings to extract real invoices." />
          )}
        </>
      )}
      {demo && (
        <Button
          title="Try sample invoice"
          secondary
          disabled={busy}
          onPress={() => {
            setDraft({
              ...JSON.parse(JSON.stringify(sampleInvoices[0])),
              status: "review",
            });
            router.replace("/review");
          }}
        />
      )}
      {!!error && <Notice text={error} error />}
    </Screen>
  );
}
