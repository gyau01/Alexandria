-- Community board: public Q&A posts and comments visible to all users

CREATE TABLE IF NOT EXISTS public.community_posts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id text REFERENCES public.users(user_id) ON DELETE CASCADE,
    author_name text,
    author_avatar_url text,
    title text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.community_comments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id text REFERENCES public.users(user_id) ON DELETE CASCADE,
    author_name text,
    author_avatar_url text,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS community_posts_user_id_idx ON public.community_posts(user_id);
CREATE INDEX IF NOT EXISTS community_posts_created_at_idx ON public.community_posts(created_at);
CREATE INDEX IF NOT EXISTS community_comments_post_id_idx ON public.community_comments(post_id);
CREATE INDEX IF NOT EXISTS community_comments_user_id_idx ON public.community_comments(user_id);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;

-- Posts: everyone can read, authors manage their own
DROP POLICY IF EXISTS "Anyone can view posts" ON public.community_posts;
CREATE POLICY "Anyone can view posts" ON public.community_posts
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create posts" ON public.community_posts;
CREATE POLICY "Users can create posts" ON public.community_posts
FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own posts" ON public.community_posts;
CREATE POLICY "Users can update own posts" ON public.community_posts
FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own posts" ON public.community_posts;
CREATE POLICY "Users can delete own posts" ON public.community_posts
FOR DELETE USING (auth.uid()::text = user_id);

-- Comments: everyone can read, authors manage their own
DROP POLICY IF EXISTS "Anyone can view comments" ON public.community_comments;
CREATE POLICY "Anyone can view comments" ON public.community_comments
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create comments" ON public.community_comments;
CREATE POLICY "Users can create comments" ON public.community_comments
FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own comments" ON public.community_comments;
CREATE POLICY "Users can update own comments" ON public.community_comments
FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.community_comments;
CREATE POLICY "Users can delete own comments" ON public.community_comments
FOR DELETE USING (auth.uid()::text = user_id);
