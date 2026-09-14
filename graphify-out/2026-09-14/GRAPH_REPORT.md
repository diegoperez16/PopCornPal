# Graph Report - PopcornPal  (2026-09-14)

## Corpus Check
- 201 files · ~125,742 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1110 nodes · 2584 edges · 58 communities (52 shown, 4 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 143 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0a1df7a6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- FeedPage.tsx
- queryClient.ts
- useProfilePage.ts
- PalMark.tsx
- useAddEntryPage.ts
- Real-time Replication
- useProfileQueries.ts
- GifPicker.tsx
- WelcomeModal.tsx
- AppShell.tsx
- favoriteLists.ts
- useMediaQueries.ts
- vite.config.ts
- compilerOptions
- package.json
- compilerOptions
- devDependencies
- Deployment Guide
- Mobile PWA Handoff
- Hosting Prerequisites
- dependencies
- useAuthStore
- Supabase Setup Guide
- Features Showcase
- react-router-dom
- engines
- PopcornPal
- lucide-react
- App.tsx
- PWA Setup Complete
- Project Structure
- README
- PopcornPal Header/Logo Exporter
- add-comment-images-migration.sql
- ActivityPage.tsx
- index.html
- mediaStore.ts
- Popcorn Pal design system
- profile-preview.ts
- Product
- LibraryPage.tsx
- Database Indexes
- scripts
- react
- follows table
- RouteErrorBoundary.tsx
- ProfilePage.tsx
- sort-house/index.ts
- Validation Suite
- User Authentication
- offlineMutationQueue.ts
- sw.ts
- send-push/index.ts
- tsconfig.json
- BadgeRow.tsx
- supabase

## God Nodes (most connected - your core abstractions)
1. `react` - 56 edges
2. `lucide-react` - 40 edges
3. `useAuthStore` - 36 edges
4. `supabase` - 25 edges
5. `PopcornPal` - 24 edges
6. `verdictFor()` - 23 edges
7. `useProfilePage()` - 22 edges
8. `Mobile PWA Handoff` - 22 edges
9. `react-router-dom` - 21 edges
10. `executeQueuedMutationOrRun()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `follows table` --semantically_similar_to--> `follows table`  [INFERRED] [semantically similar]
  SUPABASE_SETUP.md → .trae/documents/Optimization Plan for User Profiles & Social Functions.md
- `.env` --semantically_similar_to--> `Environment Variables`  [INFERRED] [semantically similar]
  SUPABASE_SETUP.md → DEPLOYMENT.md
- `Netlify` --semantically_similar_to--> `Netlify`  [INFERRED] [semantically similar]
  GIT_GUIDE.md → DEPLOYMENT.md
- `Vercel` --semantically_similar_to--> `Vercel`  [INFERRED] [semantically similar]
  GIT_GUIDE.md → DEPLOYMENT.md
- `Radial Launcher Menu` --semantically_similar_to--> `Mobile Bottom Navigation`  [INFERRED] [semantically similar]
  docs/MOBILE_PWA_HANDOFF.md → .github/copilot-instructions.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Production Deployment Flow** — deployment_environment_variables, deployment_vercel, deployment_github_auto_deploy, deployment_spa_rewrites, deployment_https_requirement [EXTRACTED 1.00]
- **Email Confirmation Flow** — email_templates_confirm_email_confirmation_url, email_confirmation_fix_supabase_redirect_urls, email_confirmation_fix_auth_callback_route, email_confirmation_fix_authstore_initialize, supabase_setup_email_confirmation [INFERRED 0.85]
- **External Catalog Search APIs** — readme_smart_search, src_lib_api, readme_tmdb_api, readme_rawg_api, readme_google_books_api [INFERRED 0.85]

## Communities (58 total, 4 thin omitted)

### Community 0 - "FeedPage.tsx"
Cohesion: 0.06
Nodes (76): RFC-4122, AutoGrowTextarea(), Props, CommentComposer(), CommentComposerProps, DRAFT_KEYS, CommentThread(), CommentThreadProps (+68 more)

### Community 1 - "queryClient.ts"
Cohesion: 0.13
Nodes (18): idb-keyval, @tanstack/query-async-storage-persister, @tanstack/react-query-persist-client, accountScope, createAccountScope(), createOfflineQueue(), OwnedQueueItem, QueueStorage (+10 more)

### Community 2 - "useProfilePage.ts"
Cohesion: 0.14
Nodes (28): @tanstack/react-query, EntryEditor(), CustomList, useDeleteEntry(), useUpdateEntry(), fetchExploreUsers(), fetchFollowers(), fetchFollowing() (+20 more)

### Community 3 - "PalMark.tsx"
Cohesion: 0.08
Nodes (37): PalMark(), ThemePicker(), HouseBeast(), HouseCard(), House, HOUSE_LIST, HouseId, HOUSES (+29 more)

### Community 4 - "useAddEntryPage.ts"
Cohesion: 0.10
Nodes (41): errorMessage(), matchesTitle(), SaveFeedback, useAddEntryPage(), AddEntryDraft, addEntryDraftKey(), emptyAddEntryDraft(), isCalendarDate() (+33 more)

### Community 5 - "Real-time Replication"
Cohesion: 0.36
Nodes (9): Feed Page, follows table, Supabase Free Tier Realtime Limits, People Page, post_comments table, post_likes table, posts table, Real-time Replication (+1 more)

### Community 6 - "useProfileQueries.ts"
Cohesion: 0.09
Nodes (37): ProfileLink(), ProfileLinkProps, Favorite, fetchFollowersList(), fetchFollowingList(), fetchOwnProfileData(), fetchUserLibrary(), fetchUserPosts() (+29 more)

### Community 7 - "GifPicker.tsx"
Cohesion: 0.14
Nodes (25): Giphy Dependency Advisories, CommentThread, .env.example, GIF Picker State, Giphy GIF Picker Complete, Native Giphy Integration, @giphy/js-fetch-api, Giphy Free Tier Rate Limits (+17 more)

### Community 8 - "WelcomeModal.tsx"
Cohesion: 0.06
Nodes (39): @playwright/test, dismissWelcome(), InstallStepProps, NotificationsStepProps, Step, STEPS, WelcomeModal(), WelcomeModalProps (+31 more)

### Community 9 - "AppShell.tsx"
Cohesion: 0.10
Nodes (24): ActivityPage, AddEntryPage, AdminBadgePanel, AppShell(), FeedPage, getMobileRouteWarmupTargets(), LibraryPage, MOBILE_ROUTE_WARMUP_TARGETS (+16 more)

### Community 10 - "favoriteLists.ts"
Cohesion: 0.24
Nodes (15): statusLabel(), buildOwnerTabs(), buildVisitorTabs(), BUILT_IN_LISTS, countByList(), CUSTOM_LIST_PREFIX, FavoriteTab, isCustomList() (+7 more)

### Community 11 - "useMediaQueries.ts"
Cohesion: 0.14
Nodes (23): fetchMediaStats(), useAddEntry(), useMediaStats(), UserStats, sendMentionNotifications(), runOfflineMutation(), createComment(), CreateCommentInput (+15 more)

### Community 12 - "vite.config.ts"
Cohesion: 0.50
Nodes (3): vite, vite-plugin-pwa, @vitejs/plugin-react

### Community 13 - "compilerOptions"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+13 more)

### Community 14 - "package.json"
Cohesion: 0.11
Nodes (20): name, private, type, version, autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks (+12 more)

### Community 15 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+11 more)

### Community 16 - "devDependencies"
Cohesion: 0.11
Nodes (18): devDependencies, autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, @playwright/test (+10 more)

### Community 17 - "Deployment Guide"
Cohesion: 0.06
Nodes (40): Bug Reporting, Code Style, Contributing Guide, Development Setup, Feature Branch, Feature Suggestions, GitHub Repository diegoperez16/PopCornPal, Pull Request Workflow (+32 more)

### Community 18 - "Mobile PWA Handoff"
Cohesion: 0.14
Nodes (24): Account-Scoped Offline Queue, App Composition Root, codex/mobile-pwa-redesign branch, Collection View, Cover Loading Wrappers, Episode Ratings, IndexedDB, Logged Records Semantics (+16 more)

### Community 19 - "Hosting Prerequisites"
Cohesion: 0.25
Nodes (11): Auth Redirects (/auth/callback, /update-password), Repository-wide ESLint Debt, Hosting Prerequisites, /auth/callback route, AuthPage, authStore, authStore.initialize(), Email Confirmation 404 Fix (+3 more)

### Community 20 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, @giphy/js-fetch-api, @giphy/react-components, idb-keyval, lucide-react, react, react-dom, react-router-dom (+7 more)

### Community 21 - "useAuthStore"
Cohesion: 0.15
Nodes (17): RequireSession(), Notification, NotificationBanner(), NotificationWithFollow, AppNotification, NotificationBell(), notificationText(), timeAgo() (+9 more)

### Community 22 - "Supabase Setup Guide"
Cohesion: 0.18
Nodes (14): VITE_SUPABASE_ANON_KEY, VITE_* Values Are Public, Row Level Security, Supabase anon key, Supabase API Credentials, Edit Profile, .env, follows table (+6 more)

### Community 23 - "Features Showcase"
Cohesion: 0.23
Nodes (13): Browser Support, Features Showcase, Google Books API, Lucide Icons, RAWG API, App Screenshots, Smart Search, Tailwind CSS (+5 more)

### Community 24 - "react-router-dom"
Cohesion: 0.27
Nodes (7): react-router-dom, Brand(), MobileHeader(), AuthMode, AuthPage(), copy, UpdatePasswordPage()

### Community 26 - "PopcornPal"
Cohesion: 0.11
Nodes (19): Supabase, Activity Timeline, Follow System, Friend Badges, Security, Supabase, Supabase Auth, Activity Timeline (+11 more)

### Community 27 - "lucide-react"
Cohesion: 0.27
Nodes (11): Responsive Design, lucide-react, navigation, DesktopNav(), destinations, MobileNav(), polar(), sectorPath() (+3 more)

### Community 28 - "App.tsx"
Cohesion: 0.42
Nodes (6): App(), useAppLifecycle(), SplashLoader(), registerOfflineSync(), queryClient, isSupabaseConfigured

### Community 29 - "PWA Setup Complete"
Cohesion: 0.15
Nodes (17): iOS Home Screen Meta Tags, Mobile Bottom Navigation, Progressive Web App, PWA Installation Testing, PWA Setup Complete, React 19, Tailwind CSS 3, TypeScript (+9 more)

### Community 30 - "Project Structure"
Cohesion: 0.33
Nodes (4): Saved Checkout Reconciliation, index.css, Project Structure, Tailwind CSS 3

### Community 31 - "README"
Cohesion: 0.18
Nodes (12): MIT License, Profile Customization, add-avatar-url-migration.sql, Database Migrations, MIT License, Notifications, notifications-schema.sql, performance-indexes-migration.sql (+4 more)

### Community 32 - "PopcornPal Header/Logo Exporter"
Cohesion: 0.24
Nodes (11): PWA Icons, Canvas PNG Export, downloadLogo(), drawLogo(), PopcornPal Header/Logo Exporter, Canvas Popcorn Bucket Icon, Red→Pink Gradient (#ef4444→#ec4899), downloadLogo() (+3 more)

### Community 33 - "add-comment-images-migration.sql"
Cohesion: 0.22
Nodes (11): add-comment-images-migration.sql, Comment Images Feature, image_url column, post_comments table, Supabase SQL Editor, Nested Comment Threads, Social Feed, add-image-url-migration.sql (+3 more)

### Community 34 - "ActivityPage.tsx"
Cohesion: 0.08
Nodes (31): getMediaIcon(), MediaSelectorModal(), MediaSelectorModalProps, MediaType, SpotlightCard(), ProgressiveImg(), ProgressiveImgProps, RatingField() (+23 more)

### Community 35 - "index.html"
Cohesion: 0.27
Nodes (9): Cinema Ticket Palette, apple-touch-icon.png, Favicon Version Tag, Fraunces (Google Fonts), icon.svg, /src/main.tsx, Theme Color #14181c, Icon Generator Tools (+1 more)

### Community 36 - "mediaStore.ts"
Cohesion: 0.15
Nodes (12): Next Development Phase Roadmap, React Router, Supabase, Zustand, Supabase as Authentication Authority, Zustand, React Router 7, Zustand (+4 more)

### Community 37 - "Popcorn Pal design system"
Cohesion: 0.15
Nodes (12): Control vocabulary (shared classes in src/index.css and components), Copy and vocabulary, Layout and spacing, Mode, Motion, Out of scope, Popcorn Pal design system, States (+4 more)

### Community 38 - "profile-preview.ts"
Cohesion: 0.36
Nodes (8): escapeHtml(), fetchProfile(), first(), handler(), originOf(), PreviewProfile, PreviewRequest, PreviewResponse

### Community 39 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 40 - "LibraryPage.tsx"
Cohesion: 0.17
Nodes (20): NoteField(), saveEntry(), statuses, typeNames, addedYearOf(), buildEntryUpdates(), collectLibraryEntries(), collectLibraryYears() (+12 more)

### Community 42 - "Database Indexes"
Cohesion: 0.29
Nodes (7): Database Indexes, fetchFullLibrary, media_entries table, Optimization Plan for User Profiles & Social Functions, get_feed RPC, Performance Optimizations, media_entries table

### Community 43 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, icons, lint, preview, test, test:e2e

### Community 44 - "react"
Cohesion: 0.05
Nodes (48): react, @supabase/supabase-js, APPLY, __dirname, envFile, envLocal, EXT_BY_MIME, fmtBytes() (+40 more)

### Community 48 - "follows table"
Cohesion: 0.43
Nodes (7): fetchFollowers, fetchFollowersList, fetchFollowing, fetchFollowingList, follows table, Pagination with Infinite Scroll, Split Query Approach

### Community 49 - "RouteErrorBoundary.tsx"
Cohesion: 0.38
Nodes (3): ChunkErrorBoundary, isChunkLoadError(), reloadForChunkError()

### Community 50 - "ProfilePage.tsx"
Cohesion: 0.17
Nodes (14): fetchUserProfile, Lazy Loading User Profile, Modal Loading States, ProfileSkeleton(), AuroraBanner(), LIST_TITLE_MAX, PillTab, PillTabs() (+6 more)

### Community 53 - "sort-house/index.ts"
Cohesion: 0.33
Nodes (4): corsHeaders, Entry, House, HOUSES

### Community 54 - "Validation Suite"
Cohesion: 0.50
Nodes (5): Node 22.18+, Playwright, Validation Suite, Playwright, Test Suite

### Community 55 - "User Authentication"
Cohesion: 0.38
Nodes (7): Confirm Email Template, {{ .ConfirmationURL }}, Popcorn Bucket Email Design, Red→Pink Gradient (#ef4444→#ec4899), Email Confirmation, User Authentication, Username Rules

### Community 56 - "offlineMutationQueue.ts"
Cohesion: 0.14
Nodes (24): NetworkErrorBanner(), OfflineQueueBanner(), canQueueOffline(), emitQueueChange(), enqueueOfflineMutation(), flushOfflineMutationQueue(), getServerSnapshot(), getSnapshot() (+16 more)

### Community 64 - "BadgeRow.tsx"
Cohesion: 0.36
Nodes (9): BadgeMedal(), badgeOrigin(), BadgeRow(), BADGE_HEX, badgeHex(), badgeKind, ORDER, sortBadges() (+1 more)

### Community 67 - "supabase"
Cohesion: 0.25
Nodes (6): episodeKeys, EpisodeRatingInput, EpisodeRatingRow, useUpsertEpisodeRating(), supabase, upsertEpisodeRating()

## Ambiguous Edges - Review These
- `ProfilePage.tsx` → `UserProfilePage.tsx`  [AMBIGUOUS]
  README.md · relation: semantically_similar_to

## Knowledge Gaps
- **330 isolated node(s):** `PreviewRequest`, `PreviewResponse`, `PreviewProfile`, `name`, `private` (+325 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 364 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `ProfilePage.tsx` and `UserProfilePage.tsx`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **Why does `react` connect `react` to `FeedPage.tsx`, `useProfilePage.ts`, `PalMark.tsx`, `useAddEntryPage.ts`, `useProfileQueries.ts`, `GifPicker.tsx`, `WelcomeModal.tsx`, `AppShell.tsx`, `package.json`, `useAuthStore`, `react-router-dom`, `lucide-react`, `App.tsx`, `ActivityPage.tsx`, `LibraryPage.tsx`, `RouteErrorBoundary.tsx`, `ProfilePage.tsx`, `offlineMutationQueue.ts`, `BadgeRow.tsx`?**
  _High betweenness centrality (0.154) - this node is a cross-community bridge._
- **Why does `Project Structure` connect `Project Structure` to `FeedPage.tsx`, `ActivityPage.tsx`, `PalMark.tsx`, `useAddEntryPage.ts`, `useProfilePage.ts`, `mediaStore.ts`, `react`, `vite.config.ts`, `ProfilePage.tsx`, `useAuthStore`, `react-router-dom`, `lucide-react`, `App.tsx`, `README`?**
  _High betweenness centrality (0.142) - this node is a cross-community bridge._
- **Why does `README` connect `README` to `Deployment Guide`, `Mobile PWA Handoff`, `Validation Suite`, `Features Showcase`, `Supabase Setup Guide`, `PopcornPal`, `PWA Setup Complete`, `Project Structure`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **What connects `PreviewRequest`, `PreviewResponse`, `PreviewProfile` to the rest of the system?**
  _330 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `FeedPage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05516596540439458 - nodes in this community are weakly interconnected._
- **Should `queryClient.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12681159420289856 - nodes in this community are weakly interconnected._