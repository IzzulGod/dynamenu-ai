import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseTTSOptions {
  voiceId?: string;
  autoPlay?: boolean;
}

interface UseTTSReturn {
  speak: (text: string) => Promise<void>;
  stop: () => void;
  isPlaying: boolean;
  isLoading: boolean;
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
  error: string | null;
}

export function useTTS(options: UseTTSOptions = {}): UseTTSReturn {
  const { voiceId, autoPlay = true } = options;
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnabled, setEnabled] = useState(true); // TTS enabled by default
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  const speak = useCallback(async (text: string) => {
    if (!isEnabled && !autoPlay) return;
    if (!text || text.trim().length === 0) return;
    
    // Stop any current playback
    stop();
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Call the TTS edge function using fetch for binary data
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text, voiceId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `TTS request failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        audioUrlRef.current = null;
      };
      audio.onerror = () => {
        setIsPlaying(false);
        setError('Gagal memutar audio');
        URL.revokeObjectURL(audioUrl);
        audioUrlRef.current = null;
      };
      
      await audio.play();
    } catch (err) {
      console.error('TTS error:', err);
      setError(err instanceof Error ? err.message : 'Gagal menghasilkan suara');
    } finally {
      setIsLoading(false);
    }
  }, [isEnabled, autoPlay, voiceId, stop]);

  return {
    speak,
    stop,
    isPlaying,
    isLoading,
    isEnabled,
    setEnabled,
    error,
  };
}
