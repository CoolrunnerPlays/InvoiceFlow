import { useState } from "react";
import { Text } from "react-native";
import {
  Screen,
  Card,
  Notice,
  Button,
  Field,
  styles,
} from "../../components/ui";
import { useInvoices } from "../../lib/store";
import { supabase } from "../../lib/supabase";
export default function Settings() {
  const { demo, setDemo, session } = useInvoices();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function auth(signup = false) {
    setBusy(true);
    setMessage("");
    try {
      if (!supabase)
        throw new Error("Supabase environment variables are missing.");
      const { error } = signup
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setPassword("");
      if (!signup) setDemo(false);
      setMessage(
        signup
          ? "Check your email to confirm your account, then sign in."
          : "Signed in. Showing your live workspace.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Text style={styles.title}>Your workspace</Text>
      <Card>
        <Text style={styles.section}>
          {demo ? "Sample workspace" : "Private workspace"}
        </Text>
        <Notice
          text={
            demo
              ? "Explore sample invoices. Edits last for this session."
              : "Your invoices are stored privately in Supabase."
          }
        />
        <Button
          title={demo ? "Use live workspace" : "Use sample workspace"}
          secondary
          onPress={() => setDemo(!demo)}
          disabled={demo && !session}
        />
      </Card>
      {session ? (
        <>
          <Notice text={`Signed in as ${session.user.email}`} />
          <Button
            title="Sign out"
            secondary
            onPress={async () => {
              const result = await supabase!.auth.signOut();
              if (result.error) setMessage(result.error.message);
              else setDemo(true);
            }}
          />
        </>
      ) : (
        <>
          <Text style={styles.section}>Connect your account</Text>
          <Field label="Email" value={email} onChangeText={setEmail} />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secure
          />
          <Button
            title={busy ? "Please wait…" : "Sign in"}
            onPress={() => auth()}
            disabled={busy || !email || !password}
          />
          <Button
            title="Create account"
            secondary
            onPress={() => auth(true)}
            disabled={busy || !email || password.length < 8}
          />
          <Notice text="New accounts require an email confirmation. Use at least 8 characters for your password." />
        </>
      )}
      {!!message && <Notice text={message} />}
      <Notice text="Review all extracted values before saving. Original scans are private; preview links expire after one hour. Refresh invoice history to renew them." />
    </Screen>
  );
}
