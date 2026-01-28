import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, MenuItem } from '@/types/restaurant';

interface CartStore {
  items: CartItem[];
  tableId: string | null;
  tableNumber: number | null;
  addItem: (menuItem: MenuItem, quantity?: number, notes?: string) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  updateNotes: (menuItemId: string, notes: string) => void;
  clearCart: () => void;
  setTable: (tableId: string, tableNumber: number) => void;
  getTotalAmount: () => number;
  getTotalItems: () => number;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      tableId: null,
      tableNumber: null,

      addItem: (menuItem: MenuItem, quantity = 1, notes?: string) => {
        set((state) => {
          const existingItem = state.items.find(
            (item) => item.menuItem.id === menuItem.id
          );

          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.menuItem.id === menuItem.id
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              ),
            };
          }

          return {
            items: [...state.items, { menuItem, quantity, notes }],
          };
        });
      },

      removeItem: (menuItemId: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.menuItem.id !== menuItemId),
        }));
      },

      updateQuantity: (menuItemId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(menuItemId);
          return;
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.menuItem.id === menuItemId ? { ...item, quantity } : item
          ),
        }));
      },

      updateNotes: (menuItemId: string, notes: string) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.menuItem.id === menuItemId ? { ...item, notes } : item
          ),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      setTable: (tableId: string, tableNumber: number) => {
        set({ tableId, tableNumber });
      },

      getTotalAmount: () => {
        return get().items.reduce(
          (total, item) => total + item.menuItem.price * item.quantity,
          0
        );
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
    }),
    {
      name: 'restaurant-cart',
    }
  )
);
