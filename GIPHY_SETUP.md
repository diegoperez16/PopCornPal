# Giphy Integration Setup 🎉

PopcornPal now includes native Giphy GIF picker functionality! Users can browse and select GIFs directly within the app without leaving to find GIF URLs.

## ✅ What's Implemented

- **Native GIF Picker**: Modal overlay with Giphy Grid component
- **3 Integration Points**: Posts, comments, and replies all have GIF buttons
- **Trending GIFs**: Automatically loads trending GIFs when opened
- **Search Capability**: Users can search Giphy's library
- **Responsive Design**: 3-column grid that works on mobile and desktop

## 🔑 Required: Giphy API Key

To enable the GIF picker, you need a free Giphy API key:

### Step 1: Create Giphy Developer Account
1. Visit https://developers.giphy.com/dashboard/
2. Sign up for a free account (or log in)

### Step 2: Create an App
1. Click "Create an App"
2. Select "API" (not SDK)
3. Give it a name: "PopcornPal" (or any name)
4. Description: "Social media app with GIF support"
5. Click "Create App"

### Step 3: Get Your API Key
1. Your API key will be displayed (starts with a long string of characters)
2. Copy the API key

### Step 4: Add to Environment Variables
1. Create a `.env` file in the project root (if it doesn't exist)
2. Add this line:
   ```
   VITE_GIPHY_API_KEY=your_actual_api_key_here
   ```
3. Replace `your_actual_api_key_here` with your actual key

### Step 5: Restart Dev Server
```bash
npm run dev
```

## 🎨 How Users Use It

### In Posts:
1. Click the purple **GIF** button when creating a post
2. Browse trending GIFs or search
3. Click a GIF to select it
4. The GIF URL auto-fills and preview appears
5. Post as normal!

### In Comments:
1. Open comments on any post
2. Click the **GIF** button below the comment input
3. Select a GIF from the modal
4. Post your comment with the GIF

### In Replies:
1. Click "Reply" on any comment
2. Click the **GIF** button in the reply input area
3. Choose your GIF and reply!

## 📦 Technical Details

**Packages Installed:**
- `@giphy/react-components` - Official Giphy React Grid component
- `@giphy/js-fetch-api` - Giphy API wrapper for fetching GIFs

**Component Created:**
- `src/components/GifPicker.tsx` - Reusable modal GIF picker

**Modified Files:**
- `src/pages/FeedPage.tsx` - Added GIF buttons and state management
- `.env.example` - Documented required environment variable

## 🚨 Troubleshooting

**GIF button doesn't do anything:**
- Make sure you've added the API key to `.env`
- Restart your dev server after adding the key
- Check browser console for errors

**GIFs don't load:**
- Verify your API key is correct
- Check your internet connection
- Ensure the key has proper permissions (should be "API" not "SDK")

**Rate limits:**
- Free tier: 42 requests per hour per IP
- Should be more than enough for testing
- Consider upgrading for production use

## 🎯 Next Steps

Once your API key is set up, the GIF picker will work immediately! Users can now:
- ✅ Browse trending GIFs
- ✅ Search Giphy's entire library  
- ✅ Add GIFs to posts, comments, and replies
- ✅ Never leave the app to find GIFs

Enjoy the enhanced social experience! 🍿
