import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatMessage } from '@/types/restaurant';
import { cn } from '@/lib/utils';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { VoiceButton } from './VoiceButton';
import { ChatBubble } from './ChatBubble';
import { TypingIndicator } from './TypingIndicator';
import { ChatSuggestions } from './ChatSuggestions';

interface AIChatProps {
  messages: ChatMessage[];
  pendingUserMessage: string | null;
  onSendMessage: (message: string) => Promise<string | void>;
  isLoading: boolean;
  tableNumber: number | null;
}

export function AIChat({ messages, pendingUserMessage, onSendMessage, isLoading, tableNumber }: AIChatProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, pendingUserMessage, isLoading]);

  // Voice input handler
  const handleVoiceResult = useCallback((transcript: string) => {
    setInput(transcript);
    inputRef.current?.focus();
  }, []);

  const handleVoiceInterim = useCallback((transcript: string) => {
    setInput(transcript);
  }, []);

  const { isListening, isSupported, toggleListening } = useVoiceInput({
    onResult: handleVoiceResult,
    onInterimResult: handleVoiceInterim,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');
    await onSendMessage(message);
  };

  const handleSuggestionClick = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-gradient-to-r from-primary/10 to-secondary/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Asisten Restoran AI</h3>
            <p className="text-xs text-muted-foreground">
              {tableNumber ? `Meja ${tableNumber}` : 'Siap membantu!'} • Bisa tambah ke keranjang! 🛒
            </p>
          </div>
          <Sparkles className="w-5 h-5 text-primary ml-auto animate-pulse" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !pendingUserMessage && (
          <ChatSuggestions onSuggestionClick={handleSuggestionClick} />
        )}

        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => (
            <ChatBubble key={message.id || index} message={message} index={index} />
          ))}
        </AnimatePresence>

        {/* Pending user message (shown immediately before AI response) */}
        {pendingUserMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 justify-end"
          >
            <div className="max-w-[80%] whitespace-pre-wrap chat-bubble-user">
              {pendingUserMessage}
            </div>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="text-sm">👤</span>
            </div>
          </motion.div>
        )}

        {/* Typing indicator - only shown when loading AND after user message is displayed */}
        {isLoading && pendingUserMessage && (
          <TypingIndicator />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border">
        <div className="flex gap-2">
          <VoiceButton
            isListening={isListening}
            isSupported={isSupported}
            onClick={toggleListening}
            disabled={isLoading}
          />
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? '🎤 Bicara sekarang...' : 'Ketik atau bicara ke AI...'}
            className={cn(
              'flex-1 h-12 rounded-xl transition-all duration-200',
              isListening && 'border-destructive ring-2 ring-destructive/20'
            )}
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            className="w-12 h-12 rounded-xl"
            disabled={!input.trim() || isLoading}
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
