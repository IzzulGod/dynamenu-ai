 import { useMutation, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { Order } from '@/types/restaurant';
 
 /**
  * Hook for users to cancel their pending orders
  */
 export function useCancelOrder() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async (orderId: string) => {
       const { data, error } = await supabase
         .from('orders')
         .update({
           status: 'cancelled',
         })
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