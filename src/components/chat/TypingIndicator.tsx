import { motion } from 'framer-motion';
import { Bot, Loader2 } from 'lucide-react';

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
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
  );
}
