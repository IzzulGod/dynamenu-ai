import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MenuCategory, MenuItem } from '@/types/restaurant';

export function useCategories() {
  return useQuery({
    queryKey: ['menu-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as MenuCategory[];
    },
  });
}

export function useMenuItems(categoryId?: string) {
  return useQuery({
    queryKey: ['menu-items', categoryId],
    queryFn: async () => {
      let query = supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
        .order('is_recommended', { ascending: false });
      
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as MenuItem[];
    },
  });
}

export function useRecommendedItems() {
  return useQuery({
    queryKey: ['recommended-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
        .eq('is_recommended', true)
        .limit(6);
      
      if (error) throw error;
      return data as MenuItem[];
    },
  });
}
