import { useId } from 'react'
import { useThemeStore } from '../../store/themeStore'
import type { PoppyCostume } from '../../themes/themes'

/**
 * Poppy: a popped kernel sitting in the classic striped bucket.
 *
 * A costume only ever adds a layer on top of the same kernel and bucket
 * silhouette, so Poppy stays recognisably Poppy in every season. Costume
 * colours are deliberately fixed rather than themed — the character should
 * look like itself regardless of the palette around it.
 */
export default function PalMark({
  size = 36,
  costume,
}: {
  size?: number
  /** Omit to wear whatever the active season dresses Poppy in. */
  costume?: PoppyCostume
}) {
  const seasonCostume = useThemeStore((state) => state.theme.costume)
  const worn = costume ?? seasonCostume
  // Gradients need ids unique to the instance; several Poppies share a page.
  const uid = useId().replace(/:/g, '')

  const bucketBody =
    'M128 306 L 384 306 L 352 448 Q 350 460 338 460 L 174 460 Q 162 460 160 448 Z'
  const bucketStripes =
    'M170 306 l 24 0 L 184 460 l -4 0 q -12 0 -14 -12 Z M244 306 l 24 0 l -3 154 l -18 0 Z M318 306 l 24 0 l -14 142 q -2 12 -14 12 l -6 0 Z'

  const palette = {
    none: { body: '#f6efe3', stripe: '#ff655b', rim: '#ff655b' },
    lantern: { body: '#0f7a3f', stripe: '#eafff2', rim: '#5cff9d' },
    wizarding: { body: '#f6efe3', stripe: '#7b1e26', rim: '#7b1e26' },
    spider: { body: '#1f3a93', stripe: '#d6282e', rim: '#d6282e' },
  }[worn]

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      aria-hidden="true"
      focusable="false"
    >
      {worn === 'lantern' && (
        <>
          <defs>
            <radialGradient id={`glow${uid}`}>
              <stop offset="0%" stopColor="#5cff9d" stopOpacity=".5" />
              <stop offset="100%" stopColor="#5cff9d" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="256" cy="250" r="250" fill={`url(#glow${uid})`} />
        </>
      )}

      {/* Kernel — identical in every costume */}
      <g>
        <circle cx="152" cy="230" r="60" fill="#eab84f" />
        <circle cx="360" cy="230" r="60" fill="#eab84f" />
        <circle cx="192" cy="164" r="58" fill="#f6cd66" />
        <circle cx="320" cy="164" r="58" fill="#f6cd66" />
        <circle cx="256" cy="136" r="64" fill="#ffd97e" />
        <circle cx="256" cy="212" r="98" fill="#ffd97e" />
      </g>

      {worn === 'wizarding' && (
        <path
          d="M244 128 l22 -34 l-6 30 l20 -6 l-30 44 l6 -30 Z"
          fill="#8a5a2b"
        />
      )}

      {worn === 'spider' && (
        <>
          {/* The mask covers the kernel; the eyes do all the work. */}
          <path
            d="M158 150 q98 -34 196 0 q16 76 -22 116 q-36 34 -76 34 q-40 0 -76 -34 q-38 -40 -22 -116 Z"
            fill="#d6282e"
          />
          <path
            d="M182 176 q92 -22 148 0 M170 214 q86 -18 172 0 M256 146 l0 128 M206 158 q12 60 42 108 M306 158 q-12 60 -42 108"
            stroke="#8f1418"
            strokeWidth="5"
            fill="none"
            opacity=".75"
          />
          <path d="M186 214 q34 -34 62 -6 q-24 44 -58 34 q-10 -14 -4 -28 Z" fill="#f2f5ff" />
          <path d="M326 214 q-34 -34 -62 -6 q24 44 58 34 q10 -14 4 -28 Z" fill="#f2f5ff" />
          <path d="M186 214 q34 -34 62 -6 q-24 44 -58 34 q-10 -14 -4 -28 Z" fill="none" stroke="#8f1418" strokeWidth="6" />
          <path d="M326 214 q-34 -34 -62 -6 q24 44 58 34 q10 -14 4 -28 Z" fill="none" stroke="#8f1418" strokeWidth="6" />
        </>
      )}

      {worn === 'lantern' ? (
        <>
          <path
            d="M168 196 q88 -26 176 0 q6 42 -18 54 q-30 12 -70 -6 q-40 18 -70 6 q-24 -12 -18 -54 Z"
            fill="#0f9b4c"
          />
          <circle cx="219" cy="214" r="13" fill="#eafff2" />
          <circle cx="293" cy="214" r="13" fill="#eafff2" />
          <path
            d="M230 252 q26 22 52 0"
            stroke="#2b1c0e"
            strokeWidth="14"
            fill="none"
            strokeLinecap="round"
          />
        </>
      ) : worn === 'spider' ? null : (
        <>
          <circle cx="219" cy="212" r="14" fill="#2b1c0e" />
          <circle cx="293" cy="212" r="14" fill="#2b1c0e" />
          <path
            d="M230 248 q26 22 52 0"
            stroke="#2b1c0e"
            strokeWidth="14"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="180" cy="244" r="12" fill="#ff655b" opacity=".45" />
          <circle cx="332" cy="244" r="12" fill="#ff655b" opacity=".45" />
        </>
      )}

      {worn === 'wizarding' && (
        <g fill="none" stroke="#2b1c0e" strokeWidth="11">
          <circle cx="219" cy="212" r="36" />
          <circle cx="293" cy="212" r="36" />
          <path d="M255 212 h2" />
          <path d="M183 206 l-26 -10" />
          <path d="M329 206 l26 -10" />
        </g>
      )}

      {/* Bucket */}
      <path d={bucketBody} fill={palette.body} />
      <path d={bucketStripes} fill={palette.stripe} />
      <rect x="118" y="288" width="276" height="30" rx="15" fill={palette.rim} />

      {worn === 'spider' && (
        <g stroke="#f2f5ff" strokeWidth="7" fill="none" opacity=".85">
          <path d="M256 306 l0 154 M180 316 l60 144 M332 316 l-60 144" />
          <path d="M166 352 q90 -18 180 0 M176 396 q80 -16 160 0 M186 438 q70 -14 140 0" />
        </g>
      )}

      {worn === 'lantern' && (
        <g fill="none" stroke="#eafff2" strokeWidth="12">
          <circle cx="256" cy="384" r="30" />
          <path d="M206 360 h100 M206 408 h100" strokeLinecap="round" />
        </g>
      )}

      {worn === 'wizarding' && (
        <>
          <path d="M118 292 q138 -34 276 0 l0 26 q-138 -32 -276 0 Z" fill="#7b1e26" />
          <path
            d="M150 288 l0 30 M198 284 l0 30 M246 282 l0 30 M294 283 l0 30 M342 286 l0 30"
            stroke="#e0b23c"
            strokeWidth="14"
          />
          <path d="M366 314 q34 30 22 84 l-38 -8 q14 -44 -6 -66 Z" fill="#7b1e26" />
          <path
            d="M370 350 l38 8 M364 378 l40 8"
            stroke="#e0b23c"
            strokeWidth="11"
          />
        </>
      )}
    </svg>
  )
}
