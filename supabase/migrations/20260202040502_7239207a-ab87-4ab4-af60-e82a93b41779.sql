-- Fix feedback table RLS policies

-- 1. Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Anyone can view feedback" ON public.feedback;

-- 2. Drop the overly permissive public insert policy
DROP POLICY IF EXISTS "Anyone can create feedback" ON public.feedback;

-- 3. Add session-based SELECT policy (customers can only see their own feedback)
CREATE POLICY "Session users can view their own feedback"
  ON public.feedback
  FOR SELECT
  USING (
    session_id = COALESCE(
      (current_setting('request.headers', true)::json->>'x-session-id'),
      ''
    )
  );

-- 4. Add staff SELECT policy (authenticated staff can see all feedback for analysis)
CREATE POLICY "Staff can view all feedback"
  ON public.feedback
  FOR SELECT
  USING (is_active_staff(auth.uid()));

-- 5. Add validated INSERT policy (ensures session_id matches and validates order ownership)
CREATE POLICY "Session users can create feedback for their orders"
  ON public.feedback
  FOR INSERT
  WITH CHECK (
    -- Ensure session_id is not empty and matches request header
    session_id = COALESCE(
      (current_setting('request.headers', true)::json->>'x-session-id'),
      ''
    )
    AND session_id <> ''
    -- If order_id is provided, ensure the order belongs to the same session
    AND (
      order_id IS NULL
      OR order_id IN (
        SELECT id FROM public.orders
        WHERE orders.session_id = COALESCE(
          (current_setting('request.headers', true)::json->>'x-session-id'),
          ''
        )
      )
    )
  );