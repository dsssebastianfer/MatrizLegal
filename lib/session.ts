import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const SECRET = process.env.SESSION_SECRET ?? 'dev-secret-change-in-production'

async function getKey() {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export async function createSessionToken(email: string): Promise<string> {
  const key = await getKey()
  const data = new TextEncoder().encode(email)
  const sig = await crypto.subtle.sign('HMAC', key, data)
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
  return `${btoa(email)}.${sigB64}`
}

async function verifyToken(token: string): Promise<string | null> {
  try {
    const [emailB64, sigB64] = token.split('.')
    if (!emailB64 || !sigB64) return null
    const email = atob(emailB64)
    const expected = await createSessionToken(email)
    return token === expected ? email : null
  } catch {
    return null
  }
}

export async function getSessionEmail(): Promise<string | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('ml_session')?.value
  if (!token) return null
  return verifyToken(token)
}

export async function getSessionEmailFromRequest(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get('ml_session')?.value
  if (!token) return null
  return verifyToken(token)
}

export const SESSION_COOKIE = 'ml_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30  // 30 días
