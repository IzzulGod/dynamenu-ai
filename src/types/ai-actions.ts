// AI Actions that can be returned from the restaurant-ai edge function
export interface AIAction {
  type: 'add_to_cart' | 'update_notes' | 'remove_from_cart';
  menuItemId: string;
  menuItemName?: string;
  quantity?: number;
  notes?: string;
}

export interface AIResponse {
  message: string;
  actions?: AIAction[];
  error?: string;
}
