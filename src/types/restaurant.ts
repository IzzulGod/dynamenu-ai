export interface Table {
  id: string;
  table_number: number;
  is_active: boolean;
  capacity: number;
}

export interface MenuCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
}

export interface MenuItem {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  tags: string[];
  is_available: boolean;
  is_recommended: boolean;
  preparation_time: number;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

export interface Order {
  id: string;
  table_id: string | null;
  session_id: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  payment_method: 'qris' | 'cash' | null;
  payment_status: 'pending' | 'paid' | 'failed';
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  quantity: number;
  unit_price: number;
  notes: string | null;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  table_id: string | null;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface OrderWithItems extends Order {
  order_items: (OrderItem & { menu_items: MenuItem | null })[];
  tables: Table | null;
}
