import { createClient } from '@supabase/supabase-js'

// Cliente con service role — bypasses RLS, usar solo en server-side
// Sin tipado estricto para permitir tablas dinámicas (allowed_emails, RPCs, etc.)
export function createDataClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
