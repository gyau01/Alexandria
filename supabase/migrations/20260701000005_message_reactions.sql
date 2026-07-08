-- Teams-style chat interactions: emoji reactions + message deletion.

-- Store reactions as { "👍": ["userId1", "userId2"], "❤️": ["userId3"] }.
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reactions jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Either participant in the match can update a message (needed so both people
-- can add/remove reactions). This policy already exists from the base schema,
-- but we re-assert it here to be safe.
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
CREATE POLICY "Users can update own messages" ON public.messages
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.matches
        WHERE matches.id = messages.match_id
        AND (matches.user1_id = auth.uid()::text OR matches.user2_id = auth.uid()::text)
    )
);

-- Allow senders to delete their own messages.
DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;
CREATE POLICY "Users can delete own messages" ON public.messages
FOR DELETE USING (auth.uid()::text = sender_id);
