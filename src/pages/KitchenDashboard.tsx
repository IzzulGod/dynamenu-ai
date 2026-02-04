import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChefHat, Clock, CheckCircle, Truck, LogOut, 
  RefreshCw, Bell, Coffee, Loader2, ShieldAlert, UtensilsCrossed,
  Banknote, QrCode, CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAllOrders, useUpdateOrderStatus } from '@/hooks/useOrders';
import { useConfirmCashPayment } from '@/hooks/useConfirmPayment';
import { OrderWithItems } from '@/types/restaurant';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const statusConfig = {
  pending: { label: 'Menunggu', icon: Clock, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  confirmed: { label: 'Dikonfirmasi', icon: CheckCircle, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  preparing: { label: 'Dimasak', icon: Coffee, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  ready: { label: 'Siap', icon: Bell, color: 'bg-green-100 text-green-700 border-green-200' },
  delivered: { label: 'Diantar', icon: Truck, color: 'bg-gray-100 text-gray-700 border-gray-200' },
  cancelled: { label: 'Dibatalkan', icon: Clock, color: 'bg-red-100 text-red-700 border-red-200' },
};

const paymentMethodConfig = {
  cash: { label: 'Tunai', icon: Banknote, color: 'bg-green-50 text-green-700 border-green-200' },
  qris: { label: 'QRIS', icon: QrCode, color: 'bg-blue-50 text-blue-700 border-blue-200' },
};

export default function KitchenDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'pending' | 'preparing' | 'ready'>('pending');
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [staffName, setStaffName] = useState<string>('');
  const [staffRole, setStaffRole] = useState<string>('');
  const { data: allOrders = [], isLoading, refetch } = useAllOrders();
  const updateStatus = useUpdateOrderStatus();
  const confirmPayment = useConfirmCashPayment();

  // Check auth AND staff authorization
  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/admin');
        return;
      }
      
      // Check if user is in staff_profiles and is active
      const { data: profile, error } = await supabase
        .from('staff_profiles')
        .select('id, name, role, is_active')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .single();
      
      if (error || !profile) {
        console.error('Staff access check failed:', error);
        setIsAuthorized(false);
        toast.error('Akses ditolak: Anda bukan staff yang terdaftar');
        return;
      }
      
      // User is authorized staff
      setIsAuthorized(true);
      setStaffName(profile.name);
      setStaffRole(profile.role);
    };
    
    checkAccess();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/admin');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  const getFilteredOrders = (status: string[]) => {
    return allOrders.filter((order) => status.includes(order.status));
  };

  const handleStatusUpdate = async (orderId: string, newStatus: OrderWithItems['status']) => {
    try {
      await updateStatus.mutateAsync({ orderId, status: newStatus });
      toast.success(`Status diupdate: ${statusConfig[newStatus].label}`);
    } catch (error) {
      toast.error('Gagal update status');
    }
  };

  const handleConfirmCashPayment = async (orderId: string) => {
    try {
      await confirmPayment.mutateAsync(orderId);
      toast.success('Pembayaran tunai dikonfirmasi!');
    } catch (error) {
      toast.error('Gagal konfirmasi pembayaran');
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Show unauthorized screen
  if (isAuthorized === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
                <ShieldAlert className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-xl font-bold text-destructive">Akses Ditolak</h2>
              <p className="text-muted-foreground">
                Anda tidak memiliki akses ke dashboard dapur. 
                Hanya staff yang terdaftar yang dapat mengakses halaman ini.
              </p>
              <Button onClick={handleLogout} variant="outline" className="w-full">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading while checking authorization
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const OrderCard = ({ order }: { order: OrderWithItems }) => {
    const status = statusConfig[order.status];
    const StatusIcon = status.icon;
    const paymentMethod = order.payment_method ? paymentMethodConfig[order.payment_method] : null;
    const PaymentIcon = paymentMethod?.icon || CreditCard;
    const isPendingCashPayment = order.payment_method === 'cash' && order.payment_status === 'pending';

    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <Card className={cn("overflow-hidden", isPendingCashPayment && "ring-2 ring-amber-400")}>
          <CardHeader className={cn('py-3', status.color)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusIcon className="w-4 h-4" />
                <CardTitle className="text-base">
                  Meja {order.tables?.table_number || '-'}
                </CardTitle>
              </div>
              <div className="text-sm font-normal">
                {formatTime(order.created_at)}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Payment Method & Status Badges */}
            <div className="flex flex-wrap gap-2">
              {paymentMethod && (
                <Badge variant="outline" className={paymentMethod.color}>
                  <PaymentIcon className="w-3 h-3 mr-1" />
                  {paymentMethod.label}
                </Badge>
              )}
              {order.payment_status === 'pending' && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  Belum Bayar
                </Badge>
              )}
              {order.payment_status === 'paid' && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Lunas
                </Badge>
              )}
            </div>

            {/* Pending Cash Payment Alert */}
            {isPendingCashPayment && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2 text-amber-700 font-medium">
                  <Banknote className="w-4 h-4" />
                  Menunggu Pembayaran Tunai
                </div>
                <p className="text-amber-600 text-xs mt-1">
                  Konfirmasi setelah menerima pembayaran dari pelanggan
                </p>
              </div>
            )}

            {/* Order Items */}
            <div className="space-y-2">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex justify-between items-start">
                  <div className="flex-1">
                    <span className="font-medium">
                      {item.quantity}x {item.menu_items?.name || 'Item'}
                    </span>
                    {item.notes && (
                      <p className="text-xs text-muted-foreground">{item.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                📝 {order.notes}
              </div>
            )}

            {/* Total */}
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-bold text-primary">
                {formatPrice(order.total_amount)}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              {/* Confirm Cash Payment Button */}
              {isPendingCashPayment && (
                <Button
                  size="sm"
                  className="w-full bg-amber-500 hover:bg-amber-600"
                  onClick={() => handleConfirmCashPayment(order.id)}
                  disabled={confirmPayment.isPending}
                >
                  {confirmPayment.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Banknote className="w-4 h-4 mr-2" />
                  )}
                  Terima Pembayaran Tunai
                </Button>
              )}

              {/* Order Status Buttons */}
              <div className="flex gap-2">
                {order.status === 'pending' && order.payment_status === 'paid' && (
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleStatusUpdate(order.id, 'confirmed')}
                  >
                    Konfirmasi
                  </Button>
                )}
                {order.status === 'confirmed' && (
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleStatusUpdate(order.id, 'preparing')}
                  >
                    Mulai Masak
                  </Button>
                )}
                {order.status === 'preparing' && (
                  <Button
                    size="sm"
                    className="flex-1 bg-sage hover:bg-sage/90"
                    onClick={() => handleStatusUpdate(order.id, 'ready')}
                  >
                    Siap Antar
                  </Button>
                )}
                {order.status === 'ready' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleStatusUpdate(order.id, 'delivered')}
                  >
                    Sudah Diantar
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const pendingOrders = getFilteredOrders(['pending', 'confirmed']);
  const preparingOrders = getFilteredOrders(['preparing']);
  const readyOrders = getFilteredOrders(['ready']);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ChefHat className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-bold text-foreground">Dashboard Dapur</h1>
                <p className="text-xs text-muted-foreground">
                  {staffName && `👋 ${staffName} • `}{allOrders.length} pesanan aktif
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {staffRole === 'admin' && (
                <Button
                  variant="outline"
                  onClick={() => navigate('/admin/menu')}
                >
                  <UtensilsCrossed className="w-4 h-4 mr-2" />
                  Kelola Menu
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="container py-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="w-4 h-4" />
              Baru
              {pendingOrders.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {pendingOrders.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="preparing" className="gap-2">
              <Coffee className="w-4 h-4" />
              Dimasak
              {preparingOrders.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {preparingOrders.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="ready" className="gap-2">
              <Bell className="w-4 h-4" />
              Siap
              {readyOrders.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {readyOrders.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : pendingOrders.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">😴</div>
                <p className="text-muted-foreground">Tidak ada pesanan baru</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {pendingOrders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          <TabsContent value="preparing">
            {preparingOrders.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">👨‍🍳</div>
                <p className="text-muted-foreground">Tidak ada yang sedang dimasak</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {preparingOrders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          <TabsContent value="ready">
            {readyOrders.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">✅</div>
                <p className="text-muted-foreground">Tidak ada pesanan siap antar</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {readyOrders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
