// A theme is nothing but colour channels plus a Poppy costume. The app reads
// these through CSS variables, so adding a season means adding an entry here —
// no component ever needs to know which theme is active.
//
// `cinema` is the app's own identity and the fallback for anything unknown.
// Its values are the exact colours the app shipped with; a visual regression
// test pins them, so it can always be returned to unchanged.

export type PoppyCostume = 'none' | 'lantern' | 'wizarding' | 'spider'

export type Theme = {
  id: string
  /** Shown in the theme picker. */
  name: string
  /** One line of flavour under the name. */
  blurb: string
  costume: PoppyCostume
  /** "R G B" channel triplets, consumed as rgb(var(--x) / <alpha>). */
  colors: Record<string, string>
}

const cinemaColors: Record<string, string> = {
  'gray-50': '244 247 249',
  'gray-100': '230 235 239',
  'gray-200': '207 216 223',
  'gray-300': '170 184 194',
  'gray-400': '133 149 164',
  'gray-500': '107 124 140',
  'gray-600': '81 96 110',
  'gray-700': '44 52 64',
  'gray-800': '27 33 39',
  'gray-900': '20 24 28',
  'gray-950': '14 17 20',

  bg: '20 24 28',
  surface: '27 33 39',
  'surface-strong': '35 43 51',
  'surface-sunken': '23 28 33',
  'surface-raised': '51 62 75',
  line: '44 52 64',
  'line-soft': '47 57 70',
  'line-strong': '69 71 75',

  text: '232 238 243',
  parchment: '244 240 232',
  muted: '150 164 179',
  ink: '43 28 14',

  accent: '255 101 91',
  'accent-soft': '255 129 117',
  'accent-warm': '255 130 122',
  'accent-bright': '255 153 142',
  'accent-deep': '43 19 16',
  'on-accent': '24 19 17',

  'butter-300': '255 217 126',
  'butter-400': '246 205 102',
  'butter-500': '234 184 79',
  'butter-600': '201 154 58',
  'butter-gold': '242 204 143',
}

export const CINEMA: Theme = {
  id: 'cinema',
  name: 'Cinema',
  blurb: 'The house style. Slate, coral and butter.',
  costume: 'none',
  colors: cinemaColors,
}

// A season overrides only what it needs; everything else falls back to cinema.
function season(
  id: string,
  name: string,
  blurb: string,
  costume: PoppyCostume,
  overrides: Record<string, string>
): Theme {
  return { id, name, blurb, costume, colors: { ...cinemaColors, ...overrides } }
}

export const LANTERN = season(
  'lantern',
  'Lantern',
  'Emerald light, willpower and no evil escaping your sight.',
  'lantern',
  {
    'gray-900': '8 20 15',
    'gray-800': '13 31 23',
    'gray-700': '25 58 42',
    'gray-600': '38 82 60',
    'gray-500': '86 130 106',
    'gray-400': '129 173 148',
    'gray-300': '170 208 188',

    bg: '8 20 15',
    surface: '13 31 23',
    'surface-strong': '19 43 31',
    'surface-sunken': '10 25 18',
    'surface-raised': '31 71 51',
    line: '25 58 42',
    'line-soft': '30 68 49',
    'line-strong': '46 92 68',

    text: '229 250 238',
    parchment: '223 247 233',
    muted: '129 173 148',

    accent: '16 185 90',
    'accent-soft': '52 211 118',
    'accent-warm': '45 200 110',
    'accent-bright': '92 255 157',
    'accent-deep': '5 40 22',
    'on-accent': '5 40 22',

    'butter-300': '156 255 196',
    'butter-400': '92 255 157',
    'butter-500': '35 214 116',
    'butter-600': '20 160 86',
    'butter-gold': '140 240 180',
  }
)

export const WIZARDING = season(
  'wizarding',
  'Wizarding',
  'Candlelight, old parchment and a common room fire.',
  'wizarding',
  {
    'gray-900': '20 15 12',
    'gray-800': '33 25 20',
    'gray-700': '61 46 35',
    'gray-600': '86 65 48',
    'gray-500': '132 110 88',
    'gray-400': '173 150 122',
    'gray-300': '208 189 163',

    bg: '20 15 12',
    surface: '33 25 20',
    'surface-strong': '45 34 26',
    'surface-sunken': '25 19 15',
    'surface-raised': '74 56 42',
    line: '61 46 35',
    'line-soft': '70 53 40',
    'line-strong': '92 71 54',

    text: '245 235 216',
    parchment: '240 228 203',
    muted: '173 150 122',

    accent: '123 30 38',
    'accent-soft': '160 44 52',
    'accent-warm': '150 40 48',
    'accent-bright': '196 70 78',
    'accent-deep': '250 235 214',
    'on-accent': '250 235 214',

    'butter-300': '243 214 138',
    'butter-400': '224 178 60',
    'butter-500': '198 152 44',
    'butter-600': '160 120 32',
    'butter-gold': '236 200 120',
  }
)

export const SPIDER = season(
  'spider',
  'Web-Slinger',
  'Red suit, blue trim, and the whole city upside down.',
  'spider',
  {
    'gray-900': '22 8 11',
    'gray-800': '38 14 18',
    'gray-700': '78 28 34',
    'gray-600': '112 42 48',
    'gray-500': '158 92 96',
    'gray-400': '198 140 144',
    'gray-300': '226 186 188',

    bg: '22 8 11',
    surface: '38 14 18',
    'surface-strong': '54 20 25',
    'surface-sunken': '28 10 14',
    'surface-raised': '86 32 38',
    line: '78 28 34',
    'line-soft': '92 34 40',
    'line-strong': '124 48 54',

    text: '255 236 236',
    parchment: '250 228 228',
    muted: '198 140 144',

    accent: '230 36 41',
    'accent-soft': '252 62 66',
    'accent-warm': '242 48 52',
    'accent-bright': '255 104 106',
    'accent-deep': '255 240 240',
    'on-accent': '255 240 240',

    'butter-300': '126 168 255',
    'butter-400': '58 110 232',
    'butter-500': '36 82 198',
    'butter-600': '24 58 150',
    'butter-gold': '96 142 244',
  }
)

export const THEMES: Theme[] = [CINEMA, LANTERN, WIZARDING, SPIDER]

/**
 * The season everyone starts on. Separate from CINEMA on purpose: CINEMA is
 * the app's permanent house style and is never removed, while this points at
 * whichever season is current. Changing it re-dresses new accounts and anyone
 * who has not chosen, and leaves existing choices alone.
 */
export const DEFAULT_THEME_ID = 'lantern'

export function getTheme(id: string | null | undefined): Theme {
  return (
    THEMES.find((theme) => theme.id === id) ??
    THEMES.find((theme) => theme.id === DEFAULT_THEME_ID) ??
    CINEMA
  )
}

/** Writes a theme's channels onto the document so every token repaints. */
export function applyTheme(theme: Theme, root: HTMLElement) {
  for (const [token, channels] of Object.entries(theme.colors)) {
    root.style.setProperty(`--pp-${token}-rgb`, channels)
  }
  root.dataset.theme = theme.id
}
