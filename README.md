# 🍿 PopcornPal

A modern social media platform for tracking and sharing your entertainment journey. Log movies, TV shows, games, and books, connect with friends, and discover what everyone's enjoying.

## Mobile PWA redesign

The cinematic mobile redesign uses a central radial launcher, a focused logging sheet, account-scoped offline data, and a responsive collection. See [the implementation and release handoff](docs/MOBILE_PWA_HANDOFF.md) for architecture changes, validation, and remaining hosting prerequisites.

Run `npm test` for regression tests and `npm run test:e2e` for the isolated production-browser/PWA suite. Browser tests require `npx playwright install chromium`.

## ✨ Features

### 📱 Core Features
- **Media Tracking** - Log movies, TV shows, games, and books with ratings, status, and notes
- **Activity Timeline** - View your complete entertainment history organized by day
- **Smart Search** - Find media using TMDB (movies/shows), RAWG (games), and Google Books APIs
- **Currently Enjoying** - Showcase what you're actively watching, reading, or playing

### 👥 Social Features
- **Feed** - Share posts about what you're enjoying with media attachments and images
- **Follow System** - Follow friends and see their activity in your feed
- **Comments & Likes** - Engage with posts through nested comments (up to 5 levels) and likes
- **People Discovery** - Search users, see followers/following with friend badges
- **Notifications** - Get notified when someone follows you

### 🎨 User Experience
- **Profile Pictures** - Upload images or use GIF avatars (supports Giphy links)
- **Progressive Web App (PWA)** - Install on iOS/Android like a native app
- **Responsive Design** - Beautiful UI on mobile, tablet, and desktop
- **Dark Mode** - Eye-friendly interface optimized for any time of day
- **Offline Support** - Access your data without internet connection

## 🚀 Quick Start

### Prerequisites
- Node.js 22.18+ and npm
- Supabase account (free tier available at [supabase.com](https://supabase.com))

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your Supabase credentials
```

### Database Setup

1. Create a new Supabase project
2. Run the SQL schema from `supabase-schema.sql` in your Supabase SQL Editor
3. Copy your Supabase URL and anon key to `.env`

**📖 Detailed setup guide:** See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

### Run the App

```bash
# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and create your account!

### Deploy to Production

```bash
# Build the app
npm run build

# Preview production build locally
npm run preview
```

**🚀 Ready to deploy?** See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment guides (Vercel, Netlify, etc.)

> **Important**: Environment variables must be configured in your hosting platform. The `.env` file is excluded from git for security.

## 📱 Installing on Your Phone

### iOS (Safari)
1. Open PopcornPal in Safari
2. Tap the **Share** button (square with arrow)
3. Scroll down and tap **"Add to Home Screen"**
4. Name it "PopcornPal" and tap **Add**
5. Launch from your home screen like a native app!

### Android (Chrome)
1. Open PopcornPal in Chrome
2. Tap the **menu** (three dots)
3. Select **"Install app"** or **"Add to Home Screen"**
4. Confirm and launch from your home screen!

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 3 (mobile-first)
- **PWA**: vite-plugin-pwa (offline support, app installation)
- **State Management**: Zustand (lightweight global state)
- **Routing**: React Router 7
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Authentication**: Supabase Auth (email/password + social providers ready)

## 📂 Project Structure

```
PopcornPal/
├── public/                    # Static assets (icons, manifest)
│   ├── pwa-*.png             # PWA icons (generated)
│   └── apple-touch-icon.png  # iOS home screen icon
├── src/
│   ├── lib/
│   │   ├── supabase.ts       # Supabase client setup
│   │   └── api.ts            # External API integrations (TMDB, RAWG, Books)
│   ├── store/
│   │   ├── authStore.ts      # Authentication state (Zustand)
│   │   └── mediaStore.ts     # Media entries state (Zustand)
│   ├── pages/
│   │   ├── AuthPage.tsx      # Login/signup
│   │   ├── ProfilePage.tsx   # User profile with stats
│   │   ├── AddEntryPage.tsx  # Add media entries
│   │   ├── FeedPage.tsx      # Social feed with posts
│   │   ├── PeoplePage.tsx    # User discovery and follows
│   │   └── ActivityPage.tsx  # Personal timeline by day
│   ├── components/
│   │   ├── MobileNav.tsx     # Bottom tab navigation (mobile)
│   │   ├── DesktopNav.tsx    # Top navigation bar (desktop)
│   │   └── NotificationBanner.tsx  # Follow notifications
│   ├── App.tsx               # Main app with routing
│   ├── main.tsx              # App entry point
│   └── index.css             # Global styles + Tailwind
├── supabase-schema.sql       # Main database schema
├── *.sql                     # Database migrations
├── SUPABASE_SETUP.md         # Detailed setup guide
├── vite.config.ts            # Vite + PWA configuration
└── tailwind.config.js        # Tailwind CSS configuration
```

## 📋 Database Migrations

After setting up the main schema, run these migrations in order:

1. **`add-avatar-url-migration.sql`** - Adds profile picture support
2. **`add-image-url-migration.sql`** - Adds image attachments to posts
3. **`add-nested-comments-migration.sql`** - Enables threaded comment replies
4. **`notifications-schema.sql`** - Adds notification system
5. **`performance-indexes-migration.sql`** - Optimizes query performance

## 🗺️ Roadmap

### Phase 1: Foundation ✅ COMPLETE
- [x] PWA setup with home screen installation
- [x] Mobile-first responsive UI
- [x] Routing (React Router 7)
- [x] State management (Zustand)
- [x] Backend integration (Supabase)
- [x] Authentication (email/password)
- [x] User profiles with bio & avatar

### Phase 2: Media Tracking ✅ COMPLETE
- [x] Add entry form (movies, shows, games, books)
- [x] Rating system (1-5 stars)
- [x] Status tracking (completed, in-progress, planned)
- [x] Search with external APIs (TMDB, RAWG, Google Books)
- [x] User's media library
- [x] Edit/delete entries
- [x] Activity timeline (entries by day with timestamps)
- [x] "Currently Enjoying" showcase

### Phase 3: Social Features ✅ COMPLETE
- [x] Follow system (follow/unfollow users)
- [x] Activity feed (posts from followed users)
- [x] Public user profiles
- [x] Comments with nested replies (5 levels deep)
- [x] Likes and reactions
- [x] Share functionality
- [x] Media attachments in posts
- [x] Image uploads (paste & upload)
- [x] Profile pictures (images & GIFs)
- [x] Notifications (followers)
- [x] User discovery & search

### Phase 4: Future Enhancements 🚀
- [ ] Year-end recap (stats & shareable graphics)
- [ ] Lists & collections
- [ ] Recommendations engine
- [ ] Social login (Google, GitHub)
- [ ] Direct messaging
- [ ] Achievements & badges
- [ ] Export data

## 🤝 Contributing

Contributions welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📸 Screenshots & Features

See [FEATURES.md](FEATURES.md) for detailed feature showcase and screenshots.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  Made with ❤️ by <a href="https://github.com/diegoperez16">Diego Perez</a>
  <br/>
  <br/>
  ⭐ Star this repo if you find it useful!
  <br/>
  <br/>
  <a href="https://github.com/diegoperez16/PopCornPal/issues">Report Bug</a>
  ·
  <a href="https://github.com/diegoperez16/PopCornPal/issues">Request Feature</a>
</div>

MIT License - feel free to use this project for learning or personal use.

## 🙏 Acknowledgments

- Inspired by Letterboxd, Goodreads, and Spotify Wrapped
- Built with ❤️ for media enthusiasts

---

**Note**: This is an early-stage project. More features coming soon! Star ⭐ the repo to follow progress.
