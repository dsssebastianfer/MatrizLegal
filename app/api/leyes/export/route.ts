import { createDataClient } from '@/lib/supabase/data'
import { getSessionEmail } from '@/lib/session'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET() {
  const email = await getSessionEmail()
  if (!email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = createDataClient()
  const { data, error } = await db.from('laws').select('id, codigo, descripcion, area').order('item', { ascending: true, nullsFirst: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const worksheet = XLSX.utils.json_to_sheet(
    (data ?? []).map(l => ({ ID: l.id, Código: l.codigo, Descripción: l.descripcion, Área: l.area }))
  )
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leyes')
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="leyes.xlsx"',
    },
  })
}
