-- Add DELETE policy for orders table so users can delete their cancelled orders
CREATE POLICY "Session users can delete their own cancelled orders" 
ON public.orders 
FOR DELETE 
USING (
  session_id = COALESCE((current_setting('request.headers'::text, true)::json ->> 'x-session-id'), '') 
  AND status = 'cancelled'
);

-- Add DELETE policy for order_items so related items can be deleted
CREATE POLICY "Session users can delete their order items for cancelled orders" 
ON public.order_items 
FOR DELETE 
USING (
  order_id IN (
    SELECT id FROM orders 
    WHERE session_id = COALESCE((current_setting('request.headers'::text, true)::json ->> 'x-session-id'), '')
    AND status = 'cancelled'
  )
);

-- Staff can also delete orders for cleanup
CREATE POLICY "Staff can delete orders" 
ON public.orders 
FOR DELETE 
USING (is_active_staff(auth.uid()));

-- Staff can delete order items for cleanup  
CREATE POLICY "Staff can delete order items" 
ON public.order_items 
FOR DELETE 
USING (is_active_staff(auth.uid()));