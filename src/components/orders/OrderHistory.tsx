import { useSessionOrders } from '@/hooks/useOrders';
 import { useCancelOrder } from '@/hooks/useCancelOrder';
 import { useDeleteOrder } from '@/hooks/useDeleteOrder';
import { getSessionId } from '@/lib/session';
import { motion, AnimatePresence } from 'framer-motion';
 import { useState, useEffect, useRef } from 'react';
 import { Clock, CheckCircle, ChefHat, Bell, Package, XCircle, CreditCard, Banknote, QrCode, AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { PaymentDialog } from '@/components/payment/PaymentDialog';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const statusConfig = {
  pending: {
    label: 'Menunggu Konfirmasi',
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  },
  confirmed: {
    label: 'Dikonfirmasi',
    icon: CheckCircle,
    color: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  preparing: {
    label: 'Sedang Dimasak',
    icon: ChefHat,
    color: 'bg-orange-100 text-orange-800 border-orange-300',
  },
  ready: {
    label: 'Siap Diantar',
    icon: Bell,
    color: 'bg-green-100 text-green-800 border-green-300',
  },
  delivered: {
    label: 'Selesai',
    icon: Package,
    color: 'bg-gray-100 text-gray-800 border-gray-300',
  },
  cancelled: {
    label: 'Dibatalkan',
    icon: XCircle,
    color: 'bg-red-100 text-red-800 border-red-300',
  },
};

const paymentStatusConfig = {
  pending: {
    label: 'Belum Bayar',
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'Menunggu konfirmasi pembayaran',
  },
  paid: {
    label: 'Lunas',
    color: 'bg-green-100 text-green-800 border-green-300',
    description: 'Pembayaran telah dikonfirmasi',
  },
  failed: {
    label: 'Gagal',
    color: 'bg-red-100 text-red-800 border-red-300',
    description: 'Pembayaran gagal',
  },
};

// Helper to determine appropriate payment status display
const getPaymentStatusDisplay = (order: { payment_method: string | null; payment_status: string | null }) => {
  if (order.payment_status === 'paid') {
    return { label: 'Lunas', color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle };
  }
  
  if (order.payment_method === 'cash' && order.payment_status === 'pending') {
    return { label: 'Menunggu Konfirmasi', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: Loader2, animate: true };
  }
  
  if (order.payment_method === 'qris' && order.payment_status === 'pending') {
    return { label: 'Menunggu Pembayaran', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Loader2, animate: true };
  }
  
  return { label: 'Belum Bayar', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: null };
};

const paymentMethodConfig = {
  cash: { label: 'Tunai', icon: Banknote },
  qris: { label: 'QRIS', icon: QrCode },
};

export function OrderHistory() {
  const sessionId = getSessionId();
  const { data: orders, isLoading } = useSessionOrders(sessionId);
  const cancelOrder = useCancelOrder();
   const deleteOrder = useDeleteOrder();
  
  const [showPayment, setShowPayment] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrderAmount, setSelectedOrderAmount] = useState(0);

   // Track previous order statuses to detect kitchen cancellations
   const prevOrdersRef = useRef<Map<string, string>>(new Map());
 
   // Listen for orders being cancelled by kitchen
   useEffect(() => {
     if (!orders) return;
 
     const currentStatuses = new Map<string, string>();
     
     orders.forEach(order => {
       const prevStatus = prevOrdersRef.current.get(order.id);
       currentStatuses.set(order.id, order.status);
       
       // If order was not cancelled before but now is cancelled
       // Check if notes contain [Dibatalkan:] which indicates kitchen cancellation
       if (prevStatus && prevStatus !== 'cancelled' && order.status === 'cancelled') {
         if (order.notes?.includes('[Dibatalkan:')) {
           toast.error(
             'Pesanan dibatalkan oleh dapur',
             { 
               description: order.notes?.match(/\[Dibatalkan: (.+?)\]/)?.[1] || 'Ada kesalahan pada pesanan',
               duration: 8000,
             }
           );
         }
       }
     });
 
     prevOrdersRef.current = currentStatuses;
   }, [orders]);
 
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handlePayNow = (orderId: string, amount: number) => {
    setSelectedOrderId(orderId);
    setSelectedOrderAmount(amount);
    setShowPayment(true);
  };

  const handlePaymentSuccess = () => {
    setShowPayment(false);
    setSelectedOrderId(null);
    toast.success('Pembayaran berhasil! Pesanan sedang diproses.');
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await cancelOrder.mutateAsync(orderId);
      toast.success('Pesanan berhasil dibatalkan');
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error('Gagal membatalkan pesanan');
    }
  };

   const handleDeleteOrder = async (orderId: string) => {
     try {
       await deleteOrder.mutateAsync(orderId);
       toast.success('Riwayat pesanan dihapus');
     } catch (error) {
       console.error('Delete error:', error);
       toast.error('Gagal menghapus riwayat');
     }
   };
 
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">📋</div>
        <p className="text-muted-foreground">Belum ada pesanan</p>
        <p className="text-sm text-muted-foreground mt-1">
          Pesanan Anda akan muncul di sini
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {orders.map((order) => {
          const status = statusConfig[order.status];
          const paymentStatus = paymentStatusConfig[order.payment_status];
          const paymentMethod = order.payment_method ? paymentMethodConfig[order.payment_method] : null;
          const StatusIcon = status.icon;
          const PaymentMethodIcon = paymentMethod?.icon || CreditCard;
          
          // Enhanced payment status display
          const paymentDisplay = getPaymentStatusDisplay(order);
          const PaymentStatusIcon = paymentDisplay.icon;

          // User can open payment dialog if:
          // - Not yet paid AND not cancelled/delivered
          // - OR already has a payment method selected (to view status)
          const canOpenPayment = order.status !== 'cancelled' && order.status !== 'delivered';
          const needsPayment = order.payment_status !== 'paid' && !order.payment_method;
          const hasOngoingPayment = order.payment_status === 'pending' && order.payment_method;
          const canCancel = order.status === 'pending' && order.payment_status !== 'paid';
           const canDelete = order.status === 'cancelled';

          return (
            <motion.div
              key={order.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <StatusIcon className="w-4 h-4" />
                      Pesanan #{order.id.slice(-6).toUpperCase()}
                    </CardTitle>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(order.created_at)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {/* Order Status Badge */}
                    <Badge variant="outline" className={status.color}>
                      {status.label}
                    </Badge>
                    
                    {/* Payment Method Badge */}
                    {paymentMethod && (
                      <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                        <PaymentMethodIcon className="w-3 h-3 mr-1" />
                        {paymentMethod.label}
                      </Badge>
                    )}
                    
                    {/* Payment Status Badge */}
                    <Badge variant="outline" className={paymentDisplay.color}>
                      {PaymentStatusIcon && (
                        <PaymentStatusIcon className={`w-3 h-3 mr-1 ${paymentDisplay.animate ? 'animate-spin' : ''}`} />
                      )}
                      {paymentDisplay.label}
                    </Badge>
                  </div>
                  
                  {/* Payment pending info for cash */}
                  {hasOngoingPayment && order.payment_method === 'cash' && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      ⏳ Menunggu konfirmasi pembayaran dari waiter
                    </p>
                  )}
                  {hasOngoingPayment && order.payment_method === 'qris' && (
                    <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                      <QrCode className="w-3 h-3" />
                      📱 Menunggu scan QRIS
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <Separator className="mb-3" />
                  <div className="space-y-2">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>
                          {item.quantity}x {item.menu_items?.name ?? 'Menu dihapus'}
                        </span>
                        <span className="text-muted-foreground">
                          {formatPrice(item.unit_price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-3" />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="text-primary">{formatPrice(order.total_amount)}</span>
                  </div>
                  {order.notes && (
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      Catatan: {order.notes}
                    </p>
                  )}

                  {/* Action Buttons */}
                  {canOpenPayment && (needsPayment || hasOngoingPayment) && (
                    <div className="flex gap-2 pt-4 mt-3 border-t">
                      <Button
                        className="flex-1"
                        variant={hasOngoingPayment ? 'outline' : 'default'}
                        onClick={() => handlePayNow(order.id, order.total_amount || 0)}
                      >
                        {hasOngoingPayment ? (
                          <>
                            <Clock className="w-4 h-4 mr-2" />
                            Lihat Status Pembayaran
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Bayar Sekarang
                          </>
                        )}
                      </Button>
                      
                      {canCancel && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" className="text-destructive hover:text-destructive">
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-destructive" />
                                Batalkan Pesanan?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Pesanan akan dibatalkan dan tidak dapat dikembalikan. Yakin ingin melanjutkan?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Tidak</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleCancelOrder(order.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Ya, Batalkan
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  )}
                   
                   {/* Delete cancelled order button */}
                   {canDelete && (
                     <div className="pt-4 mt-3 border-t">
                       <AlertDialog>
                         <AlertDialogTrigger asChild>
                           <Button variant="outline" className="w-full text-muted-foreground hover:text-destructive">
                             <Trash2 className="w-4 h-4 mr-2" />
                             Hapus dari Riwayat
                           </Button>
                         </AlertDialogTrigger>
                         <AlertDialogContent>
                           <AlertDialogHeader>
                             <AlertDialogTitle>Hapus Riwayat Pesanan?</AlertDialogTitle>
                             <AlertDialogDescription>
                               Riwayat pesanan ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
                             </AlertDialogDescription>
                           </AlertDialogHeader>
                           <AlertDialogFooter>
                             <AlertDialogCancel>Batal</AlertDialogCancel>
                             <AlertDialogAction
                               onClick={() => handleDeleteOrder(order.id)}
                               className="bg-destructive hover:bg-destructive/90"
                             >
                               Hapus
                             </AlertDialogAction>
                           </AlertDialogFooter>
                         </AlertDialogContent>
                       </AlertDialog>
                     </div>
                   )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Payment Dialog */}
      {selectedOrderId && (
        <PaymentDialog
          open={showPayment}
          onOpenChange={setShowPayment}
          orderId={selectedOrderId}
          totalAmount={selectedOrderAmount}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
