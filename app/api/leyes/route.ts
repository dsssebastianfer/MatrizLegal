import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const areas = searchParams.get('areas')
  const estado = searchParams.get('estado')
  const periodicidad = searchParams.get('periodicidad')
  const q = searchParams.get('q')

  let query = supabase.from('laws').select('*').order('item', { ascending: true, nullsFirst: false })

  if (areas) {
    const cats = areas.split(',').map(a => a.trim()).filter(Boolean)
    if (cats.length > 0 && cats.length < 3)
      query = query.or(cats.map(c => `area.ilike.%${c}%`).join(','))
  }
  if (estado) query = query.eq('estado_cumplimiento', estado)
  if (periodicidad) query = query.eq('periodicidad', periodicidad)
  if (q) query = query.or(`codigo.ilike.%${q}%,descripcion.ilike.%${q}%,titular.ilike.%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  try { await supabase.rpc('set_app_user_email', { email: user.email ?? '' }) } catch {}

  const { data, error } = await supabase.from('laws').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
