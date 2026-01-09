# Fix Email Confirmation 404 Error

## The Problem
Users clicking email confirmation links get a 404 error.

## The Solution

### 1. Update Supabase Redirect URL

Go to your Supabase dashboard:
1. Navigate to **Authentication** → **URL Configuration**
2. Under **Redirect URLs**, add:
   - For local development: `http://localhost:5173/auth/callback`
   - For production (Vercel): `https://pop-corn-pal.vercel.app/auth/callback`

### 2. Code Changes (Already Applied)
- ✅ Added `/auth/callback` route in App.tsx
- ✅ Updated authStore to redirect to `/feed` after confirmation
- ✅ Auth callback now properly handles email confirmation tokens

### 3. Test the Fix

**Local Testing:**
1. Sign up a new user
2. Check email for confirmation link
3. Click the link
4. Should redirect to `/feed` automatically

**Production (Vercel):**
1. Make sure the Vercel URL is added to Supabase redirect URLs
2. Test with a new signup

## Important Notes

- The `/auth/callback` route uses the same `AuthPage` component
- The `authStore.initialize()` function handles the token exchange
- After successful confirmation, users are redirected to `/feed`
- If no session is found, they'll see the auth page

## Vercel Deployment Note

When deploying to Vercel, make sure to:
1. Add `https://pop-corn-pal.vercel.app/auth/callback` to Supabase redirect URLs
2. Commit and push these changes
3. Vercel will auto-deploy
4. Test email confirmation with your production URL
