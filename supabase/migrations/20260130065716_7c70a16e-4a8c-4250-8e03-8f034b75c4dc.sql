-- Create a helper function to check if a user is active staff
CREATE OR REPLACE FUNCTION public.is_active_staff(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_profiles
    WHERE user_id = user_uuid
      AND is_active = true
  )
$$;

-- Create a helper function to check staff role
CREATE OR REPLACE FUNCTION public.has_staff_role(user_uuid uuid, required_role staff_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_profiles
    WHERE user_id = user_uuid
      AND role = required_role
      AND is_active = true
  )
$$;

-- ============================================
-- FIX: ORDERS TABLE RLS
-- ============================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can view their session orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update their session orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- Create session-scoped SELECT policy (customers can only see their own session's orders)
CREATE POLICY "Session users can view their own orders"
  ON public.orders
  FOR SELECT
  USING (
    session_id = coalesce(
      current_setting('request.headers', true)::json->>'x-session-id',
      ''
    )
  );

-- Create staff SELECT policy (authenticated staff can see all orders)
CREATE POLICY "Staff can view all orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (public.is_active_staff(auth.uid()));

-- Create session-scoped INSERT policy
CREATE POLICY "Session users can create their own orders"
  ON public.orders
  FOR INSERT
  WITH CHECK (
    session_id = coalesce(
      current_setting('request.headers', true)::json->>'x-session-id',
      ''
    )
    AND session_id != ''
  );

-- Create session-scoped UPDATE policy (customers can only update their own orders, limited fields)
CREATE POLICY "Session users can update their own orders"
  ON public.orders
  FOR UPDATE
  USING (
    session_id = coalesce(
      current_setting('request.headers', true)::json->>'x-session-id',
      ''
    )
  );

-- Create staff UPDATE policy
CREATE POLICY "Staff can update all orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (public.is_active_staff(auth.uid()));

-- ============================================
-- FIX: ORDER_ITEMS TABLE RLS
-- ============================================

DROP POLICY IF EXISTS "Anyone can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;

-- Create session-scoped SELECT policy for order items
CREATE POLICY "Session users can view their order items"
  ON public.order_items
  FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM public.orders 
      WHERE session_id = coalesce(
        current_setting('request.headers', true)::json->>'x-session-id',
        ''
      )
    )
  );

-- Create staff SELECT policy for order items
CREATE POLICY "Staff can view all order items"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (public.is_active_staff(auth.uid()));

-- Create session-scoped INSERT policy for order items
CREATE POLICY "Session users can create their order items"
  ON public.order_items
  FOR INSERT
  WITH CHECK (
    order_id IN (
      SELECT id FROM public.orders 
      WHERE session_id = coalesce(
        current_setting('request.headers', true)::json->>'x-session-id',
        ''
      )
    )
  );

-- ============================================
-- FIX: CHAT_MESSAGES TABLE RLS
-- ============================================

DROP POLICY IF EXISTS "Users can view their session messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Anyone can create chat messages" ON public.chat_messages;

-- Create session-scoped SELECT policy for chat messages
CREATE POLICY "Session users can view their own chat messages"
  ON public.chat_messages
  FOR SELECT
  USING (
    session_id = coalesce(
      current_setting('request.headers', true)::json->>'x-session-id',
      ''
    )
  );

-- Create session-scoped INSERT policy for chat messages
CREATE POLICY "Session users can create their own chat messages"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    session_id = coalesce(
      current_setting('request.headers', true)::json->>'x-session-id',
      ''
    )
    AND session_id != ''
  );

-- ============================================
-- FIX: STAFF_PROFILES TABLE RLS
-- ============================================

-- Ensure only admins can create staff profiles (prevent self-registration exploitation)
DROP POLICY IF EXISTS "Authenticated users can view all staff" ON public.staff_profiles;

-- Create proper staff viewing policy
CREATE POLICY "Authenticated staff can view other staff"
  ON public.staff_profiles
  FOR SELECT
  TO authenticated
  USING (public.is_active_staff(auth.uid()) OR user_id = auth.uid());

-- Only admins can insert new staff profiles
CREATE POLICY "Only admins can create staff profiles"
  ON public.staff_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_staff_role(auth.uid(), 'admin')
  );

-- Only admins can update staff profiles
CREATE POLICY "Only admins can update staff profiles"
  ON public.staff_profiles
  FOR UPDATE
  TO authenticated
  USING (
    public.has_staff_role(auth.uid(), 'admin')
  );