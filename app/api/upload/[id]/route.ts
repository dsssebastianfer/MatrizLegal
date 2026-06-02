import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Sin archivo' }, { status: 400 })

  const allowedTypes = ['application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  if (!allowedTypes.includes(file.type))
    return NextResponse.json({ error: 'Solo se permiten PDF y Word' }, { status: 400 })

  const serviceClient = await createServiceClient()
  const ext = file.name.split('.').pop()
  const storagePath = `leyes/${id}/${Date.now()}.${ext}`
  const bytes = await file.arrayBuffer()

  const { error: uploadError } = await serviceClient.storage
    .from('documentos').upload(storagePath, bytes, { contentType: file.type, upsert: true })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = serviceClient.storage.from('documentos').getPublicUrl(storagePath)

  try { await supabase.rpc('set_app_user_email', { email: user.email ?? '' }) } catch {}
  const { error } = await supabase.from('laws')
    .update({ documento_nombre: file.name, documento_url: publicUrl }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ url: publicUrl, nombre: file.name })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: law } = await supabase.from('laws').select('documento_url').eq('id', id).single()
  const docUrl = (law as { documento_url: string | null } | null)?.documento_url
  if (docUrl) {
    const serviceClient = await createServiceClient()
    const storagePath = new URL(docUrl).pathname.split('/documentos/')[1]
    if (storagePath) await serviceClient.storage.from('documentos').remove([storagePath])
  }

  try { await supabase.rpc('set_app_user_email', { email: user.email ?? '' }) } catch {}
  await supabase.from('laws').update({ documento_nombre: null, documento_url: null }).eq('id', id)
  return NextResponse.json({ ok: true })
}
