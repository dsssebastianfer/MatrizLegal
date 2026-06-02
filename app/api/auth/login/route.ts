import { createDataClient } from '@/lib/supabase/data'
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/session'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { email } = await request.json()
  if (!email?.trim()) return NextResponse.json({ error: 'Email requerido' }, { status: 400 })

  const normalizedEmail = email.trim().toLowerCase()
  const db = createDataClient()

  const { data } = await db
    .from('allowed_emails')
    .select('email, nombre')
    .eq('email', normalizedEmail)
    .single()

  if (!data) {
    return NextResponse.json({ error: 'not_allowed' }, { status: 403 })
  }

  const token = await createSessionToken(normalizedEmail)
  const res = NextResponse.json({ ok: true, nombre: data.nombre })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
  return res
}
