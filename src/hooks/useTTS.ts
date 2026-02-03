import { useState, useCallback, useRef, useEffect } from 'react';
import { getSessionId } from '@/lib/session';

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
  const [isEnabled, setIsEnabledState] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const isEnabledRef = useRef(isEnabled);
  const isSpeakingRef = useRef(false);
  const pendingAbortRef = useRef<AbortController | null>(null);

  // Keep ref in sync with state to avoid stale closures
  useEffect(() => {
    isEnabledRef.current = isEnabled;
  }, [isEnabled]);

  const stop = useCallback(() => {
    // Cancel any pending fetch
    if (pendingAbortRef.current) {
      pendingAbortRef.current.abort();
      pendingAbortRef.current = null;
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.onplay = null;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    
    isSpeakingRef.current = false;
    setIsPlaying(false);
    setIsLoading(false);
  }, []);

  // Custom setEnabled that also stops current playback
  const setEnabled = useCallback((enabled: boolean) => {
    if (!enabled) {
      stop();
    }
    setIsEnabledState(enabled);
  }, [stop]);

  const speak = useCallback(async (text: string) => {
    // Use ref to get latest enabled state (avoids stale closure)
    if (!isEnabledRef.current && !autoPlay) return;
    if (!text || text.trim().length === 0) return;
    
    // Stop any current playback first (prevents double voice)
    stop();
    
    // Double check enabled state after stop (might have changed)
    if (!isEnabledRef.current) return;
    
    // Prevent concurrent speaking
    if (isSpeakingRef.current) return;
    isSpeakingRef.current = true;
    
    setIsLoading(true);
    setError(null);
    
    // Create abort controller for this request
    const abortController = new AbortController();
    pendingAbortRef.current = abortController;
    
    try {
      const sessionId = getSessionId();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'x-session-id': sessionId,
          },
          body: JSON.stringify({ text, voiceId }),
          signal: abortController.signal,
        }
      );

      // Check if aborted or disabled during fetch
      if (abortController.signal.aborted || !isEnabledRef.current) {
        isSpeakingRef.current = false;
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 429) {
          throw new Error(errorData.message || 'Terlalu banyak permintaan, coba lagi nanti');
        }
        
        throw new Error(errorData.error || `TTS request failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      
      // Final check before playing
      if (!isEnabledRef.current) {
        isSpeakingRef.current = false;
        setIsLoading(false);
        return;
      }
      
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onplay = () => {
        if (isEnabledRef.current) {
          setIsPlaying(true);
        }
      };
      
      audio.onended = () => {
        setIsPlaying(false);
        isSpeakingRef.current = false;
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
        audioRef.current = null;
      };
      
      audio.onerror = () => {
        setIsPlaying(false);
        isSpeakingRef.current = false;
        setError('Gagal memutar audio');
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
        audioRef.current = null;
      };
      
      // Only play if still enabled
      if (isEnabledRef.current) {
        await audio.play();
      } else {
        // Cleanup if disabled during load
        URL.revokeObjectURL(audioUrl);
        audioUrlRef.current = null;
        audioRef.current = null;
        isSpeakingRef.current = false;
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        isSpeakingRef.current = false;
        return;
      }
      console.error('TTS error:', err);
      setError(err instanceof Error ? err.message : 'Gagal menghasilkan suara');
      isSpeakingRef.current = false;
    } finally {
      setIsLoading(false);
      pendingAbortRef.current = null;
    }
  }, [autoPlay, voiceId, stop]);

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
