-- 1. Create table to store click events for uniqueness check
CREATE TABLE IF NOT EXISTS public.click_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    ip_address TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Constraint: One click per IP per submission
    UNIQUE(submission_id, ip_address)
);

-- 2. Secure the table
ALTER TABLE public.click_events ENABLE ROW LEVEL SECURITY;

-- 3. Update the increment_clicks RPC to handle IP uniqueness
CREATE OR REPLACE FUNCTION public.increment_clicks(
    submission_id UUID,
    ip_address TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Try to insert a new click event for this IP
    -- The UNIQUE constraint will prevent duplicates
    BEGIN
        INSERT INTO public.click_events (submission_id, ip_address)
        VALUES (submission_id, ip_address);
        
        -- If insert succeeded (no exception), then increment the counter
        UPDATE public.submissions
        SET clicks = COALESCE(clicks, 0) + 1
        WHERE id = submission_id;
        
    EXCEPTION WHEN unique_violation THEN
        -- If unique violation (duplicate IP), do nothing.
        -- The click is ignored.
        RETURN;
    END;
END;
$$;
