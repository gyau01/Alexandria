-- Group chats (iMessage-style) + ensures chat reactions/delete are in place.

-- 1) Reactions + delete (idempotent; safe if already applied).
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reactions jsonb NOT NULL DEFAULT '{}'::jsonb;

DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;
CREATE POLICY "Users can delete own messages" ON public.messages
FOR DELETE USING (auth.uid()::text = sender_id);

-- 2) Group chat tables.
CREATE TABLE IF NOT EXISTS public.group_chats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text,
  created_by text REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.group_chat_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES public.group_chats(id) ON DELETE CASCADE,
  user_id text REFERENCES public.users(user_id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS group_chat_members_group_id_idx ON public.group_chat_members(group_id);
CREATE INDEX IF NOT EXISTS group_chat_members_user_id_idx ON public.group_chat_members(user_id);

-- 3) Messages can belong to a group instead of a 1:1 match.
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.group_chats(id) ON DELETE CASCADE;

ALTER TABLE public.messages ALTER COLUMN match_id DROP NOT NULL;
ALTER TABLE public.messages ALTER COLUMN content DROP NOT NULL;

CREATE INDEX IF NOT EXISTS messages_group_id_idx ON public.messages(group_id);

-- 4) SECURITY DEFINER helper to avoid RLS recursion on group_chat_members.
CREATE OR REPLACE FUNCTION public.is_group_member(gid uuid, uid text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_chat_members
    WHERE group_id = gid AND user_id = uid
  );
$$;

-- 5) RLS.
ALTER TABLE public.group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chat_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their groups" ON public.group_chats;
CREATE POLICY "Members can view their groups" ON public.group_chats
FOR SELECT USING (
  created_by = auth.uid()::text
  OR public.is_group_member(id, auth.uid()::text)
);

DROP POLICY IF EXISTS "Users can create groups" ON public.group_chats;
CREATE POLICY "Users can create groups" ON public.group_chats
FOR INSERT WITH CHECK (created_by = auth.uid()::text);

DROP POLICY IF EXISTS "Members can view group membership" ON public.group_chat_members;
CREATE POLICY "Members can view group membership" ON public.group_chat_members
FOR SELECT USING (
  user_id = auth.uid()::text
  OR public.is_group_member(group_id, auth.uid()::text)
);

DROP POLICY IF EXISTS "Group creators or self can add members" ON public.group_chat_members;
CREATE POLICY "Group creators or self can add members" ON public.group_chat_members
FOR INSERT WITH CHECK (
  user_id = auth.uid()::text
  OR EXISTS (
    SELECT 1 FROM public.group_chats g
    WHERE g.id = group_id AND g.created_by = auth.uid()::text
  )
);

-- 6) Extend message policies to cover group membership.
DROP POLICY IF EXISTS "Users can view match messages" ON public.messages;
CREATE POLICY "Users can view match messages" ON public.messages
FOR SELECT USING (
  (
    match_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.matches
      WHERE matches.id = messages.match_id
      AND (matches.user1_id = auth.uid()::text OR matches.user2_id = auth.uid()::text)
    )
  )
  OR (
    group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()::text)
  )
);

DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
CREATE POLICY "Users can insert messages" ON public.messages
FOR INSERT WITH CHECK (
  auth.uid()::text = sender_id
  AND (
    (
      match_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.matches
        WHERE matches.id = messages.match_id
        AND (matches.user1_id = auth.uid()::text OR matches.user2_id = auth.uid()::text)
      )
    )
    OR (
      group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()::text)
    )
  )
);

DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
CREATE POLICY "Users can update own messages" ON public.messages
FOR UPDATE USING (
  (
    match_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.matches
      WHERE matches.id = messages.match_id
      AND (matches.user1_id = auth.uid()::text OR matches.user2_id = auth.uid()::text)
    )
  )
  OR (
    group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()::text)
  )
);

-- 7) Realtime.
ALTER TABLE public.group_chats REPLICA IDENTITY FULL;
ALTER TABLE public.group_chat_members REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER publication supabase_realtime ADD TABLE public.group_chats;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER publication supabase_realtime ADD TABLE public.group_chat_members;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
