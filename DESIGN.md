# Popcorn Pal design system

The contract every screen follows. Product truth lives in PRODUCT.md; this file is the visual and interaction vocabulary. Refinement, not replacement: the identity (Fraunces titles with a coloured full stop, coral accent, butter yellow, the bucket pal, the radial wheel) stays. What changes is consistency, mobile ergonomics, and the removal of off-system colour and one-off controls.

## Mode

Operate. People are in a task (log a title, read the feed, tidy a shelf). Familiar mobile mechanics win over novelty. Charm lives in the mascot, the copy, and a handful of authored moments (the verdict reaction, the sheet slide-up, the wheel), never in decoration sprinkled on controls.

## Tokens (Tailwind names)

Every colour is a `--pp-*` channel token so the four seasons repaint everything. Use these Tailwind classes and nothing else:

| Role | Classes |
|---|---|
| Page background | `bg-bg` (or `app-page`) |
| Surfaces | `bg-surface`, `bg-surface-strong`, `bg-surface-sunken`, `bg-surface-raised` |
| Borders | `border-line`, `border-line-soft`, `border-line-strong` |
| Text | `text-gray-50` (primary), `text-gray-200` (body), `text-muted` (secondary), `text-gray-500` (tertiary, only for hints) |
| Accent (actions, selection) | `bg-accent text-accent-on`, `text-accent-soft`, `text-accent-bright`, tints `bg-accent/15 border-accent/60` (opacity modifiers must be multiples of 5) |
| Butter (brand warmth, ratings) | `text-butter-300/400/500`, `text-butter-gold`, `bg-butter-gold text-ink` |
| States (fixed across seasons) | `text-ok` / `bg-ok/10`, `text-warn` / `bg-warn/10`, `text-danger` / `bg-danger/10` |

Banned: hex literals in classNames (`text-[#d9bfb1]`), stock Tailwind hues (`red-*`, `blue-*`, `purple-*`, `green-*`, `emerald-*`, `yellow-*`, `cyan-*`, `violet-*`, `rose-*`, `amber-*`, `slate-*`, `pink-*`, `orange-*`), `text-white`/`bg-white`/`bg-black`, and `white/10`-style borders (use `border-line-soft`). Keep the legacy `primary` ramp unused.

Exception: mascot and verdict SVGs keep their own fixed colours on purpose, and badge gradients driven by DB colour names may keep a small explicit map.

## Type

- Page titles: `.app-title` (Fraunces, coloured full stop or question mark). Nothing else uses Fraunces except the wordmark and the wheel hub label.
- Section headings: `.app-h2` (17px / 600) or the profile `SectionHeader`.
- Body 15px, secondary 13-14px, hints 12px. Never 10px or 11px text except `sr-only`. Weights: 600 for headings, labels and buttons; 500 for emphasis; 400 body. No `font-black`, no gradient text, no uppercase-tracked micro labels as section headers (the profile's uppercase `text-[10px] tracking-widest` labels become `SectionHeader`).
- Numbers that line up (ratings, counts) use `tabular-nums`.

## Layout and spacing

- Mobile first. Page gutter `px-5`; content max-width `max-w-3xl` (feed, people, activity, profile) or `max-w-6xl` (library).
- Vertical rhythm: sections `mb-8`, inside a card `gap-4`, tight groups `gap-2`. More space above a heading than below it.
- Radii: cards `rounded-2xl` (16px), sheets 24px, inputs and option buttons `rounded-xl` (12px), chips and avatars `rounded-full`. Do not nest cards inside cards.
- Elevation: a card is a 1px `border-line` on `bg-surface`. No drop shadows on cards, no coloured halos. Sheets get the backdrop; that is their elevation.
- Bottom padding on every page comes from `.app-page` so the wheel launcher never covers content.

## Control vocabulary (shared classes in src/index.css and components)

| Need | Use |
|---|---|
| Primary action | `.app-button-primary` (`.app-button-sm` for compact) |
| Secondary action | `.app-button-secondary` |
| Tertiary / cancel / text action | `.app-button-ghost` |
| Icon-only button | `.app-icon-button` (44px) with `aria-label` |
| Filter chip (toggle, may carry icon and count) | `.app-chip` + `aria-pressed`; `.app-chip-count` for the number |
| Option in a group (status, house, list choice) | `.app-option` + `aria-pressed`; grid `grid-cols-2 gap-2` |
| Segmented switch (2-4 exclusive modes) | `.app-segmented` with buttons carrying `aria-pressed` |
| Tabs that switch content | `PillTabs` (features/profile/PillTabs.tsx) |
| Text input / textarea | `.app-input` / `.app-textarea` |
| Select | `<span class="app-select"><select class="app-input">` (or `app-chip` inside a toolbar) |
| Search field | `<div class="app-search"><Search/><input class="app-input"/></div>` |
| Field label | `.app-label` (optional hint in `<small>`) |
| Inline status | `.app-note` + `.app-note-ok` / `-warn` / `-danger` with `role="status"` or `role="alert"` |
| Avatar with initial fallback | `.app-avatar` sized by the caller, `UserAvatar` inside |
| Empty state | `.app-empty` with a `PalMark`, an `h3`, a `p`, and one action |
| Modal, sheet, picker | `Sheet` (src/components/Sheet.tsx). Bottom sheet on phones, centred on desktop, native `<dialog>`, Escape and backdrop close, focus restored. No more `fixed inset-0` div overlays. |
| Rating control | `RatingField` (src/components/RatingField.tsx): DecimalRating plus the live verdict and the dumpster toggle |
| Notes | `NoteField` (opens the full-screen `NoteComposer`) |

`GifPicker` now renders its own `Sheet`; render it directly, without a wrapping overlay div.

## States

Every control has default, hover (pointer only), `focus-visible` (the global butter ring), active (global 0.97 scale), disabled (`opacity-45`, `cursor-not-allowed`), and where relevant loading (spinner inside the pressed button, text kept), error (`.app-note-danger`) and success (`.app-note-ok`). Loading content uses skeletons that match the final layout, not centred spinners. Empty states teach what to do next and carry the mascot.

## Touch

- Every interactive element is at least 44px tall and wide. Text-only actions in comment rows get `min-h-11` and horizontal padding.
- Nothing is hover-only. Remove buttons and secondary actions are visible on touch, never `opacity-0 group-hover:opacity-100`.
- Horizontal strips (chips, posters) scroll with `overflow-x-auto no-scrollbar -mx-5 px-5` so they bleed to the page edge; a partially visible last item is the affordance. `PillTabs` adds a fade and chevron at a clipped edge.
- Sheet bodies are `overflow-x: hidden` with `touch-action: pan-y`; iOS lets any scroll container rubber-band sideways otherwise.
- Inputs are 16px so iOS does not zoom. Keyboards get `inputMode`, `autoComplete`, `enterKeyHint`.
- Safe areas: fixed bars use `env(safe-area-inset-*)`; sheets pad their footer with `pb-[max(16px,env(safe-area-inset-bottom))]`.

## Motion

150-250ms, `ease-out`, on `color`, `background-color`, `border-color`, `opacity`, `transform` only. The authored moments: the sheet slide-up, the verdict reaction as a rating changes, the PillTabs sliding pill, the wheel. Do not add entrance animations to lists or cards. Remove the dead `animate-in fade-in slide-in-*` classes (that plugin is not installed; they do nothing). `prefers-reduced-motion` is already handled globally.

## Copy and vocabulary

Keep the app's voice and existing copy. One shared status vocabulary everywhere, from `statusLabel()` in features/library/libraryModel.ts:

| status | label |
|---|---|
| completed | Finished |
| in-progress | In progress |
| planned | Up next |
| logged | On the shelf |

Verdicts (Golden, Buttered, Half-Popped, Old Maid, Burnt, Dumpster) are the rating vocabulary; show a `VerdictMark` next to a number instead of a star icon.

Icons are Lucide only, 16/18/20px; no emoji or glyph icons (`✕`, `✨`, `★`).

## Test-referenced strings (do not change)

Headings "Your front row.", "Your collection.", "Welcome back."; auth labels "Username", "Email address", "Password", "Confirm password"; buttons "Take your seat", "Create account", "Create your account", "Forgot password?", "Send reset link", "Back to sign in", "Continue to sign in", "Post", "Done", "Save", "Save ratings", "Save changes", "Keep entry", "Remove entry", "Remove this entry", "Continue", "By episode", "Shows", "Poster grid view", "Open navigation", "Close log; keep draft"; aria labels "Search titles", "Search your library", "Share a thought with your friends", "Log {title}", "View and edit {title}", "Rating for {episode}", "Comments on {user}'s post", "Write notes" / "Edit your notes"; link "Share your thoughts"; dialog name "Popcorn Pal navigation"; text "1 title".

## Out of scope

Hooks, stores, queries, routes, the offline queue, Supabase calls, `alert()`/`confirm()` handlers, and the radial wheel mechanics. Design work touches JSX and CSS only.
