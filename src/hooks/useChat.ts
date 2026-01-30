import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessage } from '@/types/restaurant';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useChat(sessionId: string, tableId: string | null) {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const lastRequestTimeRef = useRef<number>(0);
  const requestInProgressRef = useRef<boolean>(false);

  const { data: messages = [] } = useQuery({
    queryKey: ['chat-messages', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!sessionId,
  });

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

        // Call AI edge function
        const response = await supabase.functions.invoke('restaurant-ai', {
          body: {
            messages: [
              ...messages.map((m) => ({ role: m.role, content: m.content })),
              { role: 'user', content },
            ],
            sessionId,
            tableId,
          },
        });

        if (response.error) {
          // Handle rate limit specifically
          if (response.error.message?.includes('429') || response.error.message?.includes('rate')) {
            toast.error('AI sedang sibuk, coba lagi dalam beberapa detik');
            return 'Maaf, aku lagi sibuk. Coba lagi sebentar ya! 😅';
          }
          throw response.error;
        }

        const assistantMessage = response.data?.message || 'Maaf, ada kendala. Coba lagi ya!';

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
    [sessionId, tableId, messages, queryClient]
  );

  return {
    messages,
    sendMessage,
    isLoading,
  };
}
