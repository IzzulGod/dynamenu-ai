import { motion } from 'framer-motion';
import { ShoppingCart, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatSuggestionsProps {
  onSuggestionClick: (text: string) => void;
}

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

export function ChatSuggestions({ onSuggestionClick }: ChatSuggestionsProps) {
  return (
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
            onClick={() => onSuggestionClick(suggestion)}
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
              onClick={() => onSuggestionClick(example.text)}
            >
              <example.icon className="w-3 h-3 text-primary" />
              <span>"{example.text}"</span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
