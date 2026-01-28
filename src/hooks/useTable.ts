import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table } from '@/types/restaurant';

export function useTable(tableNumber: number | null) {
  return useQuery({
    queryKey: ['table', tableNumber],
    queryFn: async () => {
      if (!tableNumber) return null;
      
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .eq('table_number', tableNumber)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data as Table | null;
    },
    enabled: tableNumber !== null,
  });
}
