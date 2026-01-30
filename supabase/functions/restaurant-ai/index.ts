import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-session-id",
};

// Input validation schema (manual implementation for Deno compatibility)
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface RequestPayload {
  sessionId: string;
  tableId: string | null;
  messages: ChatMessage[];
}

function validateSessionId(sessionId: unknown): string {
  if (typeof sessionId !== 'string') {
    throw new Error('sessionId must be a string');
  }
  if (sessionId.length < 10 || sessionId.length > 100) {
    throw new Error('sessionId must be between 10 and 100 characters');
  }
  // Validate format: session_timestamp_randomstring
  if (!/^session_\d+_[a-z0-9]+$/i.test(sessionId)) {
    throw new Error('Invalid sessionId format');
  }
  return sessionId;
}

function validateTableId(tableId: unknown): string | null {
  if (tableId === null || tableId === undefined) {
    return null;
  }
  if (typeof tableId !== 'string') {
    throw new Error('tableId must be a string or null');
  }
  // UUID format validation
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tableId)) {
    throw new Error('tableId must be a valid UUID');
  }
  return tableId;
}

function validateMessages(messages: unknown): ChatMessage[] {
  if (!Array.isArray(messages)) {
    throw new Error('messages must be an array');
  }
  if (messages.length < 1) {
    throw new Error('messages must have at least 1 item');
  }
  if (messages.length > 50) {
    throw new Error('messages cannot exceed 50 items');
  }
  
  return messages.map((msg, index) => {
    if (typeof msg !== 'object' || msg === null) {
      throw new Error(`messages[${index}] must be an object`);
    }
    
    const { role, content } = msg as { role?: unknown; content?: unknown };
    
    if (!['user', 'assistant', 'system'].includes(role as string)) {
      throw new Error(`messages[${index}].role must be 'user', 'assistant', or 'system'`);
    }
    
    if (typeof content !== 'string') {
      throw new Error(`messages[${index}].content must be a string`);
    }
    
    if (content.length > 2000) {
      throw new Error(`messages[${index}].content exceeds 2000 character limit`);
    }
    
    return { role: role as ChatMessage['role'], content: content.slice(0, 2000) };
  });
}

function validateRequest(data: unknown): RequestPayload {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Request body must be an object');
  }
  
  const { sessionId, tableId, messages } = data as Record<string, unknown>;
  
  return {
    sessionId: validateSessionId(sessionId),
    tableId: validateTableId(tableId),
    messages: validateMessages(messages),
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ 
          error: "Service unavailable",
          message: "Maaf, ada kendala teknis. Silakan lihat menu manual dulu ya!"
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Parse and validate request body
    let rawData: unknown;
    try {
      rawData = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ 
          error: "Invalid JSON",
          message: "Maaf, ada masalah dengan permintaan. Coba lagi ya!"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate input
    let validatedData: RequestPayload;
    try {
      validatedData = validateRequest(rawData);
    } catch (validationError) {
      console.error("Validation error:", validationError);
      return new Response(
        JSON.stringify({ 
          error: "Invalid input",
          message: "Maaf, ada masalah dengan data yang dikirim. Coba refresh halaman ya!"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages, sessionId, tableId } = validatedData;

    console.log("Validated request:", { sessionId, tableId, messageCount: messages.length });

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Fetch menu items for context
    const { data: menuItems, error: menuError } = await supabase
      .from("menu_items")
      .select(`
        id,
        name,
        description,
        price,
        tags,
        is_available,
        is_recommended,
        preparation_time,
        category_id,
        menu_categories (
          name
        )
      `)
      .eq("is_available", true);

    if (menuError) {
      console.error("Error fetching menu:", menuError);
    }

    // Fetch current cart/orders for this session using service role to bypass RLS
    // Note: We use service role here because we validated the sessionId above
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY 
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      : supabase;

    const { data: sessionOrders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        status,
        total_amount,
        order_items (
          quantity,
          menu_item_id,
          menu_items (name)
        )
      `)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(3);

    if (ordersError) {
      console.error("Error fetching orders:", ordersError);
    }

    // Build menu context
    const menuContext = menuItems?.map((item: Record<string, unknown>) => ({
      name: item.name,
      description: item.description,
      price: `Rp${(item.price as number).toLocaleString('id-ID')}`,
      category: (item.menu_categories as Record<string, unknown>)?.name || 'Lainnya',
      tags: (item.tags as string[])?.join(', ') || '',
      recommended: item.is_recommended,
      prepTime: `${item.preparation_time} menit`,
    })) || [];

    // Build order context
    const orderContext = sessionOrders?.map((order: Record<string, unknown>) => ({
      status: order.status,
      total: `Rp${(order.total_amount as number).toLocaleString('id-ID')}`,
      items: (order.order_items as Array<Record<string, unknown>>)?.map((oi) => 
        `${oi.quantity}x ${(oi.menu_items as Record<string, unknown>)?.name || 'Item'}`
      ).join(', ') || 'Kosong',
    })) || [];

    // System prompt for restaurant AI
    const systemPrompt = `Kamu adalah asisten AI ramah di restoran. Nama kamu adalah "RestoAI".

TUGAS UTAMA:
1. Menyapa tamu dengan hangat
2. Memberikan rekomendasi menu berdasarkan preferensi
3. Menjawab pertanyaan tentang menu (bahan, alergi, porsi)
4. Membantu proses pemesanan via chat

MENU TERSEDIA:
${JSON.stringify(menuContext, null, 2)}

PESANAN TERBARU CUSTOMER INI:
${JSON.stringify(orderContext, null, 2)}

ATURAN PENTING:
- Jawab dalam Bahasa Indonesia dengan santai tapi sopan
- Jika ditanya rekomendasi, lihat tags dan deskripsi menu
- Untuk diet/alergi, periksa tags (vegetarian, sehat, pedas, dll)
- Sebutkan harga jika relevan
- Jika customer mau pesan, arahkan untuk klik tombol "+" di menu atau konfirmasi item
- Respon singkat dan helpful, maksimal 2-3 kalimat
- Jangan pernah buat menu palsu yang tidak ada di daftar
- Jika tidak yakin, jujur saja dan tawarkan untuk panggil waiter

CONTOH RESPON:
User: "Ada yang seger ga?"
AI: "Ada dong! 🍊 Jus Jeruk Segar (Rp25.000) fresh banget, atau Smoothie Berry buat yang suka sehat. Mau coba yang mana?"

User: "Aku lagi diet"
AI: "Mantap! 💪 Coba Salad Garden Bowl, sehat dan segar. Atau Grilled Salmon buat protein tinggi. Keduanya recommended lho!"`;

    // Prepare messages for AI (limit to last 10 for context)
    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-10),
    ];

    console.log("Calling AI gateway with", aiMessages.length, "messages");

    // Call Lovable AI Gateway
    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: aiMessages,
          temperature: 0.8,
          max_tokens: 500,
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Rate limit exceeded",
            message: "Maaf, aku lagi sibuk banget. Coba lagi beberapa saat ya! 😅" 
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "Service unavailable",
            message: "Maaf, ada kendala teknis. Bisa lihat menu manual dulu ya!" 
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Generic error - don't leak internal details
      return new Response(
        JSON.stringify({ 
          error: "Service error",
          message: "Waduh, ada masalah teknis nih. Coba lagi ya, atau langsung pilih dari menu! 😊"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices?.[0]?.message?.content || 
      "Maaf, aku lagi loading. Coba tanya lagi ya! 🙏";

    console.log("AI response received:", assistantMessage.substring(0, 100));

    return new Response(
      JSON.stringify({ message: assistantMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in restaurant-ai function:", error);
    // Return generic error message - never leak internal error details
    return new Response(
      JSON.stringify({ 
        error: "Internal error",
        message: "Waduh, ada masalah teknis nih. Coba lagi ya, atau langsung pilih dari menu! 😊"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
