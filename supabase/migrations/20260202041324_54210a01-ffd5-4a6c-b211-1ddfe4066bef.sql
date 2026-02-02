-- Allow admins to manage menu_items (INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can insert menu items"
  ON public.menu_items
  FOR INSERT
  WITH CHECK (has_staff_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update menu items"
  ON public.menu_items
  FOR UPDATE
  USING (has_staff_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete menu items"
  ON public.menu_items
  FOR DELETE
  USING (has_staff_role(auth.uid(), 'admin'));

-- Allow admins to manage menu_categories (INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can insert categories"
  ON public.menu_categories
  FOR INSERT
  WITH CHECK (has_staff_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update categories"
  ON public.menu_categories
  FOR UPDATE
  USING (has_staff_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete categories"
  ON public.menu_categories
  FOR DELETE
  USING (has_staff_role(auth.uid(), 'admin'));

-- Storage policies for menu images bucket (aimenu bucket already exists)
CREATE POLICY "Anyone can view menu images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'aimenu');

CREATE POLICY "Admins can upload menu images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'aimenu' AND has_staff_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update menu images"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'aimenu' AND has_staff_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete menu images"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'aimenu' AND has_staff_role(auth.uid(), 'admin'));