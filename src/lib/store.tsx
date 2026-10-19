import {
  createContext,
  PropsWithChildren,
  use,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { AppState } from "react-native";
import { Session } from "@supabase/supabase-js";
import { Invoice, sampleInvoices } from "./invoice";
import { supabase } from "./supabase";
import { listInvoices, saveInvoice } from "./repository";
const Context = createContext<{
  invoices: Invoice[];
  draft: Invoice;
  setDraft: (i: Invoice) => void;
  save: (i: Invoice) => Promise<void>;
  demo: boolean;
  setDemo: (d: boolean) => void;
  session: Session | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
}>(null!);
export function InvoiceProvider({ children }: PropsWithChildren) {
  const [invoices, setInvoices] = useState(sampleInvoices);
  const [draft, setDraft] = useState<Invoice>(
    JSON.parse(JSON.stringify(sampleInvoices[0])),
  );
  const [demo, setDemo] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    setError("");
    if (demo) {
      setInvoices(JSON.parse(JSON.stringify(sampleInvoices)));
      setLoading(false);
      return;
    }
    setInvoices([]);
    if (!session) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await listInvoices();
      if (request === generation.current) setInvoices(rows);
    } catch (e) {
      if (request === generation.current)
        setError(e instanceof Error ? e.message : "Unable to load invoices.");
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [demo, session]);
  // Fetching external data needs loading/error state around the request.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (!supabase) return;
    void supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) =>
      setSession(s),
    );
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") supabase!.auth.startAutoRefresh();
      else supabase!.auth.stopAutoRefresh();
    });
    return () => {
      data.subscription.unsubscribe();
      subscription.remove();
    };
  }, []);
  async function save(i: Invoice) {
    if (demo) {
      if (!i.id.startsWith("demo-"))
        throw new Error(
          "Switch to your live workspace before saving a real scan.",
        );
    } else {
      if (i.id.startsWith("demo-"))
        throw new Error(
          "Sample invoices cannot be saved to your live workspace.",
        );
      await saveInvoice(i);
    }
    setInvoices((prev) => [
      { ...i, status: "saved" },
      ...prev.filter((x) => x.id !== i.id),
    ]);
  }
  function changeMode(value: boolean) {
    ++generation.current;
    setDemo(value);
    setDraft(JSON.parse(JSON.stringify(sampleInvoices[0])));
    setInvoices(value ? JSON.parse(JSON.stringify(sampleInvoices)) : []);
  }
  return (
    <Context
      value={{
        invoices,
        draft,
        setDraft,
        save,
        demo,
        setDemo: changeMode,
        session,
        loading,
        error,
        refresh,
      }}
    >
      {children}
    </Context>
  );
}
export const useInvoices = () => use(Context);
