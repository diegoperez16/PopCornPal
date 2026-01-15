I have analyzed the performance bottlenecks in `UserProfilePage.tsx` and `socialStore.ts`. The primary reason user profiles load slowly is that the application fetches the **entire** media library, followers list, and following list immediately when the page loads, regardless of whether the user wants to see them.

Here is the plan to fix the functions and drastically improve load times:

### Phase 1: Optimize User Profile Loading (Major Speedup)
We will implement "Lazy Loading" in `UserProfilePage.tsx`. Instead of fetching everything at once, we will fetch only what is visible on the screen.

1.  **Refactor `fetchUserProfile`**:
    *   **Remove** the full library fetch (`media_entries`).
    *   **Remove** the full followers list fetch.
    *   **Remove** the full following list fetch.
    *   **Keep** fetching the Profile, Badges, Counts, Favorites, and **Recent Activity** (limit 5).
2.  **Implement On-Demand Fetching**:
    *   Create `fetchFullLibrary()`: Triggers only when the "View Full Library" modal is opened.
    *   Create `fetchFollowersList()`: Triggers only when the "Followers" modal is opened.
    *   Create `fetchFollowingList()`: Triggers only when the "Following" modal is opened.
3.  **Add Loading States**:
    *   Add specific loading spinners inside the modals so the UI remains responsive.

### Phase 2: Fix & Optimize Social Store Functions
We will update `src/store/socialStore.ts` to support pagination, ensuring we never try to fetch thousands of users at once.

1.  **Update `fetchFollowers` & `fetchFollowing`**:
    *   Add `page` and `limit` parameters (defaulting to 20).
    *   Implement "Infinite Scroll" logic: Append new results to the existing list instead of overwriting.
    *   Keep the "split query" approach (fetch IDs -> fetch Profiles) as it's more stable than complex joins.

### Phase 3: Database (Optional but Recommended)
*   Ensure indexes exist on `media_entries(user_id)` and `follows(follower_id/following_id)` (Verified: These already exist in your schema).

This plan ensures the initial page load is lightweight (fetching ~30 items instead of potentially thousands), solving the "takes too much time" issue permanently.