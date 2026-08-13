export default function ExpandableCell({ text }: { text: string | null }) {
  if (!text) return <span className="text-slate-300">—</span>

  return (
    <p className="text-slate-600 text-xs leading-relaxed break-words whitespace-pre-wrap">
      {text}
    </p>
  )
}
