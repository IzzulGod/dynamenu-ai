import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, Grid, AlertTriangle, MapPin, ClipboardList } from 'lucide-react';
import { useTable } from '@/hooks/useTable';
import { useCategories, useMenuItems } from '@/hooks/useMenu';
import { useCart } from '@/hooks/useCart';
import { useChat } from '@/hooks/useChat';
import { useCreateOrder } from '@/hooks/useOrders';
import { getSessionId } from '@/lib/session';
import { MenuItemCard } from '@/components/menu/MenuItemCard';
import { CategoryTabs } from '@/components/menu/CategoryTabs';
import { CartSheet } from '@/components/cart/CartSheet';
import { AIChat } from '@/components/chat/AIChat';
import { PaymentDialog } from '@/components/payment/PaymentDialog';
import { OrderHistory } from '@/components/orders/OrderHistory';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function MenuPage() {
  const [searchParams] = useSearchParams();
  const tableNumber = searchParams.get('table') ? parseInt(searchParams.get('table')!) : null;
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'menu' | 'chat' | 'orders'>('menu');
  const [showPayment, setShowPayment] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  
  const sessionId = getSessionId();
  
  const { data: table, isLoading: tableLoading, error: tableError } = useTable(tableNumber);
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: menuItems = [], isLoading: menuLoading } = useMenuItems(selectedCategory ?? undefined);
  
  const { items: cartItems, getTotalAmount, clearCart, setTable, tableId } = useCart();
  const { messages, sendMessage, isLoading: chatLoading, pendingUserMessage } = useChat(sessionId, table?.id ?? null, {
    menuItems,
  });
  
  const createOrder = useCreateOrder();

  // Set table when loaded
  useEffect(() => {
    if (table && (!tableId || tableId !== table.id)) {
      setTable(table.id, table.table_number);
    }
  }, [table, tableId, setTable]);

  // Send initial greeting
  // NOTE: In React 18 dev StrictMode, effects can run twice due to mount->unmount->mount.
  // Use localStorage (per session+table) so the greeting is only sent once across remounts.
  const greetingSentRef = useRef(false);
  useEffect(() => {
    if (!table || chatLoading || messages.length !== 0) return;
    if (greetingSentRef.current) return;

    const storageKey = `restoai:greeting_sent:${sessionId}:${table.id}`;

    try {
      if (localStorage.getItem(storageKey) === '1') {
        greetingSentRef.current = true;
        return;
      }
      localStorage.setItem(storageKey, '1');
    } catch {
      // If storage is blocked, we still rely on the ref (best-effort)
    }

    greetingSentRef.current = true;
    sendMessage(`Halo! Aku baru sampai di meja ${table.table_number}`).catch(console.error);
  }, [table, messages.length, sendMessage, chatLoading, sessionId]);

  const handleCheckout = async () => {
    if (!table || cartItems.length === 0) {
      toast.error('Keranjang masih kosong!');
      return;
    }

    try {
      const order = await createOrder.mutateAsync({
        tableId: table.id,
        sessionId,
        items: cartItems.map((item) => ({
          menuItemId: item.menuItem.id,
          quantity: item.quantity,
          unitPrice: item.menuItem.price,
          notes: item.notes,
        })),
        totalAmount: getTotalAmount(),
      });

      setCurrentOrderId(order.id);
      setShowPayment(true);
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Gagal membuat pesanan');
    }
  };

  const handlePaymentSuccess = () => {
    clearCart();
    setCurrentOrderId(null);
    toast.success('Pesanan dikirim ke dapur! 🍳');
    
    // Send confirmation via chat
    sendMessage('Pesanan saya sudah dibayar, tolong proses ya!').catch(console.error);
  };

  // Error state - invalid table
  if (tableNumber && !tableLoading && !table) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 mx-auto bg-destructive/10 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Meja Tidak Ditemukan</h1>
          <p className="text-muted-foreground mb-6">
            Meja {tableNumber} tidak aktif atau tidak terdaftar. Silakan scan ulang QR code atau hubungi waiter.
          </p>
          <Button onClick={() => window.location.href = '/menu'} variant="outline">
            Coba Lagi
          </Button>
        </motion.div>
      </div>
    );
  }

  // No table specified - show welcome
  if (!tableNumber) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="text-7xl mb-6">🍽️</div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Selamat Datang!</h1>
          <p className="text-muted-foreground mb-6">
            Scan QR code di meja Anda untuk mulai memesan
          </p>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>Cari QR code di meja Anda</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-foreground">🍽️ RestoAI</h1>
              {table && (
                <p className="text-sm text-muted-foreground">Meja {table.table_number}</p>
              )}
            </div>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'menu' | 'chat' | 'orders')}>
              <TabsList className="grid grid-cols-3 w-56">
                <TabsTrigger value="menu" className="gap-1 text-xs px-2">
                  <Grid className="w-3 h-3" />
                  Menu
                </TabsTrigger>
                <TabsTrigger value="orders" className="gap-1 text-xs px-2">
                  <ClipboardList className="w-3 h-3" />
                  Pesanan
                </TabsTrigger>
                <TabsTrigger value="chat" className="gap-1 text-xs px-2">
                  <MessageCircle className="w-3 h-3" />
                  Chat
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Category Tabs - only show on menu tab */}
          {activeTab === 'menu' && !categoriesLoading && (
            <CategoryTabs
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          )}
        </div>
      </header>

      {/* Content */}
      <main className="container py-6 pb-24">
        {activeTab === 'menu' ? (
          <>
            {/* Loading state */}
            {menuLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="rounded-xl overflow-hidden">
                    <Skeleton className="h-40 w-full" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-6 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
              >
                {menuItems.map((item, index) => (
                  <MenuItemCard key={item.id} item={item} index={index} />
                ))}
              </motion.div>
            )}

            {menuItems.length === 0 && !menuLoading && (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">🍽️</div>
                <p className="text-muted-foreground">Tidak ada menu di kategori ini</p>
              </div>
            )}
          </>
        ) : activeTab === 'orders' ? (
          <OrderHistory />
        ) : (
          <div className="h-[calc(100vh-200px)]">
            <AIChat
              messages={messages}
              pendingUserMessage={pendingUserMessage}
              onSendMessage={sendMessage}
              isLoading={chatLoading}
              tableNumber={table?.table_number ?? null}
            />
          </div>
        )}
      </main>

      {/* Cart FAB */}
      <CartSheet onCheckout={handleCheckout} />

      {/* Payment Dialog */}
      {currentOrderId && (
        <PaymentDialog
          open={showPayment}
          onOpenChange={setShowPayment}
          orderId={currentOrderId}
          totalAmount={getTotalAmount()}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
