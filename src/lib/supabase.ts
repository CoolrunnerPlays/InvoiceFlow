import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
// Web uses localStorage so the home-screen app stays signed in between launches.
const storage = {
  getItem: (name: string) =>
    process.env.EXPO_OS === "web"
      ? Promise.resolve(
          typeof localStorage === "undefined"
            ? null
            : localStorage.getItem(name),
        )
      : SecureStore.getItemAsync(name),
  setItem: (name: string, value: string) =>
    process.env.EXPO_OS === "web"
      ? Promise.resolve(localStorage.setItem(name, value))
      : SecureStore.setItemAsync(name, value),
  removeItem: (name: string) =>
    process.env.EXPO_OS === "web"
      ? Promise.resolve(localStorage.removeItem(name))
      : SecureStore.deleteItemAsync(name),
};
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          storage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;
