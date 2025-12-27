
CREATE TABLE IF NOT EXISTS public.support_messages (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
    sender_id uuid REFERENCES public.profiles(id) NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Policy: View messages (Admins or the Ticket Owner)
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

-- Real-time
alter publication supabase_realtime add table public.support_messages;
