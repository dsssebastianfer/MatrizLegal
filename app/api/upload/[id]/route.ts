import { createDataClient } from '@/lib/supabase/data'
import { getSessionEmail } from '@/lib/session'
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params
  const email = await getSessionEmail()
  if (!email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Sin archivo' }, { status: 400 })

  const ext = (file.name.split('.').pop() ?? '').toLowerCase()
  if (!['pdf', 'doc', 'docx'].includes(ext))
    return NextResponse.json({ error: 'Solo se permiten PDF y Word (.pdf, .doc, .docx)' }, { status: 400 })

  const db = createDataClient()
  const storagePath = `leyes/${id}/${Date.now()}.${ext}`
  const bytes = await file.arrayBuffer()
  const { error: uploadError } = await db.storage
    .from('documentos').upload(storagePath, bytes, { contentType: file.type || 'application/octet-stream', upsert: true })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = db.storage.from('documentos').getPublicUrl(storagePath)

  const { data, error } = await db.from('documents').insert({
    law_id: id,
    nombre: file.name,
    url: publicUrl,
    storage_path: storagePath,
    uploaded_by: email,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
