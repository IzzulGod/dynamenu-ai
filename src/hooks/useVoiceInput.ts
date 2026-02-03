import { useState, useCallback, useRef, useEffect } from 'react';

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  0: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface UseVoiceInputOptions {
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
  language?: string;
}

interface UseVoiceInputReturn {
  isListening: boolean;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  transcript: string;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const { onResult, onError, language = 'id-ID' } = options;
  
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isListeningRef = useRef(false);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  // Keep refs updated
  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  }, [onResult, onError]);

  useEffect(() => {
    // Check for browser support
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionAPI);
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  const initRecognition = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return null;
    
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    
    recognition.onstart = () => {
      setIsListening(true);
    };
    
    recognition.onend = () => {
      // Auto-restart if still listening (to handle auto-stop after silence)
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch (e) {
          // Already started or other error, ignore
          console.log('Recognition restart skipped:', e);
        }
      } else {
        setIsListening(false);
      }
    };
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const current = event.resultIndex;
      const result = event.results[current];
      const transcriptText = result[0].transcript;
      
      setTranscript(transcriptText);
      
      // Only trigger callback on final result
      if (result.isFinal && onResultRef.current) {
        onResultRef.current(transcriptText);
        // Stop listening after getting final result
        isListeningRef.current = false;
        setIsListening(false);
        recognition.stop();
      }
    };
    
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      
      // Don't stop for no-speech error (will auto-restart via onend)
      if (event.error === 'no-speech') {
        return;
      }
      
      isListeningRef.current = false;
      setIsListening(false);
      
      if (onErrorRef.current) {
        switch (event.error) {
          case 'audio-capture':
            onErrorRef.current('Mikrofon tidak ditemukan.');
            break;
          case 'not-allowed':
            onErrorRef.current('Izin mikrofon ditolak.');
            break;
          case 'aborted':
            // User aborted, no error message needed
            break;
          default:
            onErrorRef.current('Terjadi kesalahan. Coba lagi.');
        }
      }
    };
    
    return recognition;
  }, [language]);

  const startListening = useCallback(() => {
    if (isListeningRef.current) return;
    
    // Initialize recognition on user gesture (required by Web Speech API)
    if (!recognitionRef.current) {
      recognitionRef.current = initRecognition();
    }
    
    if (recognitionRef.current) {
      setTranscript('');
      isListeningRef.current = true;
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start recognition:', error);
        // If failed, try creating new instance
        recognitionRef.current = initRecognition();
        if (recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.error('Failed to start new recognition:', e);
            isListeningRef.current = false;
            if (onErrorRef.current) {
              onErrorRef.current('Gagal memulai pengenalan suara. Coba lagi.');
            }
          }
        }
      }
    }
  }, [initRecognition]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Already stopped
      }
    }
  }, []);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    transcript,
  };
}
