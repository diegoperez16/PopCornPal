# Popcorn Pal mobile PWA

The mobile redesign and structural fixes are implemented in branch `codex/mobile-pwa-redesign`. This work keeps React, Vite, Supabase, TanStack Query, and Zustand. Nothing has been deployed or submitted to an app store.

## What changed

- One launcher at the center of the phone viewport opens a labeled radial menu. Logging occupies the top position; Home, People, You, Library, and Activity surround it. The menu uses a native modal dialog with focus trapping, arrow-key navigation, Escape/backdrop dismissal, and focus restoration. Desktop uses the same destination model in its header.
- A charcoal, coral, and warm paper palette connects the social feed, authentication, logging, and collection. The cinema ticket motif gives the app its own identity. Friends can keep sharing free-form topics in existing posts and comments; there is no new discussion backend.
- Logging now uses one mobile sheet, abortable cached catalog queries, visible search/server errors, validated account-scoped drafts, local calendar dates, resume/discard actions, and accurate online/offline success feedback. Search stays available after saving. Shows can be rated by episode; partial saves keep only unfinished episode ratings in the draft.
- The collection separates filtering/sorting from presentation and its editor. Poster and list views, type filters, search, rating/editing, and removal are retained. The editor shows save failures and requires a deliberate removal choice. Existing data semantics are preserved: `logged` records form the durable collection; completed/in-progress/planned records represent activity.
- Cover loading wrappers fill their poster/thumbnail frames even for landscape game artwork. Feed photos and animated GIFs retain their natural proportions, stay centered within bounded dimensions, and show the full image. Composer previews also scale proportionally within narrow layouts.
- `App.tsx` is reduced from a 658-line coordinator to a small composition root. Routes/session gating, lifecycle, connectivity, chunk recovery, and PWA updates have separate owners under `src/app`.
- Supabase is the authentication authority. Zustand stores only display-profile data. One initialization promise and auth listener replace duplicate listeners; profile requests run outside the auth callback, and identity generations prevent stale responses from overwriting a new account.
- Query persistence and offline changes are partitioned by account. Atomic IndexedDB queue updates prevent enqueue/flush races. Failed/auth-rejected changes remain saved; reconnect replay is serialized, including across windows where Web Locks is available. Mutation callbacks now run while offline so the queue can actually receive writes.
- Proper 192px, 512px, Apple touch, and dedicated maskable icons replace the incomplete placeholder set. The manifest has a stable ID, shortcuts, consistent branding, and standalone display. Zoom is enabled and safe-area padding is retained. New service workers wait for a user-requested reload; already viewed cover images can be cached.

## Saved checkout reconciliation

The saved project at `/Users/diegoperez/Desktop/RabbitHole/PopcornPal` was inspected read-only. At initial inspection it had uncommitted changes in `useAddEntryPage.ts`, `AddEntryPage.tsx`, `AuthPage.tsx`, and `index.css` that were absent from the worktree. Their useful intent is carried forward: persistent search after saving, clearer status choices, notes, success feedback, episode/library behavior, labeled auth forms, password requirements, recovery, and shared panels. The new implementation reorganizes those behaviors around the final cinematic design and radial-navigation request. This task did not write to the saved checkout. A final read-only check showed it clean on `main` at the same `f516d2e` commit, so its initial dirty state changed independently during the session. Review the initial four-file work and this worktree deliberately when integrating; do not overwrite a newer checkout wholesale.

## Reproduce validation

Use Node 22.18+ (validated with Node 26.5) and run:

```sh
npm ci
npm test
npx playwright install chromium
npm run test:e2e
```

The browser suite builds the production PWA and serves it locally on port 4173 using explicit fixture keys. Its backend/account/catalog data is intercepted inside isolated browser contexts. It does not access or mutate the real Supabase project. The test build is not a deployable configuration: rebuild with the real production environment before publishing.

The suite exercises the social/logging loop, recoverable catalog errors, draft recovery after reload, episode ratings, offline save/reconnect, library editing/removal/error recovery, sign-in/recovery/confirmation, small-phone radial navigation, desktop layout, icon dimensions, service-worker activation, and offline navigation. Media cases cover portrait, landscape, square, and animated GIF sizing on mobile and desktop, including game covers and wide composer previews. Screenshots use sample accounts and illustrative test artwork.

Validation passed: **15 Node regression tests, 15 Playwright browser/PWA tests, the TypeScript/production build, and `git diff --check`**. New/refactored core modules pass targeted ESLint, and the production build includes TypeScript checking. Repository-wide ESLint still reports existing debt in older profile/feed/query components; it should not be described as fully green. Security updates available without major API changes were applied to the lockfile. Remaining dependency advisories are in Giphy's transitive `js-cookie` and `uuid` dependencies; do not force-downgrade the Giphy component package as a blind audit fix.

## Before sharing a hosted URL with friends

1. Configure a real Supabase URL/public anon key and the catalog/Giphy keys in the hosting build environment. `VITE_*` values are public browser configuration; never put a Supabase service-role key there.
2. Verify the existing schema, migrations, Row Level Security, storage policies, and the `get_feed` RPC against a staging project. No database migration or policy change was executed during this work. The repository's historical SQL migrations still need an authoritative, reproducible deployment order.
3. Configure Supabase site URL and allowed authentication redirects for `/auth/callback` and `/update-password` on the chosen HTTPS origin. Test email confirmation and recovery with a real account.
4. Build with that environment and host `dist/` behind HTTPS with SPA rewrites. Serve the manifest, icons, and service worker without rewriting them to HTML. Do not cache `sw.js` indefinitely. The existing hosting choice can be retained.
5. Test installation and relaunch on physical iOS Safari and Android Chrome, including keyboard, safe areas, low connectivity, update acceptance, real realtime events, and optional push configuration. Chromium automation and desktop browser inspection do not replace these device checks.
6. Resolve or explicitly assess the remaining Giphy dependency advisories and the repository-wide lint debt before a production release.

Offline support has intentional limits. Authentication and new catalog searches need connectivity; the app can reopen cached screens and retain supported writes on the device. Unsynced work depends on browser storage. Background replay requires an open/restored app window; the service worker signals windows rather than executing authenticated writes itself. Legacy global queue records without a trustworthy owner remain preserved and are never replayed under a guessed account. Server-generated inserts are not yet exactly-once after an ambiguous connection failure or process crash; server-side idempotency is a future backend improvement. Browsers without Web Locks have same-window replay deduplication only.

Manifest/icon and offline-cache behavior were checked against [MDN's manifest icon guidance](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/icons) and [offline operation guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation).
