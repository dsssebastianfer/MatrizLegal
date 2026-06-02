import { createDataClient } from '@/lib/supabase/data'
import { getSessionEmail } from '@/lib/session'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const db = createDataClient()
  const { searchParams } = new URL(request.url)
  const areas = searchParams.get('areas')
  const estados = searchParams.get('estados')
  const vigencias = searchParams.get('vigencias')
  const periodicidad = searchParams.get('periodicidad')
  const q = searchParams.get('q')

  let query = db.from('laws').select('*').order('item', { ascending: true, nullsFirst: false })

  if (areas) {
    const cats = areas.split(',').map(a => a.trim()).filter(Boolean)
    if (cats.length > 0 && cats.length < 3)
      query = query.or(cats.map(c => `area.ilike.%${c}%`).join(','))
  }
  if (estados) {
    const list = estados.split(',').filter(e => e !== 'pendiente')
    if (list.length > 0) query = query.in('estado_cumplimiento', list)
  }
  if (vigencias) {
    const vigs = vigencias.split(',')
    if (vigs.length === 1) {
      if (vigs[0] === 'no_vigente') query = query.eq('vigencia_estado', 'no_vigente')
      else query = query.neq('vigencia_estado', 'no_vigente')
    }
  }
  if (periodicidad) {
    const ps = periodicidad.split(',')
    if (ps.length === 1) query = query.eq('periodicidad', ps[0])
    else query = query.in('periodicidad', ps)
  }
  if (q) query = query.or(`codigo.ilike.%${q}%,descripcion.ilike.%${q}%,titular.ilike.%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const email = await getSessionEmail()
  if (!email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createDataClient()
  const body = await request.json()
  try { await db.rpc('set_app_user_email', { email }) } catch {}
  const { data, error } = await db.from('laws').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
