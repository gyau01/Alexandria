-- Add draft support to community posts.
-- Published posts are public; drafts are visible only to their author.

ALTER TABLE public.community_posts
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published';

-- Denormalized author display fields so every user can see who posted,
-- regardless of match status (the users table is restricted to matches).
ALTER TABLE public.community_posts
    ADD COLUMN IF NOT EXISTS author_name text,
    ADD COLUMN IF NOT EXISTS author_avatar_url text;

ALTER TABLE public.community_comments
    ADD COLUMN IF NOT EXISTS author_name text,
    ADD COLUMN IF NOT EXISTS author_avatar_url text;

CREATE INDEX IF NOT EXISTS community_posts_status_idx ON public.community_posts(status);

-- Replace the open "anyone can view" policy with a draft-aware one.
DROP POLICY IF EXISTS "Anyone can view posts" ON public.community_posts;
CREATE POLICY "View published or own posts" ON public.community_posts
FOR SELECT USING (status = 'published' OR auth.uid()::text = user_id);

-- Comments remain visible to everyone.
DROP POLICY IF EXISTS "Anyone can view comments" ON public.community_comments;
CREATE POLICY "Anyone can view comments" ON public.community_comments
FOR SELECT USING (true);
