import PalMark from './PalMark'

export default function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-[#f6efe3]">
      <PalMark size={38} />
      {!compact && (
        <span className="brand-wordmark">
          Popcorn<em>Pal</em>
        </span>
      )}
    </span>
  )
}
