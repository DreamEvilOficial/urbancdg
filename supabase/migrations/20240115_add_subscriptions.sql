-- Create table for order subscriptions
CREATE TABLE IF NOT EXISTS public.order_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
    UNIQUE(order_id, email)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_order_subscriptions_order_id ON public.order_subscriptions(order_id);
CREATE INDEX IF NOT EXISTS idx_order_subscriptions_email ON public.order_subscriptions(email);

-- Enable RLS
ALTER TABLE public.order_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow public insert (for the subscription form)
CREATE POLICY "Allow public insert to order_subscriptions" ON public.order_subscriptions
    FOR INSERT WITH CHECK (true);

-- Allow public select (optional, maybe restrict to own email if auth existed)
CREATE POLICY "Allow public select to order_subscriptions" ON public.order_subscriptions
    FOR SELECT USING (true);
