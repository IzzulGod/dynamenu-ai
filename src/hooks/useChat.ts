import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessage, MenuItem } from '@/types/restaurant';
import { AIAction, AIResponse } from '@/types/ai-actions';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCart } from './useCart';

function dedupeConsecutiveMessages(input: ChatMessage[]) {
  const out: ChatMessage[] = [];
  for (const msg of input) {
    const prev = out[out.length - 1];
    if (!prev) {
      out.push(msg);
      continue;
    }

    const sameRole = prev.role === msg.role;
    const sameContent = prev.content === msg.content;

    if (sameRole && sameContent) {
      const prevTs = prev.created_at ? Date.parse(prev.created_at) : NaN;
      const msgTs = msg.created_at ? Date.parse(msg.created_at) : NaN;
      const diff = Number.isFinite(prevTs) && Number.isFinite(msgTs) ? Math.abs(msgTs - prevTs) : 0;

      // If duplicates happen within 10s, treat as spam/duplicate and hide the later one.
      if (diff <= 10_000) continue;
    }

    out.push(msg);
  }
  return out;
}

interface UseChatOptions {
  menuItems?: MenuItem[];
}

export function useChat(sessionId: string, tableId: string | null, options: UseChatOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastActions, setLastActions] = useState<AIAction[]>([]);
  const queryClient = useQueryClient();
  const lastRequestTimeRef = useRef<number>(0);
  const requestInProgressRef = useRef<boolean>(false);
  
  const { items: cartItems, addItem, updateNotes, removeItem } = useCart();

  const { data: messages = [] } = useQuery({
    queryKey: ['chat-messages', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return dedupeConsecutiveMessages((data as ChatMessage[]) ?? []);
    },
    enabled: !!sessionId,
  });

  // Process AI actions and update cart
  const processActions = useCallback((actions: AIAction[], menuItems?: MenuItem[]) => {
    if (!actions || actions.length === 0) return;

    for (const action of actions) {
      switch (action.type) {
        case 'add_to_cart': {
          // Find menu item by ID or name
          const menuItem = menuItems?.find(
            (item) => item.id === action.menuItemId || 
                      item.name.toLowerCase() === action.menuItemName?.toLowerCase()
          );
          
          if (menuItem) {
            addItem(menuItem, action.quantity || 1, action.notes);
            toast.success(`${action.quantity || 1}x ${menuItem.name} ditambahkan ke keranjang! 🛒`, {
              description: action.notes ? `Catatan: ${action.notes}` : undefined,
            });
          } else {
            console.warn('Menu item not found for action:', action);
          }
          break;
        }
        
        case 'update_notes': {
          // Find item in cart and update notes
          const cartItem = cartItems.find(
            (item) => item.menuItem.id === action.menuItemId ||
                      item.menuItem.name.toLowerCase() === action.menuItemName?.toLowerCase()
          );
          
          if (cartItem && action.notes) {
            updateNotes(cartItem.menuItem.id, action.notes);
            toast.success(`Catatan ditambahkan ke ${cartItem.menuItem.name}! 📝`, {
              description: action.notes,
            });
          } else if (!cartItem && action.notes) {
            // Item not in cart yet, try to add with notes
            const menuItem = menuItems?.find(
              (item) => item.id === action.menuItemId ||
                        item.name.toLowerCase() === action.menuItemName?.toLowerCase()
            );
            if (menuItem) {
              addItem(menuItem, action.quantity || 1, action.notes);
              toast.success(`${menuItem.name} ditambahkan dengan catatan! 📝`, {
                description: action.notes,
              });
            }
          }
          break;
        }
        
        case 'remove_from_cart': {
          const cartItem = cartItems.find(
            (item) => item.menuItem.id === action.menuItemId ||
                      item.menuItem.name.toLowerCase() === action.menuItemName?.toLowerCase()
          );
          
          if (cartItem) {
            removeItem(cartItem.menuItem.id);
            toast.info(`${cartItem.menuItem.name} dihapus dari keranjang`);
          }
          break;
        }
      }
    }
    
    setLastActions(actions);
  }, [cartItems, addItem, updateNotes, removeItem]);

  const sendMessage = useCallback(
    async (content: string): Promise<string> => {
      // Prevent duplicate requests
      if (requestInProgressRef.current) {
        console.log('Request already in progress, skipping');
        return 'Mohon tunggu sebentar...';
      }

      // Rate limit client-side: minimum 2 seconds between requests
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTimeRef.current;
      if (timeSinceLastRequest < 2000) {
        toast.info('Tunggu sebentar ya, jangan terlalu cepat! 😊');
        return 'Mohon tunggu sebentar...';
      }

      requestInProgressRef.current = true;
      lastRequestTimeRef.current = now;
      setIsLoading(true);

      try {
        // Save user message
        await supabase.from('chat_messages').insert({
          session_id: sessionId,
          table_id: tableId,
          role: 'user',
          content,
        });

        // Prepare cart context for AI
        const cartContext = cartItems.map((item) => ({
          menuItemId: item.menuItem.id,
          name: item.menuItem.name,
          quantity: item.quantity,
          notes: item.notes,
        }));

        // Call AI edge function with cart context
        const response = await supabase.functions.invoke('restaurant-ai', {
          body: {
            messages: [
              ...messages.map((m) => ({ role: m.role, content: m.content })),
              { role: 'user', content },
            ],
            sessionId,
            tableId,
            cart: cartContext,
          },
        });

        if (response.error) {
          if (response.error.message?.includes('429') || response.error.message?.includes('rate')) {
            toast.error('AI sedang sibuk, coba lagi dalam beberapa detik');
            return 'Maaf, aku lagi sibuk. Coba lagi sebentar ya! 😅';
          }
          throw response.error;
        }

        const aiResponse = response.data as AIResponse;
        const assistantMessage = aiResponse?.message || 'Maaf, ada kendala. Coba lagi ya!';

        // Process any actions from AI
        if (aiResponse?.actions && aiResponse.actions.length > 0) {
          processActions(aiResponse.actions, options.menuItems);
        }

        // Save assistant message
        await supabase.from('chat_messages').insert({
          session_id: sessionId,
          table_id: tableId,
          role: 'assistant',
          content: assistantMessage,
        });

        // Refresh messages
        queryClient.invalidateQueries({ queryKey: ['chat-messages', sessionId] });

        return assistantMessage;
      } catch (error) {
        console.error('Chat error:', error);
        toast.error('Gagal mengirim pesan. Coba lagi nanti.');
        throw error;
      } finally {
        setIsLoading(false);
        requestInProgressRef.current = false;
      }
    },
    [sessionId, tableId, messages, queryClient, cartItems, processActions, options.menuItems]
  );

  return {
    messages,
    sendMessage,
    isLoading,
    lastActions,
  };
}
