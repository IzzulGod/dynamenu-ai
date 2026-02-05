 import { useMutation, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { Order } from '@/types/restaurant';
 
 /**
  * Hook for kitchen staff to cancel orders
  * This updates the order status to 'cancelled' with a reason
  */
 export function useKitchenCancelOrder() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async ({ orderId, reason }: { orderId: string; reason?: string }) => {
       const updateData: Partial<Order> = {
         status: 'cancelled',
       };
 
       // Append cancel reason to notes
       if (reason) {
         const { data: existingOrder } = await supabase
           .from('orders')
           .select('notes')
           .eq('id', orderId)
           .single();
 
         updateData.notes = existingOrder?.notes 
           ? `${existingOrder.notes}\n[Dibatalkan: ${reason}]`
           : `[Dibatalkan: ${reason}]`;
       }
 
       const { data, error } = await supabase
         .from('orders')
         .update(updateData)
         .eq('id', orderId)
         .select()
         .single();
 
       if (error) throw error;
       return data as Order;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['orders'] });
       queryClient.invalidateQueries({ queryKey: ['all-orders'] });
     },
   });
 }