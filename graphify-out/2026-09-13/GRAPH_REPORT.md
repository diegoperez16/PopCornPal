# Graph Report - PopcornPal  (2026-09-13)

## Corpus Check
- 200 files · ~124,659 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1108 nodes · 2572 edges · 70 communities (64 shown, 4 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 143 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0a1df7a6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- FeedPage.tsx
- queryClient.ts
- PeoplePage.tsx
- PalMark.tsx
- useAddEntryPage.ts
- Real-time Replication
- useProfileQueries.ts
- GifPicker.tsx
- WelcomeModal.tsx
- AppShell.tsx
- mediaStore.ts
- offlineMutationQueue.ts
- supabase.ts
- compilerOptions
- package.json
- compilerOptions
- devDependencies
- Deployment Guide
- Mobile PWA Handoff
- dependencies
- useAuthStore
- Supabase Setup Guide
- Features Showcase
- App.tsx
- cleanup-base64-images.mjs
- PopcornPal
- DesktopNav.tsx
- useAppLifecycle.ts
- PWA Setup Complete
- Project Structure
- README
- /auth/callback route
- add-comment-images-migration.sql
- ActivityPage.tsx
- index.html
- useProfilePage.ts
- Popcorn Pal design system
- profile-preview.ts
- Product
- LibraryPage.tsx
- ProfileStats.tsx
- follows table
- scripts
- EntryEditor.tsx
- lucide-react
- AdminBadgePanel.tsx
- isAuthError
- useFeedQueries.ts
- RouteErrorBoundary.tsx
- ProfilePage.tsx
- Zustand
- sort-house/index.ts
- Validation Suite
- FeedComposer.tsx
- NetworkStatus.tsx
- react
- sw.ts
- send-push/index.ts
- tsconfig.json
- Contributing Guide
- BadgeRow.tsx
- main.tsx
- Account-Scoped Offline Queue
- useEpisodeQueries.ts
- SleekPopcornRefresh.tsx
- vite.config.ts
- ProfileLink.tsx
- engines

## God Nodes (most connected - your core abstractions)
1. `react` - 54 edges
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

## Communities (70 total, 4 thin omitted)

### Community 0 - "FeedPage.tsx"
Cohesion: 0.12
Nodes (17): FeedPostCard, FeedSkeleton(), appendOptimisticComment(), useCreateComment(), CommentDeletePayload, CommentInsertPayload, CommentLikeDeletePayload, CommentLikeInsertPayload (+9 more)

### Community 1 - "queryClient.ts"
Cohesion: 0.15
Nodes (17): idb-keyval, @tanstack/query-async-storage-persister, @tanstack/react-query, @tanstack/react-query-persist-client, fetchMediaEntries(), fetchMediaStats(), MediaEntry, useMediaEntries() (+9 more)

### Community 2 - "PeoplePage.tsx"
Cohesion: 0.23
Nodes (17): fetchExploreUsers(), fetchFollowers(), fetchFollowing(), fetchPeopleCounts(), fetchSearchPeople(), useExploreUsers(), useFollowers(), useFollowing() (+9 more)

### Community 3 - "PalMark.tsx"
Cohesion: 0.10
Nodes (32): PalMark(), ThemePicker(), HouseBeast(), HouseCard(), House, HOUSE_LIST, HouseId, HOUSES (+24 more)

### Community 4 - "useAddEntryPage.ts"
Cohesion: 0.09
Nodes (43): useUpsertEpisodeRating(), useAddEntry(), errorMessage(), matchesTitle(), SaveFeedback, useAddEntryPage(), AddEntryDraft, addEntryDraftKey() (+35 more)

### Community 5 - "Real-time Replication"
Cohesion: 0.36
Nodes (9): Feed Page, follows table, Supabase Free Tier Realtime Limits, People Page, post_comments table, post_likes table, posts table, Real-time Replication (+1 more)

### Community 6 - "useProfileQueries.ts"
Cohesion: 0.10
Nodes (33): CustomList, RatedRow, ShelfSummary, summarizeShelf(), Favorite, fetchFollowersList(), fetchFollowingList(), fetchOwnProfileData() (+25 more)

### Community 7 - "GifPicker.tsx"
Cohesion: 0.14
Nodes (24): Giphy Dependency Advisories, CommentThread, .env.example, GIF Picker State, Giphy GIF Picker Complete, Native Giphy Integration, @giphy/js-fetch-api, Giphy Free Tier Rate Limits (+16 more)

### Community 8 - "WelcomeModal.tsx"
Cohesion: 0.06
Nodes (39): @playwright/test, dismissWelcome(), InstallStepProps, NotificationsStepProps, Step, STEPS, WelcomeModal(), WelcomeModalProps (+31 more)

### Community 9 - "AppShell.tsx"
Cohesion: 0.10
Nodes (23): ActivityPage, AddEntryPage, AdminBadgePanel, AppShell(), FeedPage, getMobileRouteWarmupTargets(), LibraryPage, MOBILE_ROUTE_WARMUP_TARGETS (+15 more)

### Community 10 - "mediaStore.ts"
Cohesion: 0.33
Nodes (5): zustand, MediaEntry, MediaUIState, useMediaStore, UserStats

### Community 11 - "offlineMutationQueue.ts"
Cohesion: 0.12
Nodes (30): extractMentions(), sendMentionNotifications(), listeners, migrateLegacyQueue(), OfflineMutation, OfflineMutationBase, OfflineMutationInput, offlineMutationStore (+22 more)

### Community 12 - "supabase.ts"
Cohesion: 0.20
Nodes (12): dataUriToBlob(), EXT_BY_MIME, persistProfileImage(), BackgroundCrop, CropSettings, fetchWithTimeout(), lockNoOp(), makeClient() (+4 more)

### Community 13 - "compilerOptions"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+13 more)

### Community 14 - "package.json"
Cohesion: 0.10
Nodes (22): name, private, type, version, autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks (+14 more)

### Community 15 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+11 more)

### Community 16 - "devDependencies"
Cohesion: 0.11
Nodes (18): devDependencies, autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, @playwright/test (+10 more)

### Community 17 - "Deployment Guide"
Cohesion: 0.10
Nodes (28): API Key Troubleshooting, Deployment Guide, Environment Variables, GitHub Auto-Deploy, Netlify, Netlify CLI, public/_redirects, Post-Deployment Checklist (+20 more)

### Community 18 - "Mobile PWA Handoff"
Cohesion: 0.17
Nodes (19): App Composition Root, codex/mobile-pwa-redesign branch, Collection View, Cover Loading Wrappers, Episode Ratings, Repository-wide ESLint Debt, Hosting Prerequisites, Logged Records Semantics (+11 more)

### Community 20 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, @giphy/js-fetch-api, @giphy/react-components, idb-keyval, lucide-react, react, react-dom, react-router-dom (+7 more)

### Community 21 - "useAuthStore"
Cohesion: 0.11
Nodes (21): RequireSession(), PullToRefresh(), Notification, NotificationBanner(), NotificationWithFollow, AppNotification, NotificationBell(), notificationText() (+13 more)

### Community 22 - "Supabase Setup Guide"
Cohesion: 0.15
Nodes (16): VITE_SUPABASE_ANON_KEY, VITE_* Values Are Public, Row Level Security, Security, Supabase, Supabase anon key, Supabase API Credentials, Edit Profile (+8 more)

### Community 23 - "Features Showcase"
Cohesion: 0.15
Nodes (18): Activity Timeline, Browser Support, Features Showcase, Follow System, Friend Badges, Google Books API, Lucide Icons, RAWG API (+10 more)

### Community 24 - "App.tsx"
Cohesion: 0.47
Nodes (4): react-router-dom, Brand(), MobileHeader(), SplashLoader()

### Community 25 - "cleanup-base64-images.mjs"
Cohesion: 0.19
Nodes (12): @supabase/supabase-js, APPLY, __dirname, envFile, envLocal, EXT_BY_MIME, fmtBytes(), main() (+4 more)

### Community 26 - "PopcornPal"
Cohesion: 0.18
Nodes (13): vite-plugin-pwa, Currently Enjoying, Dark Mode, Media Tracking, Offline Support, People Discovery, Installing on Your Phone, PopcornPal (+5 more)

### Community 27 - "DesktopNav.tsx"
Cohesion: 0.28
Nodes (10): Responsive Design, navigation, DesktopNav(), destinations, MobileNav(), polar(), sectorPath(), slotAt() (+2 more)

### Community 28 - "useAppLifecycle.ts"
Cohesion: 0.23
Nodes (12): App(), useAppLifecycle(), canQueueOffline(), emitQueueChange(), enqueueForOwner(), enqueueOfflineMutation(), flushOfflineMutationQueue(), initializeOfflineMutationQueue() (+4 more)

### Community 29 - "PWA Setup Complete"
Cohesion: 0.16
Nodes (15): iOS Home Screen Meta Tags, Mobile Bottom Navigation, Progressive Web App, PWA Icons, PWA Installation Testing, PWA Setup Complete, React 19, Tailwind CSS 3 (+7 more)

### Community 30 - "Project Structure"
Cohesion: 0.24
Nodes (6): Saved Checkout Reconciliation, index.css, Project Structure, Tailwind CSS 3, AuthMode, copy

### Community 31 - "README"
Cohesion: 0.18
Nodes (12): MIT License, Profile Customization, add-avatar-url-migration.sql, Database Migrations, MIT License, Notifications, notifications-schema.sql, performance-indexes-migration.sql (+4 more)

### Community 32 - "/auth/callback route"
Cohesion: 0.10
Nodes (28): Auth Redirects (/auth/callback, /update-password), /auth/callback route, AuthPage, authStore, authStore.initialize(), Email Confirmation 404 Fix, /feed route, Supabase Redirect URLs (+20 more)

### Community 33 - "add-comment-images-migration.sql"
Cohesion: 0.22
Nodes (11): add-comment-images-migration.sql, Comment Images Feature, image_url column, post_comments table, Supabase SQL Editor, Nested Comment Threads, Social Feed, add-image-url-migration.sql (+3 more)

### Community 34 - "ActivityPage.tsx"
Cohesion: 0.10
Nodes (25): getMediaIcon(), MediaSelectorModal(), MediaSelectorModalProps, MediaType, ProgressiveImg(), ProgressiveImgProps, LibraryEntryCard(), mediaIcons (+17 more)

### Community 35 - "index.html"
Cohesion: 0.36
Nodes (7): Cinema Ticket Palette, apple-touch-icon.png, Favicon Version Tag, Fraunces (Google Fonts), icon.svg, /src/main.tsx, Theme Color #14181c

### Community 36 - "useProfilePage.ts"
Cohesion: 0.15
Nodes (23): EntryEditor(), buildOwnerTabs(), buildVisitorTabs(), BUILT_IN_LISTS, countByList(), CUSTOM_LIST_PREFIX, FavoriteTab, isCustomList() (+15 more)

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
Cohesion: 0.21
Nodes (17): saveEntry(), addedYearOf(), buildEntryUpdates(), collectLibraryEntries(), collectLibraryYears(), collectUniqueMedia(), countLibraryEntries(), LibrarySort (+9 more)

### Community 41 - "ProfileStats.tsx"
Cohesion: 0.36
Nodes (6): CountUp(), Reveal(), SpotlightCard(), useInView(), usePrefersReducedMotion(), ProfileStats()

### Community 42 - "follows table"
Cohesion: 0.18
Nodes (14): Database Indexes, fetchFollowers, fetchFollowersList, fetchFollowing, fetchFollowingList, fetchFullLibrary, follows table, media_entries table (+6 more)

### Community 43 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, icons, lint, preview, test, test:e2e

### Community 44 - "EntryEditor.tsx"
Cohesion: 0.22
Nodes (8): NoteComposer(), NoteField(), RatingField(), useKeyboardFit(), statuses, typeNames, EntryDraft, STATUS_LABELS

### Community 45 - "lucide-react"
Cohesion: 0.25
Nodes (14): lucide-react, CommentThread(), CommentThreadProps, FeedPostCardComponent(), FeedPostCardProps, getMediaIcon(), Comment, findImageLink() (+6 more)

### Community 46 - "AdminBadgePanel.tsx"
Cohesion: 0.29
Nodes (7): loadAdminBadgePanel(), AdminBadges(), BADGE_COLOR_HEX, BADGE_COLORS, BadgeFormData, badgeHex(), Profile

### Community 47 - "isAuthError"
Cohesion: 0.21
Nodes (10): accountScope, createAccountScope(), createOfflineQueue(), OwnedQueueItem, QueueStorage, queryCache, errorRecord(), isAuthError() (+2 more)

### Community 48 - "useFeedQueries.ts"
Cohesion: 0.23
Nodes (18): buildRealtimeComment(), cloneComment(), cloneCommentsTree(), CommentsTree, fetchCommentsTree(), fetchFeedPage(), fetchSinglePost(), removeCommentFromTree() (+10 more)

### Community 49 - "RouteErrorBoundary.tsx"
Cohesion: 0.38
Nodes (3): ChunkErrorBoundary, isChunkLoadError(), reloadForChunkError()

### Community 50 - "ProfilePage.tsx"
Cohesion: 0.12
Nodes (22): fetchUserProfile, Lazy Loading User Profile, Modal Loading States, AvatarCropper(), AvatarCropperProps, CropData, ImageCropper(), ImageCropperProps (+14 more)

### Community 52 - "Zustand"
Cohesion: 0.20
Nodes (10): Next Development Phase Roadmap, React Router, Supabase, Zustand, Supabase, Supabase as Authentication Authority, Zustand, React Router 7 (+2 more)

### Community 53 - "sort-house/index.ts"
Cohesion: 0.33
Nodes (4): corsHeaders, Entry, House, HOUSES

### Community 54 - "Validation Suite"
Cohesion: 0.50
Nodes (5): Node 22.18+, Playwright, Validation Suite, Playwright, Test Suite

### Community 55 - "FeedComposer.tsx"
Cohesion: 0.25
Nodes (11): RFC-4122, CommentComposer(), FeedComposer(), FeedComposerProps, getMediaIcon(), MediaFilterType, useCreatePost(), useMentionAutocomplete() (+3 more)

### Community 56 - "NetworkStatus.tsx"
Cohesion: 0.36
Nodes (7): NetworkErrorBanner(), OfflineQueueBanner(), getServerSnapshot(), getSnapshot(), subscribe(), useOfflineMutationCount(), useOfflineMutationError()

### Community 57 - "react"
Cohesion: 0.17
Nodes (11): react, AutoGrowTextarea(), Props, CommentComposerProps, DRAFT_KEYS, MentionDropdown(), MentionUser, Props (+3 more)

### Community 61 - "Contributing Guide"
Cohesion: 0.18
Nodes (12): Bug Reporting, Code Style, Contributing Guide, Development Setup, Feature Branch, Feature Suggestions, GitHub Repository diegoperez16/PopCornPal, Pull Request Workflow (+4 more)

### Community 64 - "BadgeRow.tsx"
Cohesion: 0.36
Nodes (9): BadgeMedal(), badgeOrigin(), BadgeRow(), BADGE_HEX, badgeHex(), badgeKind, ORDER, sortBadges() (+1 more)

### Community 65 - "main.tsx"
Cohesion: 0.39
Nodes (5): applyAppChrome(), isStandalone(), lockPinchZoom(), PINCH_GESTURES, Stub

### Community 66 - "Account-Scoped Offline Queue"
Cohesion: 0.33
Nodes (7): Account-Scoped Offline Queue, IndexedDB, MDN Offline and Background Operation Guide, Offline Support Limits, Service Worker Update Policy, TanStack Query, Web Locks API

### Community 67 - "useEpisodeQueries.ts"
Cohesion: 0.33
Nodes (4): episodeKeys, EpisodeRatingInput, EpisodeRatingRow, upsertEpisodeRating()

### Community 68 - "SleekPopcornRefresh.tsx"
Cohesion: 0.40
Nodes (3): PopcornParticle, PopcornShapes, SleekPopcornRefreshProps

### Community 69 - "vite.config.ts"
Cohesion: 0.50
Nodes (3): vite, vite-plugin-pwa, @vitejs/plugin-react

### Community 70 - "ProfileLink.tsx"
Cohesion: 0.67
Nodes (3): ProfileLink(), ProfileLinkProps, prefetchUserProfile()

## Ambiguous Edges - Review These
- `ProfilePage.tsx` → `UserProfilePage.tsx`  [AMBIGUOUS]
  README.md · relation: semantically_similar_to

## Knowledge Gaps
- **328 isolated node(s):** `PreviewRequest`, `PreviewResponse`, `PreviewProfile`, `name`, `private` (+323 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 362 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `ProfilePage.tsx` and `UserProfilePage.tsx`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **Why does `react` connect `react` to `FeedPage.tsx`, `PeoplePage.tsx`, `PalMark.tsx`, `useAddEntryPage.ts`, `useProfileQueries.ts`, `GifPicker.tsx`, `WelcomeModal.tsx`, `AppShell.tsx`, `offlineMutationQueue.ts`, `package.json`, `useAuthStore`, `App.tsx`, `DesktopNav.tsx`, `useAppLifecycle.ts`, `Project Structure`, `ActivityPage.tsx`, `useProfilePage.ts`, `LibraryPage.tsx`, `ProfileStats.tsx`, `EntryEditor.tsx`, `lucide-react`, `AdminBadgePanel.tsx`, `RouteErrorBoundary.tsx`, `ProfilePage.tsx`, `FeedComposer.tsx`, `NetworkStatus.tsx`, `BadgeRow.tsx`, `main.tsx`, `SleekPopcornRefresh.tsx`, `ProfileLink.tsx`?**
  _High betweenness centrality (0.156) - this node is a cross-community bridge._
- **Why does `Project Structure` connect `Project Structure` to `FeedPage.tsx`, `main.tsx`, `ActivityPage.tsx`, `PeoplePage.tsx`, `useAddEntryPage.ts`, `vite.config.ts`, `mediaStore.ts`, `supabase.ts`, `ProfilePage.tsx`, `useAuthStore`, `App.tsx`, `DesktopNav.tsx`, `README`?**
  _High betweenness centrality (0.127) - this node is a cross-community bridge._
- **Why does `README` connect `README` to `Deployment Guide`, `Mobile PWA Handoff`, `Validation Suite`, `Features Showcase`, `Supabase Setup Guide`, `PopcornPal`, `Contributing Guide`, `Project Structure`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **What connects `PreviewRequest`, `PreviewResponse`, `PreviewProfile` to the rest of the system?**
  _328 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `FeedPage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12280701754385964 - nodes in this community are weakly interconnected._
- **Should `queryClient.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14736842105263157 - nodes in this community are weakly interconnected._