import { createDataClient as createClient } from '@/lib/supabase/data'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import LawForm from '@/components/LawForm'
import type { Law } from '@/lib/types'

type Params = { params: Promise<{ id: string }> }

export default async function EditarLeyPage({ params }: Params) {
  const { id } = await params
  const supabase = createClient()
  const { data, error } = await supabase.from('laws').select('*').eq('id', id).single()
  if (error || !data) notFound()

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/" className="hover:text-blue-600">Leyes</Link>
        <span>/</span>
        <Link href={`/leyes/${id}`} className="hover:text-blue-600">{(data as unknown as Law).codigo}</Link>
        <span>/</span>
        <span className="text-slate-800 font-medium">Editar</span>
      </div>
      <h1 className="text-2xl font-bold text-slate-800">Editar: {(data as unknown as Law).codigo}</h1>
      <LawForm initial={{
        item: (data as unknown as Law).item ?? undefined,
        codigo: (data as unknown as Law).codigo,
        titular: (data as unknown as Law).titular ?? '',
        anio_publicacion: (data as unknown as Law).anio_publicacion ?? '',
        descripcion: (data as unknown as Law).descripcion ?? '',
        mecanismo_evaluacion: (data as unknown as Law).mecanismo_evaluacion ?? '',
        periodicidad: (data as unknown as Law).periodicidad ?? '',
        aplicacion: (data as unknown as Law).aplicacion ?? '',
        area: (data as unknown as Law).area ?? '',
      }} lawId={id} />
    </div>
  )
}
