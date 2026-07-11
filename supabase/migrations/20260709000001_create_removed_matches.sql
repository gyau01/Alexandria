-- Persist removed study-buddy pairs in Postgres so match removal works
-- without requiring per-developer Upstash Redis credentials.

CREATE TABLE IF NOT EXISTS public.removed_matches (
    user_id text NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    other_user_id text NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    removed_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, other_user_id)
);

CREATE INDEX IF NOT EXISTS removed_matches_user_id_idx ON public.removed_matches(user_id);
CREATE INDEX IF NOT EXISTS removed_matches_other_user_id_idx ON public.removed_matches(other_user_id);

ALTER TABLE public.removed_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own removed matches" ON public.removed_matches;
CREATE POLICY "Users can view own removed matches" ON public.removed_matches
FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own removed matches" ON public.removed_matches;
CREATE POLICY "Users can delete own removed matches" ON public.removed_matches
FOR DELETE USING (auth.uid()::text = user_id);
