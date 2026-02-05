import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Sparkles, Loader2, ShoppingCart, FileText, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatMessage } from '@/types/restaurant';
import { cn } from '@/lib/utils';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { VoiceAssistantButton } from '@/components/voice/VoiceAssistantButton';
import { toast } from 'sonner';

interface AIChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<string | void>;
  isLoading: boolean;
  tableNumber: number | null;
}

export function AIChat({ messages, onSendMessage, isLoading, tableNumber }: AIChatProps) {
  const [input, setInput] = useState('');
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Voice input hook
  const { isListening, isSupported: sttSupported, startListening, stopListening, transcript } = useVoiceInput({
    onResult: (result) => {
      setInput(result);
      // Auto-send after voice input
      if (result.trim()) {
        handleSendMessage(result.trim());
      }
    },
    onError: (error) => {
      toast.error(error);
    },
  });

  // Update input as user speaks
  useEffect(() => {
    if (isListening && transcript) {
      setInput(transcript);
    }
  }, [isListening, transcript]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, pendingUserMessage]);

  const handleSendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;
    
    // Show user message immediately in UI
    setPendingUserMessage(messageText);
    setInput('');
    
    try {
      const response = await onSendMessage(messageText);
      // Clear pending message after server confirms
      setPendingUserMessage(null);
    } catch (error) {
      // Keep pending message visible on error
      setPendingUserMessage(null);
      setInput(messageText); // Restore input on error
    }
  }, [isLoading, onSendMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSendMessage(input.trim());
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const quickSuggestions = [
    'Menu rekomendasinya apa?',
    'Ada yang pedas ga?',
    'Minuman segar dong!',
    'Aku alergi kacang',
  ];

  const actionExamples = [
    { icon: ShoppingCart, text: 'Masukin Nasi Goreng ke keranjang' },
    { icon: FileText, text: 'Tambah catatan: tidak pedas' },
  ];

  // Combine server messages with pending user message
  const displayMessages = [...messages];
  
  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-gradient-to-r from-primary/10 to-secondary/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
            <Bot className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">Asisten Restoran AI</h3>
            <p className="text-xs text-muted-foreground">
              {tableNumber ? `Meja ${tableNumber}` : 'Siap membantu!'} • Bisa tambah ke keranjang! 🛒
            </p>
          </div>
          
          {/* Voice Assistant Button */}
          <VoiceAssistantButton />
          
          <Sparkles className="w-5 h-5 text-primary animate-pulse" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !pendingUserMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <div className="text-5xl mb-4">👋</div>
            <p className="text-muted-foreground mb-4">
              Hai! Aku asisten AI restoran. Mau tanya-tanya, minta rekomendasi, atau langsung pesan?
            </p>
            
            {/* Quick suggestions */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
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

            {/* Action examples hint */}
            <div className="bg-muted/50 rounded-xl p-4 text-left max-w-xs mx-auto">
              <p className="text-xs font-medium text-muted-foreground mb-2">💡 Fitur baru:</p>
              <div className="space-y-2">
                {actionExamples.map((example, i) => (
                  <button
                    key={i}
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                    onClick={() => {
                      setInput(example.text);
                      inputRef.current?.focus();
                    }}
                  >
                    <example.icon className="w-3 h-3 text-primary" />
                    <span>"{example.text}"</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {/* Render confirmed messages from server */}
          {displayMessages.map((message, index) => (
            <motion.div
              key={message.id || `msg-${index}`}
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

          {/* Show pending user message immediately */}
          {pendingUserMessage && (
            <motion.div
              key="pending-user-message"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 justify-end"
            >
              <div className="max-w-[80%] whitespace-pre-wrap chat-bubble-user">
                {pendingUserMessage}
              </div>
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-primary-foreground" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Typing indicator - shows AFTER user message */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
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
          {/* Voice Input Button */}
          {sttSupported && (
            <Button
              type="button"
              variant={isListening ? "default" : "outline"}
              size="icon"
              className={cn(
                "w-12 h-12 rounded-xl shrink-0 transition-all",
                isListening && "bg-destructive hover:bg-destructive/90 animate-pulse"
              )}
              onClick={toggleVoiceInput}
              disabled={isLoading}
            >
              {isListening ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </Button>
          )}
          
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? "Sedang mendengarkan..." : "Ketik atau tekan mikrofon untuk bicara..."}
            className={cn(
              "flex-1 h-12 rounded-xl transition-all",
              isListening && "border-destructive ring-2 ring-destructive/20"
            )}
            disabled={isLoading || isListening}
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
        
        {/* Voice input hint */}
        {isListening && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-center text-destructive mt-2"
          >
            🎤 Bicara sekarang... Tekan tombol mikrofon lagi untuk berhenti
          </motion.p>
        )}
      </form>
    </div>
  );
}
