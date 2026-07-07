function parseArticulo(raw: string | null | undefined) {
  const s = raw ?? ''
  const match = s.match(/(\d+)(?:\s*-\s*([A-Za-z])\b)?/)
  const num = match ? parseInt(match[1], 10) : Number.POSITIVE_INFINITY
  const letter = match?.[2]?.toUpperCase() ?? ''
  const incisoMatch = s.match(/inciso[s]?\.?\s*(\d+)/i)
  const inciso = incisoMatch ? parseInt(incisoMatch[1], 10) : 0
  return { num, letter, inciso }
}

export function compareArticulos(a: string | null | undefined, b: string | null | undefined): number {
  const pa = parseArticulo(a)
  const pb = parseArticulo(b)
  if (pa.num !== pb.num) return pa.num - pb.num
  if (pa.letter !== pb.letter) return pa.letter.localeCompare(pb.letter)
  if (pa.inciso !== pb.inciso) return pa.inciso - pb.inciso
  return (a ?? '').localeCompare(b ?? '')
}
