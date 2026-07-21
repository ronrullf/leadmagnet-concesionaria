import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL;
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

let anon: SupabaseClient | null = null;
let admin: SupabaseClient | null = null;

/** Cliente de solo lectura (respeta RLS). Para el render público. */
export function supabaseAnon(): SupabaseClient {
  if (!anon) anon = createClient(url, anonKey, { auth: { persistSession: false } });
  return anon;
}

/** Cliente con service_role (salta RLS). Solo en servidor: admin, tracking, cache BCV. */
export function supabaseAdmin(): SupabaseClient {
  if (!admin) admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  return admin;
}
