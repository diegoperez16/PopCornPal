# Supabase Real-time Setup

## Enable Real-time Replication

To enable real-time features in PopcornPal, you need to enable replication for the following tables in Supabase:

### Steps:

1. Go to your Supabase Dashboard
2. Navigate to **Database** → **Replication**
3. Enable replication for these tables:
   - ✅ `posts`
   - ✅ `post_likes`
   - ✅ `post_comments`
   - ✅ `follows`

### How to Enable:

1. In the Replication page, you'll see a list of all your tables
2. Find each table listed above
3. Toggle the switch to **ON** for each table
4. The changes take effect immediately

### What This Enables:

- **Feed Page**: 
  - New posts appear instantly
  - Like counts update in real-time
  - Comment counts update in real-time

- **People Page**:
  - Follower/following lists update instantly
  - See when someone follows/unfollows you immediately

### Verification:

To verify it's working:
1. Open the app in two browser windows
2. In one window, create a post or follow someone
3. The other window should update automatically without refreshing

### Note:

Real-time replication is included in Supabase's free tier, but has limits:
- Free tier: 200 concurrent connections
- 2 million monthly messages

For PopcornPal's use case, this should be more than sufficient.
