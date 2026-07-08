-- Allow users to change (switch) their poll vote.
-- Replaces cast_poll_vote so that a second call moves the vote to a new
-- option instead of raising a unique-constraint error. Adjusts the tallies:
--   * first vote    -> insert + increment chosen option
--   * switched vote -> update row + increment new option, decrement old
--   * same option   -> no-op
CREATE OR REPLACE FUNCTION public.cast_poll_vote(p_poll_id uuid, p_option text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user text := auth.uid()::text;
    v_options text[];
    v_previous text;
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

    SELECT selected_option INTO v_previous
    FROM public.poll_votes
    WHERE poll_id = p_poll_id AND user_id = v_user;

    IF v_previous IS NULL THEN
        -- First time voting on this poll.
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

    ELSIF v_previous <> p_option THEN
        -- Switching to a different option.
        UPDATE public.poll_votes
        SET selected_option = p_option,
            created_at = timezone('utc'::text, now())
        WHERE poll_id = p_poll_id AND user_id = v_user;

        UPDATE public.polls
        SET votes = jsonb_set(
                jsonb_set(
                    COALESCE(votes, '{}'::jsonb),
                    ARRAY[p_option],
                    to_jsonb(COALESCE((votes ->> p_option)::int, 0) + 1)
                ),
                ARRAY[v_previous],
                to_jsonb(GREATEST(COALESCE((votes ->> v_previous)::int, 0) - 1, 0))
            ),
            updated_at = timezone('utc'::text, now())
        WHERE id = p_poll_id;
    END IF;
    -- If v_previous = p_option, the vote is unchanged: no-op.
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_poll_vote(uuid, text) TO authenticated;
