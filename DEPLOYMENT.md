# 🚀 Deployment Guide

## Environment Variables Setup

⚠️ **IMPORTANT**: The `.env` file is excluded from git for security. You must configure environment variables in your hosting platform.

### Required Environment Variables

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_TMDB_API_KEY=your_tmdb_api_key
VITE_RAWG_API_KEY=your_rawg_api_key
VITE_GOOGLE_BOOKS_API_KEY=your_google_books_api_key
```

---

## 🎯 Deploy to Vercel (Recommended)

### Step 1: Install Vercel CLI
```bash
npm i -g vercel
```

### Step 2: Deploy from Terminal
```bash
# From project root
vercel

# Follow the prompts:
# - Link to existing project or create new
# - Select project name: PopcornPal
```

### Step 3: Configure Environment Variables

**Option A: Via Vercel Dashboard**
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings → Environment Variables**
4. Add each variable:
   - Variable name: `VITE_SUPABASE_URL`
   - Value: `https://your-project.supabase.co`
   - Click **Add**
5. Repeat for all 5 environment variables
6. Redeploy: **Deployments → ⋯ → Redeploy**

**Option B: Via CLI**
```bash
# Add all environment variables
vercel env add VITE_SUPABASE_URL production
# Paste your value when prompted

vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_TMDB_API_KEY production
vercel env add VITE_RAWG_API_KEY production
vercel env add VITE_GOOGLE_BOOKS_API_KEY production

# Redeploy
vercel --prod
```

### Step 4: Verify Deployment
- Visit your Vercel URL (e.g., `https://popcornpal.vercel.app`)
- Try logging in/signing up
- Add a media entry to test API integrations

---

## 🔷 Deploy to Netlify

### Step 1: Build for Production
```bash
npm run build
```

### Step 2: Deploy via Netlify CLI
```bash
# Install CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod

# Follow prompts and select 'dist' as publish directory
```

### Step 3: Configure Environment Variables

**Via Netlify Dashboard:**
1. Go to https://app.netlify.com
2. Select your site
3. Go to **Site settings → Environment variables**
4. Click **Add a variable**
5. Add each environment variable:
   - Key: `VITE_SUPABASE_URL`
   - Value: `https://your-project.supabase.co`
6. Repeat for all 5 variables
7. Trigger redeploy: **Deploys → Trigger deploy**

**Via CLI:**
```bash
netlify env:set VITE_SUPABASE_URL "https://your-project.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "your_key"
netlify env:set VITE_TMDB_API_KEY "your_key"
netlify env:set VITE_RAWG_API_KEY "your_key"
netlify env:set VITE_GOOGLE_BOOKS_API_KEY "your_key"

# Redeploy
netlify deploy --prod
```

---

## 🎨 Deploy via GitHub (Auto-deploy)

### Vercel with GitHub
1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure project:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add environment variables (see Step 3 in Vercel section)
5. Click **Deploy**

Every push to `main` will auto-deploy! 🎉

### Netlify with GitHub
1. Go to https://app.netlify.com/start
2. Connect to Git → Select GitHub
3. Pick your repository
4. Configure:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Add environment variables (Site settings → Environment variables)
6. Deploy site

Auto-deploys on every push to `main`!

---

## 🔧 Troubleshooting

### Problem: "Supabase client not configured"
**Solution**: Environment variables not set correctly
```bash
# Verify variables in Vercel/Netlify dashboard
# Variable names must match exactly (case-sensitive)
# Redeploy after adding variables
```

### Problem: API searches not working
**Solution**: API keys missing or invalid
```bash
# Check each API key is valid:
# - TMDB: https://www.themoviedb.org/settings/api
# - RAWG: https://rawg.io/apidocs
# - Google Books: https://console.cloud.google.com/apis/credentials
```

### Problem: 404 errors on refresh
**Solution**: Configure redirects for SPA

**Vercel**: Create `vercel.json`
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Netlify**: Create `public/_redirects`
```
/*    /index.html   200
```

### Problem: PWA not installing
**Solution**: Requires HTTPS
- Vercel/Netlify automatically provide HTTPS
- PWAs require secure context (HTTPS)
- Test on deployed URL, not localhost IP

---

## 📊 Post-Deployment Checklist

- [ ] All environment variables configured
- [ ] Can create account / login
- [ ] Can search for movies/shows/games/books
- [ ] Can add media entries
- [ ] Can create posts in feed
- [ ] Can follow users
- [ ] Profile pictures working
- [ ] PWA installs on mobile
- [ ] Offline mode works

---

## 🔐 Security Best Practices

### ✅ DO:
- Use environment variables for all secrets
- Keep `.env` in `.gitignore`
- Use different keys for development/production
- Rotate keys if exposed

### ❌ DON'T:
- Commit `.env` files to git
- Share API keys in public
- Use production keys in development
- Hardcode secrets in code

---

## 🆘 Need Help?

- Vercel Docs: https://vercel.com/docs
- Netlify Docs: https://docs.netlify.com
- Supabase Docs: https://supabase.com/docs

Open an issue if you encounter deployment problems!
