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
    spider: { body: '#c8161d', stripe: '#1b3fa0', rim: '#c8161d' },
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
          {/* Popcorn tufts stay visible around the mask — burying the kernel in
              red loses Poppy entirely and reads as a lumpy blob. */}
          <g>
            <circle cx="150" cy="212" r="58" fill="#eab84f" />
            <circle cx="362" cy="212" r="58" fill="#eab84f" />
            <circle cx="196" cy="146" r="54" fill="#f6cd66" />
            <circle cx="316" cy="146" r="54" fill="#f6cd66" />
            <circle cx="256" cy="120" r="58" fill="#ffd97e" />
          </g>
          {/* One smooth head, so the mask reads as a mask and not as scenery. */}
          <ellipse cx="256" cy="214" rx="106" ry="100" fill="#c8161d" />
          <path
            d="M256 116 l0 196 M156 172 q100 -26 200 0 M150 216 q106 -22 212 0 M162 262 q94 -20 188 0
               M192 130 q10 92 34 178 M320 130 q-10 92 -34 178"
            stroke="#6d0a10"
            strokeWidth="4.5"
            fill="none"
            opacity=".8"
          />
          {/* Each eye is tall and rounded on the outside and tapers to a point
              toward the nose, tipped slightly down. That taper is the whole
              likeness; get it backwards and it reads as sunglasses. */}
          <path d="M166 202 q4 -30 30 -34 q40 2 66 44 q-30 30 -66 26 q-30 -6 -30 -36 Z" fill="#0b0b0d" />
          <path d="M346 202 q-4 -30 -30 -34 q-40 2 -66 44 q30 30 66 26 q30 -6 30 -36 Z" fill="#0b0b0d" />
          <path d="M177 203 q3 -22 22 -25 q31 2 51 34 q-23 22 -51 19 q-23 -5 -22 -28 Z" fill="#f4f7ff" />
          <path d="M335 203 q-3 -22 -22 -25 q-31 2 -51 34 q23 22 51 19 q23 -5 22 -28 Z" fill="#f4f7ff" />
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
        <>
          <g stroke="#0b0b0d" strokeWidth="5" fill="none" opacity=".75">
            <path d="M256 306 l0 154 M198 312 l44 148 M314 312 l-44 148" />
            <path d="M176 348 q80 -18 160 0 M186 394 q70 -16 140 0 M196 438 q60 -14 120 0" />
          </g>
          <g fill="#0b0b0d">
            <ellipse cx="256" cy="372" rx="15" ry="19" />
            <path
              d="M242 358 q-22 -14 -32 -30 M270 358 q22 -14 32 -30 M240 372 q-26 -2 -44 6 M272 372 q26 -2 44 6 M244 388 q-22 12 -30 30 M268 388 q22 12 30 30"
              stroke="#0b0b0d"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
            />
          </g>
        </>
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
