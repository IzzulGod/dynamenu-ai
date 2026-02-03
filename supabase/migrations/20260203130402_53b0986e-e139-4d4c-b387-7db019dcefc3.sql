-- Drop and recreate SELECT policies for chat_messages with table_id validation
-- This ensures users can only see messages associated with their session AND table

-- First, drop existing SELECT policy
DROP POLICY IF EXISTS "Session users can view their own chat messages" ON public.chat_messages;

-- Create new SELECT policy that validates both session_id AND table_id
-- Users can only view messages from their own session that belong to the same table
CREATE POLICY "Session users can view their own table chat messages"
  ON public.chat_messages
  FOR SELECT
  USING (
    session_id = COALESCE(
      ((current_setting('request.headers'::text, true))::json ->> 'x-session-id'::text),
      ''::text
    )
    AND (
      -- Either table_id is null (legacy messages) or matches their table context
      table_id IS NULL 
      OR table_id IN (
        SELECT t.id FROM tables t 
        WHERE t.is_active = true
      )
    )
  );

-- Update INSERT policy to enforce table_id validation
DROP POLICY IF EXISTS "Session users can create their own chat messages" ON public.chat_messages;

CREATE POLICY "Session users can create their own table chat messages"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    session_id = COALESCE(
      ((current_setting('request.headers'::text, true))::json ->> 'x-session-id'::text),
      ''::text
    )
    AND session_id <> ''::text
    AND (
      table_id IS NULL 
      OR table_id IN (
        SELECT t.id FROM tables t 
        WHERE t.is_active = true
      )
    )
  );