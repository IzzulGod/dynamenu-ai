import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessage } from '@/types/restaurant';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export function useChat(sessionId: string, tableId: string | null) {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

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

        if (response.error) throw response.error;

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
        throw error;
      } finally {
        setIsLoading(false);
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
