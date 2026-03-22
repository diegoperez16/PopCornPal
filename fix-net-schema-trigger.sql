-- FIX: schema "net" does not exist (error 3F000)
-- The notify_push_subscribers trigger was installed on the notifications table
-- but pg_net extension is not enabled, breaking all like/comment operations
-- on other people's posts.
--
-- STEP 1: Drop the broken trigger
DROP TRIGGER IF EXISTS on_notification_created ON public.notifications;
DROP FUNCTION IF EXISTS notify_push_subscribers();

-- STEP 2: Make like/comment notification functions fault-tolerant
-- so any future trigger errors never block the core operation
CREATE OR REPLACE FUNCTION create_like_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_post_author UUID;
BEGIN
    BEGIN
        SELECT user_id INTO v_post_author FROM public.posts WHERE id = NEW.post_id;
        IF NEW.user_id != v_post_author THEN
            INSERT INTO public.notifications (user_id, type, from_user_id, related_id)
            VALUES (v_post_author, 'like', NEW.user_id, NEW.post_id);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Never let notification errors block the like operation
        NULL;
    END;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_post_author UUID;
    v_parent_author UUID;
BEGIN
    BEGIN
        SELECT user_id INTO v_post_author FROM public.posts WHERE id = NEW.post_id;
        IF NEW.user_id != v_post_author THEN
            INSERT INTO public.notifications (user_id, type, from_user_id, related_id)
            VALUES (v_post_author, 'comment', NEW.user_id, NEW.post_id);
        END IF;
        IF NEW.parent_comment_id IS NOT NULL THEN
            SELECT user_id INTO v_parent_author
            FROM public.post_comments WHERE id = NEW.parent_comment_id;
            IF v_parent_author IS NOT NULL
                AND NEW.user_id != v_parent_author
                AND v_parent_author != v_post_author
            THEN
                INSERT INTO public.notifications (user_id, type, from_user_id, related_id)
                VALUES (v_parent_author, 'reply', NEW.user_id, NEW.post_id);
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    RETURN NEW;
END;
$$;

-- STEP 3 (optional): To re-enable push notifications properly,
-- first enable pg_net in Supabase Dashboard → Database → Extensions,
-- then run the trigger with your actual project ref and service role key.
