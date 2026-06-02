const PERIODICIDAD_DIAS: Record<string, number> = {
  mensual: 30,
  bianual: 60,
  trimestral: 90,
  semestral: 180,
  anual: 365,
}

export function diasDesdeEval(fechaUltimaEval: string | null): number | null {
  if (!fechaUltimaEval) return null
  const last = new Date(fechaUltimaEval)
  const now = new Date()
  return Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
}

export function isOverdue(periodicidad: string | null, fechaUltimaEval: string | null): boolean {
  if (!periodicidad || !fechaUltimaEval) return false
  const key = periodicidad.toLowerCase().trim()
  const dias = PERIODICIDAD_DIAS[key]
  if (!dias) return false
  const diff = diasDesdeEval(fechaUltimaEval)
  return diff !== null && diff > dias
}

export function labelPeriodicidad(periodicidad: string | null): string {
  if (!periodicidad) return ''
  const key = periodicidad.toLowerCase().trim()
  const dias = PERIODICIDAD_DIAS[key]
  return dias ? `cada ${dias} días` : periodicidad
}
