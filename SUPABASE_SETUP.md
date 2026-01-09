# 🚀 Setting Up Supabase for PopcornPal

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Fill in the details:
   - **Name**: PopcornPal
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is perfect to start
4. Click **"Create new project"** and wait ~2 minutes for setup

## Step 2: Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Copy the entire contents of `supabase-schema.sql` file
4. Paste it into the SQL editor
5. Click **"Run"** (or press Cmd/Ctrl + Enter)
6. You should see: "Success. No rows returned"

This creates:
- ✅ `profiles` table (user profiles with username, bio, avatar)
- ✅ `media_entries` table (movies, shows, games, books tracking)
- ✅ `follows` table (social follow relationships)
- ✅ Row Level Security (RLS) policies for data protection
- ✅ Helper views for statistics

## Step 3: Get Your API Credentials

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy these two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

## Step 4: Configure Your App

1. In your PopcornPal project, create a `.env` file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and add your credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. **IMPORTANT**: Restart your dev server:
   ```bash
   npm run dev
   ```

## Step 5: Test the Authentication

1. Open http://localhost:5173
2. Click **"Get Started"** or **"Create Free Account"**
3. Fill in:
   - **Username**: Choose a unique username (3-30 chars, lowercase, numbers, underscores)
   - **Email**: Your email address
   - **Password**: At least 6 characters
4. Click **"Sign Up"**
5. Check your email for the confirmation link (Supabase sends it automatically)
6. Click the confirmation link
7. You'll be redirected back to the app and logged in!

## Step 6: Verify Your Profile

1. After signing up, you should see your profile page
2. Click **"Edit Profile"** to add:
   - Full name
   - Bio
3. Click **"Save Changes"**
4. Your profile is ready!

## 🎉 You're All Set!

Your PopcornPal app now has:
- ✅ User authentication (sign up, sign in, sign out)
- ✅ User profiles with editable bio and name
- ✅ Secure database with Row Level Security
- ✅ Ready for media entry tracking

## 🔧 Troubleshooting

**"Missing Supabase environment variables" error:**
- Make sure you created the `.env` file
- Verify the variable names start with `VITE_`
- Restart the dev server after creating `.env`

**"Invalid API key" error:**
- Double-check you copied the **anon** key (not the service_role key)
- Make sure there are no extra spaces in `.env`

**Email confirmation not arriving:**
- Check spam folder
- In Supabase dashboard → Authentication → Settings, you can disable email confirmation for testing

**Username already taken:**
- Usernames must be unique. Try a different one.

## 🔐 Security Notes

- ✅ Row Level Security (RLS) is enabled - users can only edit their own data
- ✅ The `anon` key is safe to expose in frontend code
- ✅ Never commit your `.env` file to git (it's already in `.gitignore`)
- ✅ Email confirmation prevents spam accounts

## 📱 Next Steps

Now that user profiles work, you can:
1. Add media entry tracking (movies, shows, games, books)
2. Build the "Add Entry" form
3. Create the feed to show all entries
4. Add social features (follow users, see their activity)
5. Build year-end recap statistics

Want to continue? Let me know which feature to build next! 🚀
