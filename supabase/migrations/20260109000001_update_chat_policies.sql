-- Update Support Messages Table and Policies
-- Based on create_chat_table.sql

-- 1. Ensure table exists (it should, but for safety)
CREATE TABLE IF NOT EXISTS public.support_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
    sender_id uuid REFERENCES public.profiles(id) NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- 3. Drop old policies to avoid conflicts/confusion
DROP POLICY IF EXISTS "Users can view messages for own tickets" ON public.support_messages;
DROP POLICY IF EXISTS "Users can insert messages for own tickets" ON public.support_messages;
DROP POLICY IF EXISTS "View messages" ON public.support_messages;
DROP POLICY IF EXISTS "Insert messages" ON public.support_messages;

-- 4. Create New Policies (from create_chat_table.sql)

-- Policy: View messages (Admins or the Ticket Owner)
-- Note: Checking 'sender_id' is good, but mainly we want to check if the user OWNS the ticket OR is an ADMIN.
-- The sender_id check (auth.uid() = sender_id) allows seeing your own messages, which is basic.
-- The ticket check allows seeing ALL messages in your ticket.
CREATE POLICY "View messages" ON public.support_messages FOR SELECT USING (
    (auth.uid() = sender_id) OR
    (EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND user_id = auth.uid())) OR
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
);

-- Policy: Insert messages (Admins or the Ticket Owner)
CREATE POLICY "Insert messages" ON public.support_messages FOR INSERT WITH CHECK (
    (auth.uid() = sender_id) OR
    (EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND user_id = auth.uid())) OR
    (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
);

-- 5. Enable Real-time
-- Check if table is already in publication to avoid error
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'support_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
    END IF;
END
$$;
