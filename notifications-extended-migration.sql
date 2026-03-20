-- Extended notification triggers for likes, comments, and replies
-- Run this AFTER notifications-schema.sql in your Supabase SQL Editor

-- =============================================
-- LIKE NOTIFICATIONS
-- =============================================

CREATE OR REPLACE FUNCTION create_like_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_post_author UUID;
BEGIN
    SELECT user_id INTO v_post_author FROM public.posts WHERE id = NEW.post_id;

    -- Don't notify if user likes their own post
    IF NEW.user_id = v_post_author THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.notifications (user_id, type, from_user_id, related_id)
    VALUES (v_post_author, 'like', NEW.user_id, NEW.post_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_liked ON public.post_likes;
CREATE TRIGGER on_post_liked
    AFTER INSERT ON public.post_likes
    FOR EACH ROW
    EXECUTE FUNCTION create_like_notification();

-- =============================================
-- COMMENT & REPLY NOTIFICATIONS
-- =============================================

CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_post_author UUID;
    v_parent_author UUID;
BEGIN
    SELECT user_id INTO v_post_author FROM public.posts WHERE id = NEW.post_id;

    -- Notify post author when someone comments (not on their own post)
    IF NEW.user_id != v_post_author THEN
        INSERT INTO public.notifications (user_id, type, from_user_id, related_id)
        VALUES (v_post_author, 'comment', NEW.user_id, NEW.post_id);
    END IF;

    -- If this is a reply, also notify the parent comment author
    IF NEW.parent_comment_id IS NOT NULL THEN
        SELECT user_id INTO v_parent_author
        FROM public.post_comments
        WHERE id = NEW.parent_comment_id;

        -- Only notify if different from commenter and post author (already notified)
        IF v_parent_author IS NOT NULL
            AND NEW.user_id != v_parent_author
            AND v_parent_author != v_post_author
        THEN
            INSERT INTO public.notifications (user_id, type, from_user_id, related_id)
            VALUES (v_parent_author, 'reply', NEW.user_id, NEW.post_id);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_created ON public.post_comments;
CREATE TRIGGER on_comment_created
    AFTER INSERT ON public.post_comments
    FOR EACH ROW
    EXECUTE FUNCTION create_comment_notification();
