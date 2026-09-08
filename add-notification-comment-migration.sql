-- Record which comment a notification is about.
--
-- Notifications already store the post in related_id, which is enough to open
-- the right post but not to point at the comment inside it. On a post with
-- twenty comments, "someone replied" still leaves you hunting for the reply.
--
-- comment_id is added alongside rather than replacing related_id, so every
-- existing notification keeps working exactly as it does now — older ones
-- simply have no comment to highlight.
--
-- Run this in the Supabase SQL editor. Safe to run more than once.

alter table public.notifications
  add column if not exists comment_id uuid
  references public.post_comments(id) on delete set null;

comment on column public.notifications.comment_id is
  'The comment a comment/reply notification refers to. Null on older rows and on likes and follows.';

-- Recreated with comment_id set. Everything else is unchanged from
-- fix-net-schema-trigger.sql, including the fault-tolerant wrapper: a failure
-- in here must never block someone from leaving a comment.
create or replace function create_comment_notification()
returns trigger language plpgsql security definer as $$
DECLARE
    v_post_author UUID;
    v_parent_author UUID;
BEGIN
    BEGIN
        SELECT user_id INTO v_post_author FROM public.posts WHERE id = NEW.post_id;
        IF NEW.user_id != v_post_author THEN
            INSERT INTO public.notifications (user_id, type, from_user_id, related_id, comment_id)
            VALUES (v_post_author, 'comment', NEW.user_id, NEW.post_id, NEW.id);
        END IF;
        IF NEW.parent_comment_id IS NOT NULL THEN
            SELECT user_id INTO v_parent_author
            FROM public.post_comments WHERE id = NEW.parent_comment_id;
            IF v_parent_author IS NOT NULL
                AND NEW.user_id != v_parent_author
                AND v_parent_author != v_post_author
            THEN
                INSERT INTO public.notifications (user_id, type, from_user_id, related_id, comment_id)
                VALUES (v_parent_author, 'reply', NEW.user_id, NEW.post_id, NEW.id);
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    RETURN NEW;
END;
$$;

-- Verify: new comment notifications should carry a comment_id.
select type, count(*) filter (where comment_id is not null) as with_comment, count(*) as total
from public.notifications
where type in ('comment','reply')
group by type;
