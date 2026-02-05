 import { useMutation, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 
 /**
  * Hook for users to delete their cancelled orders from history
  * This actually deletes the order from the database
  */
 export function useDeleteOrder() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async (orderId: string) => {
       // First delete order items
       const { error: itemsError } = await supabase
         .from('order_items')
         .delete()
         .eq('order_id', orderId);
 
       if (itemsError) throw itemsError;
 
       // Then delete the order
       const { error: orderError } = await supabase
         .from('orders')
         .delete()
         .eq('id', orderId);
 
       if (orderError) throw orderError;
 
       return orderId;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['orders'] });
       queryClient.invalidateQueries({ queryKey: ['all-orders'] });
     },
   });
 }