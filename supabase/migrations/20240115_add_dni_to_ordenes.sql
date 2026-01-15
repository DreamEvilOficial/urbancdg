-- Migration: Add cliente_dni to ordenes table
-- Created at: 2024-01-15

-- Add cliente_dni column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'ordenes'
        AND column_name = 'cliente_dni'
    ) THEN
        ALTER TABLE ordenes ADD COLUMN cliente_dni TEXT;
    END IF;
END $$;
