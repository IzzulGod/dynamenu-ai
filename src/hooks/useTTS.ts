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
  const isMountedRef = useRef(true);

  // Keep ref in sync with state to avoid stale closures
  useEffect(() => {
    isEnabledRef.current = isEnabled;
  }, [isEnabled]);

  // Cleanup on unmount - CRITICAL fix for tab switching bug
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      
      // Force stop everything on unmount
      if (pendingAbortRef.current) {
        pendingAbortRef.current.abort();
        pendingAbortRef.current = null;
      }
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
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
    };
  }, []);

  const stop = useCallback(() => {
    // Cancel any pending fetch
    if (pendingAbortRef.current) {
      pendingAbortRef.current.abort();
      pendingAbortRef.current = null;
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
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
    
    // Only update state if mounted
    if (isMountedRef.current) {
      setIsPlaying(false);
      setIsLoading(false);
    }
  }, []);

  // Custom setEnabled that also stops current playback immediately
  const setEnabled = useCallback((enabled: boolean) => {
    // Update ref immediately for instant effect
    isEnabledRef.current = enabled;
    
    if (!enabled) {
      // Stop immediately when disabling
      stop();
    }
    
    if (isMountedRef.current) {
      setIsEnabledState(enabled);
    }
  }, [stop]);

  const speak = useCallback(async (text: string) => {
    // Use ref to get latest enabled state (avoids stale closure)
    if (!isEnabledRef.current) return;
    if (!text || text.trim().length === 0) return;
    if (!isMountedRef.current) return;
    
    // Stop any current playback first (prevents double voice)
    stop();
    
    // Double check enabled state after stop (might have changed)
    if (!isEnabledRef.current) return;
    if (!isMountedRef.current) return;
    
    // Prevent concurrent speaking
    if (isSpeakingRef.current) return;
    isSpeakingRef.current = true;
    
    if (isMountedRef.current) {
      setIsLoading(true);
      setError(null);
    }
    
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

      // Check if aborted, disabled, or unmounted during fetch
      if (abortController.signal.aborted || !isEnabledRef.current || !isMountedRef.current) {
        isSpeakingRef.current = false;
        if (isMountedRef.current) setIsLoading(false);
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
      if (!isEnabledRef.current || !isMountedRef.current) {
        isSpeakingRef.current = false;
        if (isMountedRef.current) setIsLoading(false);
        return;
      }
      
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onplay = () => {
        if (isEnabledRef.current && isMountedRef.current) {
          setIsPlaying(true);
        }
      };
      
      audio.onended = () => {
        isSpeakingRef.current = false;
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
        audioRef.current = null;
        
        if (isMountedRef.current) {
          setIsPlaying(false);
        }
      };
      
      audio.onerror = () => {
        isSpeakingRef.current = false;
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
        audioRef.current = null;
        
        if (isMountedRef.current) {
          setIsPlaying(false);
          setError('Gagal memutar audio');
        }
      };
      
      // Only play if still enabled and mounted
      if (isEnabledRef.current && isMountedRef.current) {
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
      isSpeakingRef.current = false;
      
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Gagal menghasilkan suara');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
      pendingAbortRef.current = null;
    }
  }, [voiceId, stop]);

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
