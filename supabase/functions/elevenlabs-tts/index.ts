import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-id',
};

// Rate limiting configuration
const RATE_LIMIT_REQUESTS = 30; // max requests per window
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute window
const MAX_TEXT_LENGTH = 500; // Maximum characters for TTS

// Validate session ID format - matches the pattern from session.ts
function isValidSessionId(sessionId: string): boolean {
  if (!sessionId || sessionId.length < 10 || sessionId.length > 150) {
    return false;
  }
  // New UUID format: session_timestamp_uuid
  const uuidPattern = /^session_\d+_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  // Legacy format: session_timestamp_randomstring (for backward compatibility)
  const legacyPattern = /^session_\d+_[a-z0-9]+$/i;
  
  return uuidPattern.test(sessionId) || legacyPattern.test(sessionId);
}

// Server-side rate limiting using Deno KV
async function checkRateLimit(sessionId: string): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
  try {
    const kv = await Deno.openKv();
    const key = ['rate_limit', 'tts', sessionId];
    const now = Date.now();
    
    const result = await kv.get<{ count: number; resetAt: number }>(key);
    
    if (!result.value || now > result.value.resetAt) {
      // New window - reset counter
      await kv.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS }, { 
        expireIn: RATE_LIMIT_WINDOW_MS 
      });
      return { allowed: true, remaining: RATE_LIMIT_REQUESTS - 1 };
    }
    
    if (result.value.count >= RATE_LIMIT_REQUESTS) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((result.value.resetAt - now) / 1000);
      console.warn(`TTS rate limit exceeded for session: ${sessionId.substring(0, 20)}..., retry after: ${retryAfter}s`);
      return { allowed: false, remaining: 0, retryAfter };
    }
    
    // Increment counter
    await kv.set(key, { 
      count: result.value.count + 1, 
      resetAt: result.value.resetAt 
    }, { 
      expireIn: result.value.resetAt - now 
    });
    
    return { allowed: true, remaining: RATE_LIMIT_REQUESTS - result.value.count - 1 };
  } catch (error) {
    // If KV fails, log and allow request (fail open to not block legitimate users)
    console.error('TTS rate limit check failed:', error);
    return { allowed: true, remaining: -1 };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Validate session ID from header
    const sessionId = req.headers.get('x-session-id');
    
    if (!sessionId || !isValidSessionId(sessionId)) {
      console.warn('TTS request with invalid session:', sessionId?.substring(0, 20) || 'missing');
      return new Response(
        JSON.stringify({ error: 'Invalid or missing session ID' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 2. Check rate limit BEFORE any expensive operations
    const rateLimitResult = await checkRateLimit(sessionId);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          message: 'Tunggu sebentar ya, terlalu banyak permintaan suara. Coba lagi dalam 1 menit 😊'
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitResult.retryAfter || 60)
          } 
        }
      );
    }

    // 3. Parse and validate request body
    let text: string;
    let voiceId: string | undefined;
    
    try {
      const body = await req.json();
      text = body.text;
      voiceId = body.voiceId;
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 4. Validate text input
    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Text is required and must be a string' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Text cannot be empty' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (trimmedText.length > MAX_TEXT_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 5. Check for ElevenLabs API key
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      console.error('ELEVENLABS_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'TTS service unavailable' }),
        { 
          status: 503, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Log request for monitoring (without sensitive data)
    console.log('TTS request:', { 
      sessionPrefix: sessionId.substring(0, 20), 
      textLength: trimmedText.length,
      remaining: rateLimitResult.remaining 
    });

    // Use Roger voice by default (good for Indonesian), or allow custom
    const selectedVoiceId = voiceId || 'CwhRBWXzGAHq8TQ4Fs17';

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: trimmedText,
          model_id: 'eleven_turbo_v2_5', // Low latency, good quality
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
            speed: 1.1, // Slightly faster for conversational feel
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText.substring(0, 200));
      return new Response(
        JSON.stringify({ error: 'TTS generation failed' }),
        { 
          status: 502, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error) {
    console.error('TTS error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
