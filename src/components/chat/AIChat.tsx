import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatMessage } from '@/types/restaurant';
import { cn } from '@/lib/utils';

interface AIChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<string | void>;
  isLoading: boolean;
  tableNumber: number | null;
}

export function AIChat({ messages, onSendMessage, isLoading, tableNumber }: AIChatProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');
    await onSendMessage(message);
  };

  const quickSuggestions = [
    'Menu rekomendasinya apa?',
    'Ada yang pedas ga?',
    'Minuman segar dong!',
    'Yang sehat ada apa?',
  ];

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
              {tableNumber ? `Meja ${tableNumber}` : 'Siap membantu!'} • Online
            </p>
          </div>
          <Sparkles className="w-5 h-5 text-primary ml-auto animate-pulse" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <div className="text-5xl mb-4">👋</div>
            <p className="text-muted-foreground mb-4">
              Hai! Aku asisten AI restoran. Mau tanya-tanya atau langsung pesan?
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {quickSuggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setInput(suggestion);
                    inputRef.current?.focus();
                  }}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => (
            <motion.div
              key={message.id || index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                'flex gap-3',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-secondary-foreground" />
                </div>
              )}
              
              <div
                className={cn(
                  'max-w-[80%] whitespace-pre-wrap',
                  message.role === 'user'
                    ? 'chat-bubble-user'
                    : 'chat-bubble-assistant'
                )}
              >
                {message.content}
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
              <Bot className="w-4 h-4 text-secondary-foreground" />
            </div>
            <div className="chat-bubble-assistant flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Mengetik...</span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ketik pesan atau tanya menu..."
            className="flex-1 h-12 rounded-xl"
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
