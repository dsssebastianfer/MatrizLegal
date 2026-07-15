interface ArticuloCumplimiento {
  cumple: boolean
  parcial: boolean
  na: boolean
}

export function calcularImplementacion(articulos: ArticuloCumplimiento[]): number | null {
  const aplicables = articulos.filter(a => !a.na)
  if (aplicables.length === 0) return null
  const puntos = aplicables.reduce((sum, a) => sum + (a.cumple ? 1 : a.parcial ? 0.5 : 0), 0)
  return Math.round((puntos / aplicables.length) * 100)
}

export function colorImplementacion(pct: number): string {
  if (pct === 100) return 'bg-green-100 text-green-800'
  if (pct >= 75) return 'bg-teal-100 text-teal-800'
  if (pct >= 50) return 'bg-yellow-100 text-yellow-800'
  if (pct >= 25) return 'bg-orange-100 text-orange-800'
  return 'bg-red-100 text-red-800'
}

const FRECUENCIA_DIAS: [string, number][] = [
  ['diario', 1], ['semanal', 7], ['quincenal', 15], ['mensual', 30],
  ['bimestral', 60], ['bianual', 60], ['trimestral', 90], ['cuatrimestral', 120],
  ['semestral', 180], ['anual', 365],
]

function frecuenciaEnTexto(texto: string): { label: string; dias: number } | null {
  const lower = texto.toLowerCase()
  let best: { label: string; dias: number } | null = null
  for (const [key, dias] of FRECUENCIA_DIAS) {
    if (new RegExp(`\\b${key}`, 'i').test(lower) && (!best || dias < best.dias)) {
      best = { label: key.charAt(0).toUpperCase() + key.slice(1), dias }
    }
  }
  return best
}

export function menorFrecuencia(frecuencias: (string | null | undefined)[]): string | null {
  let best: { label: string; dias: number } | null = null
  for (const f of frecuencias) {
    if (!f) continue
    const match = frecuenciaEnTexto(f)
    if (match && (!best || match.dias < best.dias)) best = match
  }
  return best?.label ?? null
}
