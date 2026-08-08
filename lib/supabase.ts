import { createClient } from '@supabase/supabase-js';

function safeUrl(raw: string | undefined): string {
  if (!raw) return 'https://placeholder.supabase.co';
  try { new URL(raw); return raw; } catch { return 'https://placeholder.supabase.co'; }
}

const SUPABASE_URL = safeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = (() => {
  try {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch {
    return createClient('https://placeholder.supabase.co', 'placeholder-anon-key');
  }
})();

export function createServiceClient() {
  const url = safeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada');
  return createClient(url, serviceKey, {
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
