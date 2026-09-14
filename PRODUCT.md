# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Diego and a small circle of friends. They open Popcorn Pal on their phones, usually installed as a PWA from the home screen, right after finishing a film, an episode, a game session, or a book chapter. The job is to log what they just watched, played, or read, give it a rating, and see what their friends have been enjoying. Desktop use is secondary and occasional.

(Inferred from README, docs/MOBILE_PWA_HANDOFF.md, and project memory; not confirmed in an interview.)

## Product Purpose

A personal, private-circle tracker for movies, shows, games, and books that doubles as a small social feed. Success means every title someone finishes ends up on their shelf with a rating and a note, and friends see and talk about it within the app instead of in a group chat.

## Positioning

One shelf for every medium (film, TV, games, books) with a single 0-10 decimal rating scale, a "Verdict" tier system (Golden through Dumpster) and named top-ten lists, shared inside a closed circle of friends rather than a public network. It is not trying to be Letterboxd; it is the friends' own clubhouse.

## Operating Context

- Mobile-first PWA installed on iOS Safari and Android Chrome; standalone display, safe-area insets, on-screen keyboard resizing the viewport.
- Frequently used one-handed; the primary navigation is a bottom-center launcher opening a radial wheel.
- Intermittent connectivity: drafts and mutations are queued offline and replayed on reconnect.
- Catalog search goes to TMDB (movies/shows), RAWG (games), and Google Books; results include poster art.
- Seasonal "costume" themes (Cinema, Lantern, Wizarding, Web-Slinger) repaint the whole palette through CSS channel tokens; a Playwright visual baseline pins the Cinema theme.

## Capabilities and Constraints

- Log a title with status (finished, in progress, up next, or plain library), decimal rating, optional "dumpster" verdict, finish date, and notes; shows can be rated per episode.
- Library with poster grid and list views, type/year/rating filters, and an editor sheet.
- Activity timeline grouped by local day.
- Social feed with posts, media attachments, image/GIF uploads, likes, nested comments (one inline level, deeper in a thread modal), mentions, and realtime updates.
- People: search, discover, followers, following; friend badge for mutual follows.
- Profile: banner and avatar (with cropping), bio, badges, top-ten lists (drag to reorder), house selection in the Wizarding season, theme picker; a public read-only profile at /profile/:username.
- Admin badge panel for the owner.
- Architecture is fixed: React 19 + Vite + Tailwind 3, Zustand stores, TanStack Query with persistence, Supabase. Page logic lives in hooks under src/hooks; page files are presentational. Do not restructure stores, hooks, routes, or data flow for design work.
- Native `<dialog>` is the modal primitive for sheets and the radial nav.

## Brand Commitments

- Name: Popcorn Pal (wordmark "PopcornPal" with italic butter "Pal").
- Mascot: the bucket pal (popped kernel with a face in a striped bucket) in src/components/brand/PalMark.tsx and public/icon.svg; used in the header, splash, empty states, and as the mobile nav launcher.
- Display face: Fraunces (Google Fonts). UI face: Avenir Next / system sans.
- Palette lives as `--pp-*` channel tokens in src/index.css and src/themes/themes.ts (slate darks, coral accent, butter yellow, cream text). Never hard-code colours; every theme must repaint.
- The radial wheel navigation, docked bottom-center, is a deliberate choice the owner wants kept. Do not replace it with a tab bar.
- Voice: warm, cinematic, a little playful ("Your front row.", "Take your seat", "A brief intermission."). Titles end with a coloured full stop or question mark.

## Evidence on Hand

- Playwright visual baselines for the Cinema theme in tests/e2e/theme-baseline.spec.ts-snapshots (feed, library, add, people, activity, profile).
- Real catalog artwork comes from third-party APIs at runtime; the repo ships no sample screenshots beyond those baselines.
- No testimonials, metrics, or marketing claims exist; do not invent any.

## Product Principles

1. Logging must be the fastest path in the app: search, tap, rate, save, in one hand.
2. Everything repaints from tokens; a season change is a full costume, never a broken one.
3. Familiar mobile mechanics (bottom sheets, safe areas, 44px targets, native inputs) over novelty, except the radial wheel which is the app's signature.
4. The mascot and cinema voice carry charm; the UI itself stays quiet and consistent.
5. Friends' content is the point: the feed, profiles, and top tens get the visual investment.

## Accessibility & Inclusion

Touch targets at least 44px, visible keyboard focus, labelled controls, `prefers-reduced-motion` respected, text at 16px in inputs to prevent iOS zoom. No formal WCAG target has been set beyond AA intent.
