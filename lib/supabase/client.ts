import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  if (!url || !key) {
    // En build time sin env vars, retorna cliente stub
    return createBrowserClient('http://localhost:54321', 'placeholder-key')
  }
  return createBrowserClient(url, key)
}
