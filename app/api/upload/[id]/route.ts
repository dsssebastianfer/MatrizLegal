import { createDataClient } from '@/lib/supabase/data'
import { getSessionEmail } from '@/lib/session'
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string }> }

const MAX_SIZE = 7 * 1024 * 1024
const ALLOWED_EXT = ['pdf', 'doc', 'docx']

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params
  const email = await getSessionEmail()
  if (!email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { nombre, size } = await request.json()
  if (!nombre || typeof size !== 'number')
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })

  const ext = (nombre.split('.').pop() ?? '').toLowerCase()
  if (!ALLOWED_EXT.includes(ext))
    return NextResponse.json({ error: 'Solo se permiten PDF y Word (.pdf, .doc, .docx)' }, { status: 400 })
  if (size > MAX_SIZE)
    return NextResponse.json({ error: 'El archivo supera el máximo de 7MB' }, { status: 400 })

  const db = createDataClient()
  const storagePath = `leyes/${id}/${Date.now()}.${ext}`
  const { data, error } = await db.storage.from('documentos').createSignedUploadUrl(storagePath)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ token: data.token, path: data.path })
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params
  const email = await getSessionEmail()
  if (!email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { path, nombre } = await request.json()
  const db = createDataClient()
  const { data: { publicUrl } } = db.storage.from('documentos').getPublicUrl(path)

  const { data, error } = await db.from('documents').insert({
    law_id: id,
    nombre,
    url: publicUrl,
    storage_path: path,
    uploaded_by: email,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
