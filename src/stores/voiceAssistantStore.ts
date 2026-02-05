 import { create } from 'zustand';
 
 interface VoiceAssistantState {
   isActive: boolean;
   isListening: boolean;
   isSpeaking: boolean;
   isLoading: boolean;
   currentTranscript: string;
   showConfirmDialog: boolean;
   
   // Actions
   activate: () => void;
   deactivate: () => void;
   setListening: (listening: boolean) => void;
   setSpeaking: (speaking: boolean) => void;
   setLoading: (loading: boolean) => void;
   setTranscript: (transcript: string) => void;
   openConfirmDialog: () => void;
   closeConfirmDialog: () => void;
 }
 
 export const useVoiceAssistantStore = create<VoiceAssistantState>((set) => ({
   isActive: false,
   isListening: false,
   isSpeaking: false,
   isLoading: false,
   currentTranscript: '',
   showConfirmDialog: false,
   
   activate: () => set({ isActive: true, isListening: true }),
   deactivate: () => set({ 
     isActive: false, 
     isListening: false, 
     isSpeaking: false, 
     isLoading: false,
     currentTranscript: '',
     showConfirmDialog: false,
   }),
   setListening: (listening) => set({ isListening: listening }),
   setSpeaking: (speaking) => set({ isSpeaking: speaking }),
   setLoading: (loading) => set({ isLoading: loading }),
   setTranscript: (transcript) => set({ currentTranscript: transcript }),
   openConfirmDialog: () => set({ showConfirmDialog: true }),
   closeConfirmDialog: () => set({ showConfirmDialog: false }),
 }));