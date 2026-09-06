import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const supabase = createClient(
  "https://jstojewashwoswsskwjk.supabase.co",
  "sb_publishable_-nyuPas2pnqOcHMNJUCHog_xUlJbtuU",
  { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } }
);
