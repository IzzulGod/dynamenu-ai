import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-session-id",
};

// Input validation schema
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface CartItem {
  menuItemId: string;
  name: string;
  quantity: number;
  notes?: string;
}

interface RequestPayload {
  sessionId: string;
  tableId: string | null;
  messages: ChatMessage[];
  cart?: CartItem[];
}

// AI Actions that can manipulate the cart
interface AIAction {
  type: 'add_to_cart' | 'update_notes' | 'remove_from_cart';
  menuItemId: string;
  menuItemName?: string;
  quantity?: number;
  notes?: string;
}

function validateSessionId(sessionId: unknown): string {
  if (typeof sessionId !== 'string') {
    throw new Error('sessionId must be a string');
  }
  if (sessionId.length < 10 || sessionId.length > 150) {
    throw new Error('sessionId must be between 10 and 150 characters');
  }
  // Support both new UUID format and legacy format for backward compatibility
  const uuidPattern = /^session_\d+_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const legacyPattern = /^session_\d+_[a-z0-9]+$/i;
  
  if (!uuidPattern.test(sessionId) && !legacyPattern.test(sessionId)) {
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

function validateCart(cart: unknown): CartItem[] {
  if (cart === null || cart === undefined) {
    return [];
  }
  if (!Array.isArray(cart)) {
    return [];
  }
  return cart.filter((item): item is CartItem => 
    typeof item === 'object' && 
    item !== null && 
    typeof item.menuItemId === 'string'
  );
}

function validateRequest(data: unknown): RequestPayload {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Request body must be an object');
  }
  
  const { sessionId, tableId, messages, cart } = data as Record<string, unknown>;
  
  return {
    sessionId: validateSessionId(sessionId),
    tableId: validateTableId(tableId),
    messages: validateMessages(messages),
    cart: validateCart(cart),
  };
}

function parseAIActions(content: string, menuItems: Array<{ id: string; name: string }>): AIAction[] {
  const actions: AIAction[] = [];
  
  // Look for action markers in the AI response
  // Format: [[ACTION:type:menuItemName:quantity:notes]]
  const actionPattern = /\[\[ACTION:(add_to_cart|update_notes|remove_from_cart):([^:]+)(?::(\d+))?(?::([^\]]+))?\]\]/g;
  
  let match;
  while ((match = actionPattern.exec(content)) !== null) {
    const [, type, menuItemName, quantityStr, notes] = match;
    
    // Find menu item by name (case-insensitive partial match)
    const menuItem = menuItems.find(item => 
      item.name.toLowerCase().includes(menuItemName.toLowerCase()) ||
      menuItemName.toLowerCase().includes(item.name.toLowerCase())
    );
    
    if (menuItem) {
      actions.push({
        type: type as AIAction['type'],
        menuItemId: menuItem.id,
        menuItemName: menuItem.name,
        quantity: quantityStr ? parseInt(quantityStr, 10) : 1,
        notes: notes || undefined,
      });
    }
  }
  
  return actions;
}

function cleanMessageFromActions(content: string): string {
  // Remove action markers from the visible message
  return content.replace(/\[\[ACTION:[^\]]+\]\]/g, '').trim();
}

// Rate limiting configuration
const RATE_LIMIT_REQUESTS = 15; // max requests per window
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute window

// Server-side rate limiting using Deno KV
async function checkRateLimit(sessionId: string): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const kv = await Deno.openKv();
    const key = ['rate_limit', 'restaurant_ai', sessionId];
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
      console.warn(`Rate limit exceeded for session: ${sessionId.substring(0, 20)}..., retry after: ${retryAfter}s`);
      return { allowed: false, remaining: 0 };
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
    console.error('Rate limit check failed:', error);
    return { allowed: true, remaining: -1 };
  }
}

Deno.serve(async (req) => {
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

    // Server-side rate limiting check BEFORE any expensive operations
    const rateLimitResult = await checkRateLimit(validatedData.sessionId);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ 
          error: "Rate limit exceeded",
          message: "Tunggu sebentar ya, jangan terlalu cepat! Coba lagi dalam 1 menit 😊"
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": "60"
          } 
        }
      );
    }

    const { messages, sessionId, tableId, cart } = validatedData;

    console.log("Validated request:", { sessionId, tableId, messageCount: messages.length, cartItems: cart?.length ?? 0 });

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

    // Fetch current orders for this session
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

    // Build menu context with IDs for AI to reference
    const menuContext = menuItems?.map((item: Record<string, unknown>) => ({
      id: item.id,
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

    // Build cart context
    const cartContext = cart?.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      notes: item.notes || 'Tidak ada catatan',
    })) || [];

    // System prompt for restaurant AI with cart manipulation capabilities
    const systemPrompt = `Kamu adalah asisten AI ramah di restoran. Nama kamu adalah "RestoAI".

TUGAS UTAMA:
1. Menyapa tamu dengan hangat
2. Memberikan rekomendasi menu berdasarkan preferensi
3. Menjawab pertanyaan tentang menu (bahan, alergi, porsi)
4. Membantu proses pemesanan via chat
5. BARU: Kamu BISA menambahkan item ke keranjang dan menambahkan catatan alergi/preferensi

MENU TERSEDIA (gunakan nama persis untuk action):
${JSON.stringify(menuContext, null, 2)}

PESANAN TERBARU CUSTOMER INI:
${JSON.stringify(orderContext, null, 2)}

KERANJANG SAAT INI:
${cartContext.length > 0 ? JSON.stringify(cartContext, null, 2) : 'Kosong'}

FITUR MANIPULASI KERANJANG:
Kamu bisa menambahkan item ke keranjang atau menambahkan catatan dengan format khusus di akhir pesan.
Format: [[ACTION:tipe:nama_menu:jumlah:catatan]]

Contoh action:
- Tambah 1 Nasi Goreng: [[ACTION:add_to_cart:Nasi Goreng:1:]]
- Tambah 2 Es Teh dengan catatan: [[ACTION:add_to_cart:Es Teh:2:Gula dikit]]
- Tambah catatan alergi ke item di keranjang: [[ACTION:update_notes:Nasi Goreng:1:Tidak pakai kacang, alergi]]
- Hapus dari keranjang: [[ACTION:remove_from_cart:Nasi Goreng:1:]]

ATURAN PENTING:
- Jawab dalam Bahasa Indonesia dengan santai tapi sopan
- Jika customer setuju dengan rekomendasi dan minta dimasukkan ke keranjang, GUNAKAN ACTION!
- Jika customer bilang alergi/tidak mau bahan tertentu, tambahkan catatan dengan ACTION update_notes
- Konfirmasi dulu sebelum menambahkan ke keranjang kecuali customer sudah jelas minta
- Nama menu di action HARUS sesuai dengan menu yang tersedia
- Respon singkat dan helpful, maksimal 2-3 kalimat
- Jangan pernah buat menu palsu yang tidak ada di daftar
- Jika tidak yakin, jujur saja dan tawarkan untuk panggil waiter
- JANGAN PERNAH MINTA MAAF setelah pesanan berhasil dibuat! Respon dengan profesional dan percaya diri
- Jika customer memilih pembayaran TUNAI, katakan waiter akan menghampiri meja
- Jika customer memilih pembayaran QRIS, katakan untuk menyelesaikan pembayaran digital

CONTOH DIALOG:
User: "Rekomendasiin minuman seger dong"
AI: "Buat seger, Jus Jeruk Segar (Rp25.000) paling mantap! Fresh dan vitamin C tinggi. Mau aku masukin ke keranjang?"

User: "Iya masukin 2"
AI: "Siap! 2 Jus Jeruk Segar sudah aku masukin ke keranjang ya! 🍊 Ada lagi yang mau dipesan? [[ACTION:add_to_cart:Jus Jeruk Segar:2:]]"

User: "Aku alergi kacang, jangan pake kacang ya"
AI: "Noted! Aku tambahin catatan 'tidak pakai kacang' ke pesanan kamu ya, biar koki tau. 👍 [[ACTION:update_notes:Jus Jeruk Segar:2:Tidak pakai kacang - ALERGI]]"

CONTOH RESPON SETELAH PEMBAYARAN:
User: "Pesanan saya sudah dibayar via tunai"
AI: "Baik kak, pesanan sedang kami proses. Waiter kami akan segera menghampiri meja kakak untuk menangani pembayaran tunai. Ditunggu ya! 🙏"

User: "Aku bayar pakai QRIS"
AI: "Sip kak, terima kasih! Pesanan sedang kami siapkan. Silakan tunggu sebentar ya, makanan akan segera diantar ke meja. 🍳"`;

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-10),
    ];

    console.log("Calling AI gateway with", aiMessages.length, "messages");

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
      
      return new Response(
        JSON.stringify({ 
          error: "Service error",
          message: "Waduh, ada masalah teknis nih. Coba lagi ya, atau langsung pilih dari menu! 😊"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const rawMessage = aiData.choices?.[0]?.message?.content || 
      "Maaf, aku lagi loading. Coba tanya lagi ya! 🙏";

    // Parse actions from AI response
    const menuItemsForParsing = menuItems?.map((item: Record<string, unknown>) => ({
      id: item.id as string,
      name: item.name as string,
    })) || [];
    
    const actions = parseAIActions(rawMessage, menuItemsForParsing);
    const cleanMessage = cleanMessageFromActions(rawMessage);

    console.log("AI response:", cleanMessage.substring(0, 100), "Actions:", actions.length);

    return new Response(
      JSON.stringify({ 
        message: cleanMessage,
        actions: actions.length > 0 ? actions : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in restaurant-ai function:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal error",
        message: "Waduh, ada masalah teknis nih. Coba lagi ya, atau langsung pilih dari menu! 😊"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
