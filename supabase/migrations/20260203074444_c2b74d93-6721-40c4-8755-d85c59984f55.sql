-- Add missing RLS policies for the 'tables' table
-- Currently only has SELECT policy, needs INSERT, UPDATE, DELETE policies for admin-only access

-- Policy: Admins can insert new tables
CREATE POLICY "Admins can insert tables"
  ON public.tables
  FOR INSERT
  WITH CHECK (has_staff_role(auth.uid(), 'admin'::staff_role));

-- Policy: Admins can update tables
CREATE POLICY "Admins can update tables"
  ON public.tables
  FOR UPDATE
  USING (has_staff_role(auth.uid(), 'admin'::staff_role));

-- Policy: Admins can delete tables
CREATE POLICY "Admins can delete tables"
  ON public.tables
  FOR DELETE
  USING (has_staff_role(auth.uid(), 'admin'::staff_role));