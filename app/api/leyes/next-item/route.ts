import { createDataClient as createClient } from '@/lib/supabase/data'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data } = await supabase.from('laws').select('item').order('item', { ascending: false }).limit(1)
  const maxItem = (data?.[0] as { item: number | null } | undefined)?.item ?? 0
  return NextResponse.json({ nextItem: (maxItem ?? 0) + 1 })
}
