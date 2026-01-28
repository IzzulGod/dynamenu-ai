import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("AI service not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { messages, sessionId, tableId } = await req.json();

    console.log("Received request:", { sessionId, tableId, messageCount: messages?.length });

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

    // Fetch current cart/orders for this session
    const { data: sessionOrders, error: ordersError } = await supabase
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
    const menuContext = menuItems?.map((item: any) => ({
      name: item.name,
      description: item.description,
      price: `Rp${item.price.toLocaleString('id-ID')}`,
      category: item.menu_categories?.name || 'Lainnya',
      tags: item.tags?.join(', ') || '',
      recommended: item.is_recommended,
      prepTime: `${item.preparation_time} menit`,
    })) || [];

    // Build order context
    const orderContext = sessionOrders?.map((order: any) => ({
      status: order.status,
      total: `Rp${order.total_amount.toLocaleString('id-ID')}`,
      items: order.order_items?.map((oi: any) => 
        `${oi.quantity}x ${oi.menu_items?.name || 'Item'}`
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

    // Prepare messages for AI
    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-10), // Last 10 messages for context
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
            error: "Terlalu banyak permintaan, coba lagi nanti",
            message: "Maaf, aku lagi sibuk banget. Coba lagi beberapa saat ya! 😅" 
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "AI credits habis",
            message: "Maaf, ada kendala teknis. Bisa lihat menu manual dulu ya!" 
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
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
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Waduh, ada masalah teknis nih. Coba lagi ya, atau langsung pilih dari menu! 😊"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
