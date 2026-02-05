 import { Headphones } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { useVoiceAssistantStore } from '@/stores/voiceAssistantStore';
 import { useVoiceInput } from '@/hooks/useVoiceInput';
 import { toast } from 'sonner';
 import { cn } from '@/lib/utils';
 
 export function VoiceAssistantButton() {
   const { isActive, activate } = useVoiceAssistantStore();
   const { isSupported } = useVoiceInput();
   
   const handleActivate = () => {
     if (!isSupported) {
       toast.error('Browser Anda tidak mendukung pengenalan suara');
       return;
     }
     
     activate();
     toast.success('Voice Assistant diaktifkan! 🎤', {
       description: 'Silakan bicara dengan AI. Tekan bubble untuk mengakhiri.',
     });
   };
   
   if (isActive) return null;
   
   return (
     <Button
       variant="outline"
       size="sm"
       className={cn(
         "gap-2 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20",
         "hover:from-primary/20 hover:to-secondary/20 transition-all"
       )}
       onClick={handleActivate}
     >
       <Headphones className="w-4 h-4" />
       <span className="text-xs">Voice Assistant</span>
     </Button>
   );
 }