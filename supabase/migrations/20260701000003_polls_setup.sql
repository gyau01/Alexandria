-- Polls feature: tables, RLS, and a secure voting function.
-- Idempotent so it can be run safely even if the older polls migration
-- (20250201000007) was partially applied.

-- Polls
CREATE TABLE IF NOT EXISTS public.polls (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id text REFERENCES public.users(user_id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    poll_type text NOT NULL DEFAULT 'general',
    options text[] NOT NULL,
    votes jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Individual votes (one per user per poll)
CREATE TABLE IF NOT EXISTS public.poll_votes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_id uuid REFERENCES public.polls(id) ON DELETE CASCADE,
    user_id text REFERENCES public.users(user_id) ON DELETE CASCADE,
    selected_option text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(poll_id, user_id)
);

CREATE INDEX IF NOT EXISTS polls_user_id_idx ON public.polls(user_id);
CREATE INDEX IF NOT EXISTS polls_poll_type_idx ON public.polls(poll_type);
CREATE INDEX IF NOT EXISTS polls_created_at_idx ON public.polls(created_at);
CREATE INDEX IF NOT EXISTS poll_votes_poll_id_idx ON public.poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS poll_votes_user_id_idx ON public.poll_votes(user_id);

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Polls: anyone can read; authors manage their own.
DROP POLICY IF EXISTS "Users can view all polls" ON public.polls;
CREATE POLICY "Users can view all polls" ON public.polls
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create polls" ON public.polls;
CREATE POLICY "Users can create polls" ON public.polls
FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own polls" ON public.polls;
CREATE POLICY "Users can update own polls" ON public.polls
FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own polls" ON public.polls;
CREATE POLICY "Users can delete own polls" ON public.polls
FOR DELETE USING (auth.uid()::text = user_id);

-- Poll votes: anyone can read tallies; users record their own vote.
DROP POLICY IF EXISTS "Users can view all poll votes" ON public.poll_votes;
CREATE POLICY "Users can view all poll votes" ON public.poll_votes
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create poll votes" ON public.poll_votes;
CREATE POLICY "Users can create poll votes" ON public.poll_votes
FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Secure voting: records the vote AND increments the tally on the poll,
-- even though non-owners can't UPDATE the poll directly. Runs as the
-- function owner (SECURITY DEFINER) to bypass the owner-only update policy,
-- while still enforcing auth + valid option + one-vote-per-user.
CREATE OR REPLACE FUNCTION public.cast_poll_vote(p_poll_id uuid, p_option text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user text := auth.uid()::text;
    v_options text[];
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT options INTO v_options FROM public.polls WHERE id = p_poll_id;
    IF v_options IS NULL THEN
        RAISE EXCEPTION 'Poll not found';
    END IF;

    IF NOT (p_option = ANY(v_options)) THEN
        RAISE EXCEPTION 'Invalid option for this poll';
    END IF;

    -- Unique(poll_id, user_id) enforces one vote per user; a duplicate
    -- raises unique_violation which surfaces to the client.
    INSERT INTO public.poll_votes (poll_id, user_id, selected_option)
    VALUES (p_poll_id, v_user, p_option);

    UPDATE public.polls
    SET votes = jsonb_set(
            COALESCE(votes, '{}'::jsonb),
            ARRAY[p_option],
            to_jsonb(COALESCE((votes ->> p_option)::int, 0) + 1)
        ),
        updated_at = timezone('utc'::text, now())
    WHERE id = p_poll_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_poll_vote(uuid, text) TO authenticated;
