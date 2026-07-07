import { createDataClient } from '@/lib/supabase/data'
import { getSessionEmail } from '@/lib/session'
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: Promise<{ docId: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { docId } = await params
  const email = await getSessionEmail()
  if (!email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = createDataClient()
  const { data: doc } = await db.from('documents').select('storage_path').eq('id', docId).single()
  const path = (doc as { storage_path: string } | null)?.storage_path
  if (path) await db.storage.from('documentos').remove([path])

  const { error } = await db.from('documents').delete().eq('id', docId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
