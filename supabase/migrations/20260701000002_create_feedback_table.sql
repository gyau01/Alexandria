-- Feedback submitted by users/visitors to the Cramly technical team.
CREATE TABLE IF NOT EXISTS public.feedback (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id text REFERENCES public.users(user_id) ON DELETE SET NULL,
    name text,
    email text,
    category text NOT NULL DEFAULT 'general',
    message text NOT NULL,
    status text NOT NULL DEFAULT 'new',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON public.feedback(created_at);
CREATE INDEX IF NOT EXISTS feedback_user_id_idx ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS feedback_status_idx ON public.feedback(status);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous homepage visitors) can submit feedback.
DROP POLICY IF EXISTS "Allow public insert on feedback" ON public.feedback;
CREATE POLICY "Allow public insert on feedback" ON public.feedback
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Authenticated users (e.g. the technical team / admins) can read feedback.
DROP POLICY IF EXISTS "Allow authenticated read on feedback" ON public.feedback;
CREATE POLICY "Allow authenticated read on feedback" ON public.feedback
    FOR SELECT
    TO authenticated
    USING (true);
