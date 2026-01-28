import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderWithItems } from '@/types/restaurant';
import { useEffect } from 'react';

export function useSessionOrders(sessionId: string) {
  return useQuery({
    queryKey: ['orders', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            menu_items (*)
          ),
          tables (*)
        `)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as OrderWithItems[];
    },
    enabled: !!sessionId,
  });
}

export function useAllOrders() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['all-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            menu_items (*)
          ),
          tables (*)
        `)
        .in('status', ['pending', 'confirmed', 'preparing', 'ready'])
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as OrderWithItems[];
    },
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['all-orders'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tableId,
      sessionId,
      items,
      totalAmount,
      notes,
    }: {
      tableId: string;
      sessionId: string;
      items: { menuItemId: string; quantity: number; unitPrice: number; notes?: string }[];
      totalAmount: number;
      notes?: string;
    }) => {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          table_id: tableId,
          session_id: sessionId,
          total_amount: totalAmount,
          notes,
          status: 'pending',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        menu_item_id: item.menuItemId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        notes: item.notes,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      return order as Order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['all-orders'] });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: string;
      status: Order['status'];
    }) => {
      const { data, error } = await supabase
        .from('orders')
        .update({ status })
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

export function useUpdatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      paymentMethod,
      paymentStatus,
    }: {
      orderId: string;
      paymentMethod: 'qris' | 'cash';
      paymentStatus: 'pending' | 'paid' | 'failed';
    }) => {
      const updateData: Partial<Order> = {
        payment_method: paymentMethod,
        payment_status: paymentStatus,
      };

      // If paid, also update status to confirmed
      if (paymentStatus === 'paid') {
        updateData.status = 'confirmed';
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
