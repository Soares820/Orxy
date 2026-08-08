import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Singleton — criado apenas quando realmente usado (não durante o build)
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
    _client = createClient(url, key);
  }
  return _client;
}

// Proxy transparente — importar { supabase } não chama createClient no build
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = new Proxy({} as SupabaseClient, {
  get(_t, prop: string | symbol) {
    return getClient()[prop as keyof SupabaseClient];
  },
});

export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
