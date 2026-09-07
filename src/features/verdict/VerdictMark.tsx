import { useId } from 'react'
import type { VerdictId } from './verdictModel'

/**
 * Poppy, expressing an opinion. Every mark keeps the bucket silhouette so the
 * family is obvious at a glance; only the kernel and the face change, which is
 * what stays legible down at badge size.
 */
const BUCKET_BODY =
  'M128 306 L 384 306 L 352 448 Q 350 460 338 460 L 174 460 Q 162 460 160 448 Z'
const BUCKET_STRIPES =
  'M170 306 l 24 0 L 184 460 l -4 0 q -12 0 -14 -12 Z M244 306 l 24 0 l -3 154 l -18 0 Z M318 306 l 24 0 l -14 142 q -2 12 -14 12 l -6 0 Z'

function Bucket({ body = '#f6efe3', stripe = '#ff655b' }) {
  return (
    <>
      <path d={BUCKET_BODY} fill={body} />
      <path d={BUCKET_STRIPES} fill={stripe} />
      <rect x="118" y="288" width="276" height="30" rx="15" fill={stripe} />
    </>
  )
}

function Puff({ light, mid, dark }: { light: string; mid: string; dark: string }) {
  return (
    <g>
      <circle cx="152" cy="230" r="60" fill={dark} />
      <circle cx="360" cy="230" r="60" fill={dark} />
      <circle cx="192" cy="164" r="58" fill={mid} />
      <circle cx="320" cy="164" r="58" fill={mid} />
      <circle cx="256" cy="136" r="64" fill={light} />
      <circle cx="256" cy="212" r="98" fill={light} />
    </g>
  )
}

export default function VerdictMark({
  verdict,
  size = 28,
}: {
  verdict: VerdictId
  size?: number
}) {
  const uid = useId().replace(/:/g, '')
  const ink = '#2b1c0e'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      aria-hidden="true"
      focusable="false"
    >
      {verdict === 'golden' && (
        <>
          <defs>
            <radialGradient id={`g${uid}`}>
              <stop offset="0%" stopColor="#ffe9a8" stopOpacity=".75" />
              <stop offset="100%" stopColor="#ffe9a8" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="256" cy="230" r="250" fill={`url(#g${uid})`} className="verdict-glow" />
          <Puff light="#fff0c2" mid="#ffe08a" dark="#f6cd66" />
          <path d="M198 206 q21 -20 42 0" stroke={ink} strokeWidth="13" fill="none" strokeLinecap="round" />
          <path d="M272 206 q21 -20 42 0" stroke={ink} strokeWidth="13" fill="none" strokeLinecap="round" />
          <path d="M222 242 q34 32 68 0" stroke={ink} strokeWidth="14" fill="none" strokeLinecap="round" />
          <circle cx="178" cy="246" r="13" fill="#ff655b" opacity=".5" />
          <circle cx="334" cy="246" r="13" fill="#ff655b" opacity=".5" />
          <path d="M96 150 l10 -26 l10 26 l26 10 l-26 10 l-10 26 l-10 -26 l-26 -10 Z" fill="#ffe08a" className="verdict-twinkle" />
          <path d="M404 196 l8 -20 l8 20 l20 8 l-20 8 l-8 20 l-8 -20 l-20 -8 Z" fill="#ffe08a" className="verdict-twinkle verdict-twinkle-late" />
          <Bucket />
        </>
      )}

      {verdict === 'buttered' && (
        <>
          <Puff light="#ffd97e" mid="#f6cd66" dark="#eab84f" />
          <circle cx="219" cy="212" r="14" fill={ink} />
          <circle cx="293" cy="212" r="14" fill={ink} />
          <path d="M230 248 q26 22 52 0" stroke={ink} strokeWidth="14" fill="none" strokeLinecap="round" />
          <circle cx="180" cy="244" r="12" fill="#ff655b" opacity=".45" />
          <circle cx="332" cy="244" r="12" fill="#ff655b" opacity=".45" />
          <Bucket />
        </>
      )}

      {verdict === 'half' && (
        <>
          <circle cx="168" cy="238" r="52" fill="#cfa94a" />
          <circle cx="344" cy="238" r="52" fill="#cfa94a" />
          <circle cx="256" cy="188" r="82" fill="#f6cd66" />
          <circle cx="204" cy="256" r="26" fill="#8a5a2b" />
          <circle cx="312" cy="258" r="22" fill="#8a5a2b" />
          <circle cx="223" cy="196" r="13" fill={ink} />
          <circle cx="289" cy="196" r="13" fill={ink} />
          <path d="M228 232 h56" stroke={ink} strokeWidth="13" strokeLinecap="round" />
          <Bucket />
        </>
      )}

      {verdict === 'oldmaid' && (
        <>
          <ellipse cx="256" cy="228" rx="86" ry="74" fill="#8a5a2b" />
          <ellipse cx="256" cy="212" rx="66" ry="52" fill="#a06c34" />
          <circle cx="196" cy="270" r="22" fill="#f6cd66" opacity=".9" />
          <circle cx="228" cy="214" r="12" fill="#3a2410" />
          <circle cx="286" cy="214" r="12" fill="#3a2410" />
          <path d="M228 258 q28 -16 56 0" stroke="#3a2410" strokeWidth="13" fill="none" strokeLinecap="round" />
          <Bucket />
        </>
      )}

      {verdict === 'burnt' && (
        <>
          <Puff light="#4a4038" mid="#3b332c" dark="#2e2823" />
          {/* Thicker than the drawing needs, so the smoke survives at 20px. */}
          <path
            d="M150 96 q28 -30 0 -60 M256 74 q30 -34 0 -66 M362 96 q28 -30 0 -60"
            stroke="#8b8680"
            strokeWidth="17"
            fill="none"
            strokeLinecap="round"
          />
          <path d="M206 198 l28 28 M234 198 l-28 28" stroke="#e6e0d9" strokeWidth="14" strokeLinecap="round" />
          <path d="M278 198 l28 28 M306 198 l-28 28" stroke="#e6e0d9" strokeWidth="14" strokeLinecap="round" />
          <path d="M226 262 q30 -24 60 0" stroke="#e6e0d9" strokeWidth="14" fill="none" strokeLinecap="round" />
          <Bucket body="#cfc7bd" stripe="#8d3b34" />
        </>
      )}

      {verdict === 'dumpster' && (
        <g className="verdict-dumpster">
          {/* Three coils, each narrower than the one below and offset a little,
              so it reads as the classic swirl rather than a blob. */}
          <ellipse cx="256" cy="404" rx="150" ry="62" fill="#6b4423" />
          <ellipse cx="256" cy="388" rx="150" ry="58" fill="#8a5a2b" />
          <path d="M106 388 a150 58 0 0 1 300 0 Z" fill="#9c6733" />

          <ellipse cx="246" cy="308" rx="106" ry="50" fill="#7b5230" />
          <path d="M140 308 a106 46 0 0 1 212 0 Z" fill="#a06c34" />

          <ellipse cx="238" cy="240" rx="66" ry="36" fill="#8a5a2b" />
          <path d="M172 240 a66 32 0 0 1 132 0 Z" fill="#a97438" />

          {/* The tip: a small curl leaning off to one side. */}
          <path
            d="M238 208 q4 -46 34 -58 q-14 22 -8 44 q-12 6 -26 14 Z"
            fill="#a97438"
          />

          <circle cx="222" cy="382" r="17" fill="#241608" />
          <circle cx="298" cy="382" r="17" fill="#241608" />
          <circle cx="227" cy="376" r="5" fill="#f2e6d8" />
          <circle cx="303" cy="376" r="5" fill="#f2e6d8" />
          <path
            d="M228 430 q28 16 56 0"
            stroke="#241608"
            strokeWidth="15"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      )}
    </svg>
  )
}
