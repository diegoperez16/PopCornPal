# Git Setup & Deployment Guide

## 🚀 Quick Start - Push to GitHub

```bash
# 1. Initialize git (if not already done)
cd /Users/diegoperez/Desktop/RabbitHole/PopcornPal
git init

# 2. Add all files
git add .

# 3. Make your first commit
git commit -m "Initial commit: PopcornPal social media tracking app"

# 4. Add remote repository
git remote add origin https://github.com/diegoperez16/PopCornPal.git

# 5. Push to GitHub
git branch -M main
git push -u origin main
```

## 📝 Important: Before Pushing

### ✅ Verify .env is NOT included
```bash
# This should show .env is ignored
git status
# .env should NOT appear in the list

# Double check .gitignore contains:
cat .gitignore | grep "\.env"
```

### ✅ Checklist
- [ ] `.env` file is NOT committed (contains secrets)
- [ ] `.env.example` IS committed (template without secrets)
- [ ] All migration SQL files are included
- [ ] README.md is complete and accurate
- [ ] SUPABASE_SETUP.md has setup instructions

## 🔄 Regular Git Workflow

### Making Changes
```bash
# Check what changed
git status

# Stage specific files
git add src/pages/NewFeature.tsx

# Or stage all changes
git add .

# Commit with a meaningful message
git commit -m "Add: New feature description"

# Push to GitHub
git push
```

### Commit Message Conventions
```
Add: New feature or file
Update: Changes to existing functionality
Fix: Bug fixes
Refactor: Code improvements without changing functionality
Docs: Documentation updates
Style: Formatting, missing semicolons, etc.
```

## 🌿 Branching Strategy

### Create a Feature Branch
```bash
# Create and switch to new branch
git checkout -b feature/amazing-feature

# Make your changes...
git add .
git commit -m "Add amazing feature"

# Push branch to GitHub
git push -u origin feature/amazing-feature

# Create Pull Request on GitHub
```

### Merge Back to Main
```bash
# Switch to main
git checkout main

# Pull latest changes
git pull origin main

# Merge your feature
git merge feature/amazing-feature

# Push to GitHub
git push origin main

# Delete feature branch (optional)
git branch -d feature/amazing-feature
git push origin --delete feature/amazing-feature
```

## 🚢 Deployment Options

### Option 1: Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
# - VITE_TMDB_API_KEY
# - VITE_RAWG_API_KEY
# - VITE_GOOGLE_BOOKS_API_KEY
```

### Option 2: Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Build
npm run build

# Deploy
netlify deploy --prod

# Set environment variables in Netlify dashboard
```

### Option 3: GitHub Pages (Static Only)
```bash
# Add to vite.config.ts:
# base: '/PopCornPal/'

# Build
npm run build

# Deploy to gh-pages branch
npm run deploy
```

## 🔒 Security Reminders

### Never Commit:
- ❌ `.env` files
- ❌ API keys or secrets
- ❌ Database credentials
- ❌ Access tokens

### Always Keep in .gitignore:
- ✅ `.env`
- ✅ `.env.local`
- ✅ `.env.production`
- ✅ `node_modules/`
- ✅ `dist/`

## 🆘 Common Issues

### Problem: .env was committed by accident
```bash
# Remove from git but keep local file
git rm --cached .env

# Commit the removal
git commit -m "Remove .env from version control"

# Push
git push
```

### Problem: Wrong remote URL
```bash
# Check current remote
git remote -v

# Update remote URL
git remote set-url origin https://github.com/diegoperez16/PopCornPal.git
```

### Problem: Need to undo last commit
```bash
# Undo commit but keep changes
git reset --soft HEAD~1

# Undo commit and discard changes (careful!)
git reset --hard HEAD~1
```

## 📊 Repository Settings (GitHub)

1. **Go to Settings → General**
   - Description: "Social media platform for tracking movies, TV shows, games, and books"
   - Website: Your deployed URL
   - Topics: `react`, `typescript`, `pwa`, `supabase`, `social-media`, `vite`, `tailwindcss`

2. **Settings → Pages** (if using GitHub Pages)
   - Source: Deploy from branch
   - Branch: `gh-pages` / `root`

3. **Settings → Secrets and Variables → Actions** (if using CI/CD)
   - Add: `VITE_SUPABASE_URL`
   - Add: `VITE_SUPABASE_ANON_KEY`
   - Add other API keys

## 🎉 You're Ready!

Your repository is now ready to be pushed to GitHub. Follow the "Quick Start" section at the top to push your code.

After pushing, consider:
- Adding a nice README badge
- Setting up GitHub Actions for CI/CD
- Creating a GitHub Project for task management
- Enabling GitHub Discussions for community
