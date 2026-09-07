import { Popcorn } from 'lucide-react'

export default function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 text-[#f8f4ed]">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ff655b] text-[#171311]"
        aria-hidden="true"
      >
        <Popcorn size={23} strokeWidth={1.9} />
      </span>
      {!compact && (
        <span className="text-[19px] font-bold tracking-[-0.7px]">
          Popcorn<span className="font-normal text-[#c4beb5]"> Pal</span>
        </span>
      )}
    </span>
  )
}
