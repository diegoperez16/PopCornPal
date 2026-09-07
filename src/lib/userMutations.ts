import { supabase } from './supabase'
import { sendMentionNotifications } from './mentions'

export type MediaEntryMutationInput = {
  media_type: 'movie' | 'show' | 'game' | 'book'
  title: string
  rating: number | null
  dumpstered?: boolean | null
  status: 'completed' | 'in-progress' | 'planned' | 'logged'
  completed_date: string | null
  notes: string | null
  genre?: string | null
  year?: number | null
  cover_image_url?: string | null
}

export type CreatePostInput = {
  userId: string
  content: string
  media_entry_id: string | null
  image_url: string | null
}

export type CreateCommentInput = {
  userId: string
  postId: string
  content: string
  parent_comment_id: string | null
  image_url: string | null
}

export type UpdateCommentInput = {
  commentId: string
  userId: string
  content: string
}

export type ToggleLikeInput = {
  userId: string
  postId: string
  isLiked: boolean
}

export type ToggleCommentLikeInput = {
  userId: string
  commentId: string
  isLiked: boolean
}

export type EpisodeRatingMutationInput = {
  userId: string
  show_title: string
  show_cover_url: string | null
  show_year: string | null
  season_number: number
  episode_number: number
  episode_title?: string | null
  rating: number
  notes?: string | null
}

export async function createMediaEntry(userId: string, entry: MediaEntryMutationInput) {
  if (entry.status === 'completed' || entry.status === 'in-progress') {
    const { data: existingLibrary } = await supabase
      .from('media_entries')
      .select('id')
      .eq('user_id', userId)
      .eq('media_type', entry.media_type)
      .eq('title', entry.title)
      .eq('status', 'logged')
      .maybeSingle()

    if (!existingLibrary) {
      const { error: loggedInsertError } = await supabase.from('media_entries').insert([
        {
          ...entry,
          status: 'logged',
          user_id: userId,
          completed_date: null,
        },
      ])

      if (loggedInsertError) throw loggedInsertError
    }
  }

  const { error } = await supabase.from('media_entries').insert([{ ...entry, user_id: userId }])
  if (error) throw error
}

export async function updateMediaEntry(id: string, updates: Partial<MediaEntryMutationInput>) {
  const { error } = await supabase.from('media_entries').update(updates).eq('id', id)
  if (error) throw error
}

export async function deleteMediaEntry(id: string) {
  const { error } = await supabase.from('media_entries').delete().eq('id', id)
  if (error) throw error
}

export async function createPost(input: CreatePostInput) {
  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: input.userId,
      content: input.content,
      media_entry_id: input.media_entry_id,
      image_url: input.image_url,
    })
    .select('id')
    .single()

  if (error) throw error

  if (data?.id && input.content) {
    sendMentionNotifications(input.content, input.userId, data.id).catch(console.error)
  }
}

export async function deletePost(userId: string, postId: string) {
  const { error } = await supabase.from('posts').delete().eq('id', postId).eq('user_id', userId)
  if (error) throw error
}

export async function createComment(input: CreateCommentInput) {
  const { error } = await supabase.from('post_comments').insert({
    post_id: input.postId,
    user_id: input.userId,
    content: input.content,
    parent_comment_id: input.parent_comment_id,
    image_url: input.image_url,
  })

  if (error) throw error

  if (input.content) {
    sendMentionNotifications(input.content, input.userId, input.postId).catch(console.error)
  }
}

export async function deleteComment(userId: string, commentId: string) {
  const { error } = await supabase
    .from('post_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId)

  if (error) throw error
}

export async function updateComment(input: UpdateCommentInput) {
  const { error } = await supabase
    .from('post_comments')
    .update({ content: input.content })
    .eq('id', input.commentId)
    .eq('user_id', input.userId)

  if (error) throw error
}

export async function togglePostLike(input: ToggleLikeInput) {
  if (input.isLiked) {
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', input.postId)
      .eq('user_id', input.userId)
    if (error) throw error
    return
  }

  const { error } = await supabase
    .from('post_likes')
    .insert({ post_id: input.postId, user_id: input.userId })
  if (error) throw error
}

export async function toggleCommentLike(input: ToggleCommentLikeInput) {
  if (input.isLiked) {
    const { error } = await supabase
      .from('comment_likes')
      .delete()
      .eq('comment_id', input.commentId)
      .eq('user_id', input.userId)
    if (error) throw error
    return
  }

  const { error } = await supabase
    .from('comment_likes')
    .insert({ comment_id: input.commentId, user_id: input.userId })
  if (error) throw error
}

export async function upsertEpisodeRating(input: EpisodeRatingMutationInput) {
  const { error } = await supabase
    .from('episode_ratings')
    .upsert(
      {
        user_id: input.userId,
        show_title: input.show_title,
        show_cover_url: input.show_cover_url,
        show_year: input.show_year,
        season_number: input.season_number,
        episode_number: input.episode_number,
        episode_title: input.episode_title ?? null,
        rating: input.rating,
        notes: input.notes ?? null,
      },
      { onConflict: 'user_id,show_title,season_number,episode_number' }
    )

  if (error) throw error
}
