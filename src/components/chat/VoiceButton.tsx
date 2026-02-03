import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoiceButtonProps {
  isListening: boolean;
  isSupported: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function VoiceButton({
  isListening,
  isSupported,
  onClick,
  disabled,
  className,
}: VoiceButtonProps) {
  if (!isSupported) {
    return null;
  }

  return (
    <Button
      type="button"
      variant={isListening ? 'destructive' : 'outline'}
      size="icon"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-12 h-12 rounded-xl relative overflow-hidden transition-all duration-200',
        isListening && 'animate-pulse',
        className
      )}
      title={isListening ? 'Berhenti merekam' : 'Bicara ke AI'}
    >
      <AnimatePresence mode="wait">
        {isListening ? (
          <motion.div
            key="listening"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="flex items-center justify-center"
          >
            <MicOff className="w-5 h-5" />
            {/* Pulse rings */}
            <span className="absolute inset-0 rounded-xl border-2 border-destructive-foreground/30 animate-ping" />
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <Mic className="w-5 h-5" />
          </motion.div>
        )}
      </AnimatePresence>
    </Button>
  );
}
