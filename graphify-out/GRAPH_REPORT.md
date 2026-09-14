# Graph Report - PopcornPal  (2026-09-14)

## Corpus Check
- 201 files · ~126,307 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1110 nodes · 2531 edges · 57 communities (52 shown, 3 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 143 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `28c28cb5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- FeedPage.tsx
- queryClient.ts
- BadgeRow.tsx
- PalMark.tsx
- useAddEntryPage.ts
- Real-time Replication
- supabase.ts
- GifPicker.tsx
- WelcomeModal.tsx
- AppShell.tsx
- useProfilePage.ts
- offlineMutationQueue.ts
- README
- compilerOptions
- package.json
- compilerOptions
- devDependencies
- Deployment Guide
- Mobile PWA Handoff
- SleekPopcornRefresh.tsx
- dependencies
- useAuthStore
- Supabase Setup Guide
- Features Showcase
- lucide-react
- appDisplay.ts
- cleanup-base64-images.mjs
- MobileNav.tsx
- App.tsx
- PWA Setup Complete
- AuthPage.tsx
- PopcornPal
- /auth/callback route
- add-comment-images-migration.sql
- verdictFor
- index.html
- mediaStore.ts
- Popcorn Pal design system
- profile-preview.ts
- Product
- LibraryPage.tsx
- Account-Scoped Offline Queue
- Database Indexes
- scripts
- react
- Supabase as Authentication Authority
- follows table
- Brand.tsx
- ProfilePage.tsx
- AdminBadgePanel.tsx
- sort-house/index.ts
- Validation Suite
- sw.ts
- send-push/index.ts
- tsconfig.json

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
- `Netlify` --semantically_similar_to--> `Netlify`  [INFERRED] [semantically similar]
  GIT_GUIDE.md → DEPLOYMENT.md
- `Vercel` --semantically_similar_to--> `Vercel`  [INFERRED] [semantically similar]
  GIT_GUIDE.md → DEPLOYMENT.md
- `Radial Launcher Menu` --semantically_similar_to--> `Mobile Bottom Navigation`  [INFERRED] [semantically similar]
  docs/MOBILE_PWA_HANDOFF.md → .github/copilot-instructions.md
- `.env` --semantically_similar_to--> `Environment Variables`  [INFERRED] [semantically similar]
  SUPABASE_SETUP.md → DEPLOYMENT.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Production Deployment Flow** — deployment_environment_variables, deployment_vercel, deployment_github_auto_deploy, deployment_spa_rewrites, deployment_https_requirement [EXTRACTED 1.00]
- **Email Confirmation Flow** — email_templates_confirm_email_confirmation_url, email_confirmation_fix_supabase_redirect_urls, email_confirmation_fix_auth_callback_route, email_confirmation_fix_authstore_initialize, supabase_setup_email_confirmation [INFERRED 0.85]
- **External Catalog Search APIs** — readme_smart_search, src_lib_api, readme_tmdb_api, readme_rawg_api, readme_google_books_api [INFERRED 0.85]

## Communities (57 total, 3 thin omitted)

### Community 0 - "FeedPage.tsx"
Cohesion: 0.05
Nodes (78): RFC-4122, Props, CommentComposer(), CommentComposerProps, DRAFT_KEYS, CommentThread(), CommentThreadProps, FeedComposer() (+70 more)

### Community 1 - "queryClient.ts"
Cohesion: 0.09
Nodes (33): idb-keyval, @tanstack/query-async-storage-persister, @tanstack/react-query, @tanstack/react-query-persist-client, fetchExploreUsers(), fetchFollowers(), fetchFollowing(), fetchPeopleCounts() (+25 more)

### Community 2 - "BadgeRow.tsx"
Cohesion: 0.36
Nodes (9): BadgeMedal(), badgeOrigin(), BadgeRow(), BADGE_HEX, badgeHex(), badgeKind, ORDER, sortBadges() (+1 more)

### Community 3 - "PalMark.tsx"
Cohesion: 0.10
Nodes (32): PalMark(), ThemePicker(), HouseBeast(), HouseCard(), House, HOUSE_LIST, HouseId, HOUSES (+24 more)

### Community 4 - "useAddEntryPage.ts"
Cohesion: 0.10
Nodes (41): errorMessage(), matchesTitle(), SaveFeedback, useAddEntryPage(), AddEntryDraft, addEntryDraftKey(), emptyAddEntryDraft(), isCalendarDate() (+33 more)

### Community 5 - "Real-time Replication"
Cohesion: 0.36
Nodes (9): Feed Page, follows table, Supabase Free Tier Realtime Limits, People Page, post_comments table, post_likes table, posts table, Real-time Replication (+1 more)

### Community 6 - "supabase.ts"
Cohesion: 0.08
Nodes (39): ProfileLink(), ProfileLinkProps, Favorite, fetchFollowersList(), fetchFollowingList(), fetchOwnProfileData(), fetchUserLibrary(), fetchUserPosts() (+31 more)

### Community 7 - "GifPicker.tsx"
Cohesion: 0.14
Nodes (25): Giphy Dependency Advisories, CommentThread, .env.example, GIF Picker State, Giphy GIF Picker Complete, Native Giphy Integration, @giphy/js-fetch-api, Giphy Free Tier Rate Limits (+17 more)

### Community 8 - "WelcomeModal.tsx"
Cohesion: 0.06
Nodes (39): @playwright/test, dismissWelcome(), InstallStepProps, NotificationsStepProps, Step, STEPS, WelcomeModal(), WelcomeModalProps (+31 more)

### Community 9 - "AppShell.tsx"
Cohesion: 0.10
Nodes (24): ActivityPage, AddEntryPage, AdminBadgePanel, AppShell(), FeedPage, getMobileRouteWarmupTargets(), LibraryPage, MOBILE_ROUTE_WARMUP_TARGETS (+16 more)

### Community 10 - "useProfilePage.ts"
Cohesion: 0.14
Nodes (26): statusLabel(), buildOwnerTabs(), buildVisitorTabs(), BUILT_IN_LISTS, countByList(), CUSTOM_LIST_PREFIX, CustomList, FavoriteTab (+18 more)

### Community 11 - "offlineMutationQueue.ts"
Cohesion: 0.07
Nodes (53): NetworkErrorBanner(), OfflineQueueBanner(), episodeKeys, EpisodeRatingInput, EpisodeRatingRow, useUpsertEpisodeRating(), fetchMediaStats(), useAddEntry() (+45 more)

### Community 12 - "README"
Cohesion: 0.25
Nodes (9): MIT License, Database Migrations, MIT License, Notifications, notifications-schema.sql, performance-indexes-migration.sql, README, Roadmap (+1 more)

### Community 13 - "compilerOptions"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+13 more)

### Community 14 - "package.json"
Cohesion: 0.09
Nodes (25): engines, node, name, private, type, version, autoprefixer, eslint (+17 more)

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
Cohesion: 0.17
Nodes (19): App Composition Root, codex/mobile-pwa-redesign branch, Collection View, Cover Loading Wrappers, Episode Ratings, Repository-wide ESLint Debt, Hosting Prerequisites, Logged Records Semantics (+11 more)

### Community 19 - "SleekPopcornRefresh.tsx"
Cohesion: 0.40
Nodes (3): PopcornParticle, PopcornShapes, SleekPopcornRefreshProps

### Community 20 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, @giphy/js-fetch-api, @giphy/react-components, idb-keyval, lucide-react, react, react-dom, react-router-dom (+7 more)

### Community 21 - "useAuthStore"
Cohesion: 0.17
Nodes (15): RequireSession(), DesktopNav(), Notification, NotificationBanner(), NotificationWithFollow, clearPersistedQueryCache(), persistedCacheKey(), setQueryCacheUser() (+7 more)

### Community 22 - "Supabase Setup Guide"
Cohesion: 0.18
Nodes (14): VITE_SUPABASE_ANON_KEY, VITE_* Values Are Public, Row Level Security, Supabase anon key, Supabase API Credentials, Edit Profile, .env, follows table (+6 more)

### Community 23 - "Features Showcase"
Cohesion: 0.16
Nodes (18): Browser Support, Features Showcase, Follow System, Friend Badges, Google Books API, Lucide Icons, RAWG API, App Screenshots (+10 more)

### Community 24 - "lucide-react"
Cohesion: 0.28
Nodes (8): lucide-react, react-router-dom, navigation, MobileHeader(), AppNotification, NotificationBell(), notificationText(), timeAgo()

### Community 25 - "appDisplay.ts"
Cohesion: 0.43
Nodes (5): applyAppChrome(), isStandalone(), lockPinchZoom(), PINCH_GESTURES, Stub

### Community 26 - "cleanup-base64-images.mjs"
Cohesion: 0.19
Nodes (12): @supabase/supabase-js, APPLY, __dirname, envFile, envLocal, EXT_BY_MIME, fmtBytes(), main() (+4 more)

### Community 27 - "MobileNav.tsx"
Cohesion: 0.43
Nodes (7): Responsive Design, destinations, MobileNav(), polar(), sectorPath(), slotAt(), prefetchRouteModule()

### Community 28 - "App.tsx"
Cohesion: 0.33
Nodes (7): Project Structure, App(), PullToRefresh(), useAppLifecycle(), registerOfflineSync(), queryClient, isSupabaseConfigured

### Community 29 - "PWA Setup Complete"
Cohesion: 0.13
Nodes (20): iOS Home Screen Meta Tags, Mobile Bottom Navigation, Progressive Web App, PWA Icons, PWA Installation Testing, PWA Setup Complete, React 19, Tailwind CSS 3 (+12 more)

### Community 30 - "AuthPage.tsx"
Cohesion: 0.18
Nodes (7): Saved Checkout Reconciliation, index.css, Tailwind CSS 3, VERDICTS, AuthMode, AuthPage(), copy

### Community 31 - "PopcornPal"
Cohesion: 0.15
Nodes (13): Activity Timeline, Profile Customization, Activity Timeline, add-avatar-url-migration.sql, Currently Enjoying, Dark Mode, Media Tracking, People Discovery (+5 more)

### Community 32 - "/auth/callback route"
Cohesion: 0.10
Nodes (28): Auth Redirects (/auth/callback, /update-password), /auth/callback route, AuthPage, authStore, authStore.initialize(), Email Confirmation 404 Fix, /feed route, Supabase Redirect URLs (+20 more)

### Community 33 - "add-comment-images-migration.sql"
Cohesion: 0.22
Nodes (11): add-comment-images-migration.sql, Comment Images Feature, image_url column, post_comments table, Supabase SQL Editor, Nested Comment Threads, Social Feed, add-image-url-migration.sql (+3 more)

### Community 34 - "verdictFor"
Cohesion: 0.07
Nodes (29): getMediaIcon(), MediaSelectorModal(), MediaSelectorModalProps, MediaType, ProgressiveImgProps, RatingField(), LibraryEntryCard(), mediaIcons (+21 more)

### Community 35 - "index.html"
Cohesion: 0.36
Nodes (7): Cinema Ticket Palette, apple-touch-icon.png, Favicon Version Tag, Fraunces (Google Fonts), icon.svg, /src/main.tsx, Theme Color #14181c

### Community 36 - "mediaStore.ts"
Cohesion: 0.18
Nodes (10): Next Development Phase Roadmap, React Router, Supabase, Zustand, React Router 7, Zustand, zustand, MediaEntry (+2 more)

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
Cohesion: 0.14
Nodes (23): NoteField(), EntryEditor(), saveEntry(), statuses, typeNames, addedYearOf(), buildEntryUpdates(), collectLibraryEntries() (+15 more)

### Community 41 - "Account-Scoped Offline Queue"
Cohesion: 0.33
Nodes (7): Account-Scoped Offline Queue, IndexedDB, MDN Offline and Background Operation Guide, Offline Support Limits, Service Worker Update Policy, TanStack Query, Web Locks API

### Community 42 - "Database Indexes"
Cohesion: 0.29
Nodes (7): Database Indexes, fetchFullLibrary, media_entries table, Optimization Plan for User Profiles & Social Functions, get_feed RPC, Performance Optimizations, media_entries table

### Community 43 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, icons, lint, preview, test, test:e2e

### Community 44 - "react"
Cohesion: 0.21
Nodes (11): react, AvatarCropper(), AvatarCropperProps, CropData, ImageCropper(), ImageCropperProps, UserPreviewBadge, UserPreviewData (+3 more)

### Community 45 - "Supabase as Authentication Authority"
Cohesion: 0.50
Nodes (4): Supabase, Supabase as Authentication Authority, Zustand, Supabase

### Community 48 - "follows table"
Cohesion: 0.43
Nodes (7): fetchFollowers, fetchFollowersList, fetchFollowing, fetchFollowingList, follows table, Pagination with Infinite Scroll, Split Query Approach

### Community 49 - "Brand.tsx"
Cohesion: 0.24
Nodes (5): ChunkErrorBoundary, isChunkLoadError(), reloadForChunkError(), Brand(), SplashLoader()

### Community 50 - "ProfilePage.tsx"
Cohesion: 0.13
Nodes (16): fetchUserProfile, Lazy Loading User Profile, Modal Loading States, ProfileSkeleton(), UserAvatarProps, ListedPerson, PeopleListSheet(), PillTab (+8 more)

### Community 51 - "AdminBadgePanel.tsx"
Cohesion: 0.21
Nodes (11): CountUp(), Reveal(), useInView(), usePrefersReducedMotion(), loadAdminBadgePanel(), AdminBadges(), BADGE_COLOR_HEX, BADGE_COLORS (+3 more)

### Community 53 - "sort-house/index.ts"
Cohesion: 0.33
Nodes (4): corsHeaders, Entry, House, HOUSES

### Community 54 - "Validation Suite"
Cohesion: 0.50
Nodes (5): Node 22.18+, Playwright, Validation Suite, Playwright, Test Suite

## Ambiguous Edges - Review These
- `ProfilePage.tsx` → `UserProfilePage.tsx`  [AMBIGUOUS]
  README.md · relation: semantically_similar_to

## Knowledge Gaps
- **330 isolated node(s):** `Mode`, `Tokens (Tailwind names)`, `Type`, `Layout and spacing`, `Control vocabulary (shared classes in src/index.css and components)` (+325 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 369 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `ProfilePage.tsx` and `UserProfilePage.tsx`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **Why does `react` connect `react` to `FeedPage.tsx`, `queryClient.ts`, `BadgeRow.tsx`, `PalMark.tsx`, `useAddEntryPage.ts`, `supabase.ts`, `GifPicker.tsx`, `WelcomeModal.tsx`, `AppShell.tsx`, `useProfilePage.ts`, `offlineMutationQueue.ts`, `package.json`, `SleekPopcornRefresh.tsx`, `useAuthStore`, `lucide-react`, `MobileNav.tsx`, `App.tsx`, `AuthPage.tsx`, `verdictFor`, `LibraryPage.tsx`, `Brand.tsx`, `ProfilePage.tsx`, `AdminBadgePanel.tsx`?**
  _High betweenness centrality (0.173) - this node is a cross-community bridge._
- **Why does `Project Structure` connect `App.tsx` to `FeedPage.tsx`, `queryClient.ts`, `verdictFor`, `useAddEntryPage.ts`, `mediaStore.ts`, `supabase.ts`, `README`, `package.json`, `ProfilePage.tsx`, `useAuthStore`, `lucide-react`, `MobileNav.tsx`, `AuthPage.tsx`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **Why does `README` connect `README` to `Deployment Guide`, `Mobile PWA Handoff`, `Validation Suite`, `Features Showcase`, `Supabase Setup Guide`, `App.tsx`, `PWA Setup Complete`, `PopcornPal`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **What connects `Mode`, `Tokens (Tailwind names)`, `Type` to the rest of the system?**
  _330 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `FeedPage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05133161512027491 - nodes in this community are weakly interconnected._
- **Should `queryClient.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09390243902439024 - nodes in this community are weakly interconnected._