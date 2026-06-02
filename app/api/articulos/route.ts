import { createDataClient } from '@/lib/supabase/data'
import { getSessionEmail } from '@/lib/session'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const email = await getSessionEmail()
  if (!email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createDataClient()
  const body = await request.json()
  try { await db.rpc('set_app_user_email', { email }) } catch {}
  const { data, error } = await db.from('articles').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
