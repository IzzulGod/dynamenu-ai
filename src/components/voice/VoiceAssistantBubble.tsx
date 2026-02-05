 import { useState, useEffect, useCallback, useRef } from 'react';
 import { motion, AnimatePresence } from 'framer-motion';
 import { Mic, MicOff, Volume2, X, Loader2 } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
 } from '@/components/ui/alert-dialog';
 import { useVoiceAssistantStore } from '@/stores/voiceAssistantStore';
 import { useVoiceInput } from '@/hooks/useVoiceInput';
 import { useTTS } from '@/hooks/useTTS';
 import { useChat } from '@/hooks/useChat';
 import { useCart } from '@/hooks/useCart';
 import { useMenuItems } from '@/hooks/useMenu';
 import { getSessionId } from '@/lib/session';
 import { cn } from '@/lib/utils';
 import { toast } from 'sonner';
 
 export function VoiceAssistantBubble() {
   const sessionId = getSessionId();
   const { tableId } = useCart();
   const { data: menuItems = [] } = useMenuItems();
   
   const {
     isActive,
     isListening,
     isSpeaking,
     isLoading,
     currentTranscript,
     showConfirmDialog,
     deactivate,
     setListening,
     setSpeaking,
     setLoading,
     setTranscript,
     openConfirmDialog,
     closeConfirmDialog,
   } = useVoiceAssistantStore();
   
   const processingRef = useRef(false);
   
   // TTS hook - always enabled when Voice Assistant is active
   const { 
     speak, 
     stop: stopTTS, 
     isPlaying, 
     isLoading: ttsLoading 
   } = useTTS({ autoPlay: true });
   
   // Chat hook for AI interaction
   const { sendMessage, isLoading: chatLoading } = useChat(sessionId, tableId, { menuItems });
   
   // Voice input hook
   const { 
     isListening: sttListening, 
     isSupported, 
     startListening, 
     stopListening, 
     transcript 
   } = useVoiceInput({
     onResult: async (result) => {
       if (!result.trim() || processingRef.current) return;
       
       processingRef.current = true;
       setListening(false);
       setLoading(true);
       
       try {
         // Send to AI and get response
         const response = await sendMessage(result);
         
         // Speak the response
         if (response && isActive) {
           setSpeaking(true);
           await speak(response);
         }
       } catch (error) {
         console.error('Voice Assistant error:', error);
         toast.error('Gagal memproses pesan');
       } finally {
         setLoading(false);
         setSpeaking(false);
         setTranscript('');
         processingRef.current = false;
         
         // Restart listening if still active
         if (isActive) {
           setTimeout(() => {
             setListening(true);
             startListening();
           }, 500);
         }
       }
     },
     onError: (error) => {
       toast.error(error);
       processingRef.current = false;
     },
   });
   
   // Sync listening state
   useEffect(() => {
     if (isActive && isListening && !sttListening && !processingRef.current) {
       startListening();
     }
   }, [isActive, isListening, sttListening, startListening]);
   
   // Update transcript display
   useEffect(() => {
     if (transcript) {
       setTranscript(transcript);
     }
   }, [transcript, setTranscript]);
   
   // Sync speaking state with TTS
   useEffect(() => {
     setSpeaking(isPlaying);
   }, [isPlaying, setSpeaking]);
   
   // Sync loading state
   useEffect(() => {
     setLoading(chatLoading || ttsLoading);
   }, [chatLoading, ttsLoading, setLoading]);
   
   // Cleanup on deactivate
   useEffect(() => {
     if (!isActive) {
       stopListening();
       stopTTS();
       processingRef.current = false;
     }
   }, [isActive, stopListening, stopTTS]);
   
   const handleBubbleClick = () => {
     openConfirmDialog();
   };
   
   const handleConfirmEnd = () => {
     stopListening();
     stopTTS();
     deactivate();
     toast.success('Voice Assistant dinonaktifkan');
   };
   
   if (!isActive) return null;
   
   return (
     <>
       {/* Floating Bubble */}
       <AnimatePresence>
         <motion.div
           initial={{ scale: 0, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           exit={{ scale: 0, opacity: 0 }}
           className="fixed bottom-24 right-4 z-50"
         >
           <motion.button
             onClick={handleBubbleClick}
             className={cn(
               "relative w-16 h-16 rounded-full shadow-lg flex items-center justify-center transition-colors",
               "bg-primary text-primary-foreground",
               isSpeaking && "bg-secondary",
               isLoading && "bg-muted"
             )}
             whileTap={{ scale: 0.95 }}
             animate={isSpeaking || isListening ? { 
               boxShadow: ['0 0 0 0 rgba(var(--primary), 0.4)', '0 0 0 20px rgba(var(--primary), 0)']
             } : {}}
             transition={isSpeaking || isListening ? { 
               duration: 1.5, 
               repeat: Infinity 
             } : {}}
           >
             {isLoading ? (
               <Loader2 className="w-6 h-6 animate-spin" />
             ) : isSpeaking ? (
               <Volume2 className="w-6 h-6 animate-pulse" />
             ) : isListening ? (
               <Mic className="w-6 h-6 animate-pulse" />
             ) : (
               <MicOff className="w-6 h-6" />
             )}
             
             {/* Status indicator dot */}
             <span className={cn(
               "absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-background",
               isListening && "bg-emerald-500",
               isSpeaking && "bg-primary",
               isLoading && "bg-amber-500",
               !isListening && !isSpeaking && !isLoading && "bg-muted-foreground"
             )} />
           </motion.button>
           
           {/* Transcript display */}
           <AnimatePresence>
             {currentTranscript && (
               <motion.div
                 initial={{ opacity: 0, y: 10, scale: 0.9 }}
                 animate={{ opacity: 1, y: 0, scale: 1 }}
                 exit={{ opacity: 0, y: 10, scale: 0.9 }}
                 className="absolute bottom-20 right-0 bg-card border border-border rounded-lg p-3 shadow-lg max-w-[250px]"
               >
                 <p className="text-sm text-foreground">{currentTranscript}</p>
               </motion.div>
             )}
           </AnimatePresence>
           
           {/* Status label */}
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap"
           >
             <span className="text-xs text-muted-foreground bg-background/80 px-2 py-0.5 rounded-full">
               {isLoading ? 'Memproses...' : isSpeaking ? 'AI Berbicara' : isListening ? 'Mendengarkan...' : 'Voice Assistant'}
             </span>
           </motion.div>
         </motion.div>
       </AnimatePresence>
       
       {/* Confirmation Dialog */}
       <AlertDialog open={showConfirmDialog} onOpenChange={closeConfirmDialog}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Akhiri Voice Assistant?</AlertDialogTitle>
             <AlertDialogDescription>
               Apakah Anda ingin mengakhiri sesi Voice Assistant? Anda tetap bisa menggunakan chat teks seperti biasa.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel>Batal</AlertDialogCancel>
             <AlertDialogAction onClick={handleConfirmEnd}>
               Ya, Akhiri
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
     </>
   );
 }