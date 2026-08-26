import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from '@/lib/query-client';

let supabaseInstance: SupabaseClient | null = null;
let initPromise: Promise<SupabaseClient> | null = null;

async function fetchConfig(): Promise<{ url: string; anonKey: string }> {
  const baseUrl = getApiUrl();
  const res = await fetch(new URL('/api/config/supabase', baseUrl).toString());
  if (!res.ok) throw new Error('Failed to fetch Supabase config');
  return res.json();
}

export async function getSupabase(): Promise<SupabaseClient> {
  if (supabaseInstance) return supabaseInstance;
  if (initPromise) return initPromise;

  initPromise = fetchConfig().then(({ url, anonKey }) => {
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    return supabaseInstance;
  });

  return initPromise;
}
