import { useSessionOrders } from '@/hooks/useOrders';
import { getSessionId } from '@/lib/session';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle, ChefHat, Bell, Package, XCircle, CreditCard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

const statusConfig = {
  pending: {
    label: 'Menunggu Pembayaran',
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
    color: 'bg-yellow-100 text-yellow-800',
  },
  paid: {
    label: 'Sudah Bayar',
    color: 'bg-green-100 text-green-800',
  },
  failed: {
    label: 'Gagal',
    color: 'bg-red-100 text-red-800',
  },
};

export function OrderHistory() {
  const sessionId = getSessionId();
  const { data: orders, isLoading } = useSessionOrders(sessionId);

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
          const StatusIcon = status.icon;

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
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className={status.color}>
                      {status.label}
                    </Badge>
                    <Badge variant="outline" className={paymentStatus.color}>
                      <CreditCard className="w-3 h-3 mr-1" />
                      {paymentStatus.label}
                    </Badge>
                  </div>
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
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
