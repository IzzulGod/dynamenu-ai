import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Banknote, QrCode, CheckCircle, Loader2, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useUpdatePayment, useSessionOrders } from '@/hooks/useOrders';
import { getSessionId } from '@/lib/session';
import { toast } from 'sonner';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  totalAmount: number;
  onSuccess: () => void;
}

type PaymentStep = 'select' | 'cash-waiting' | 'qris-waiting' | 'confirmed';

export function PaymentDialog({
  open,
  onOpenChange,
  orderId,
  totalAmount,
  onSuccess,
}: PaymentDialogProps) {
  const [step, setStep] = useState<PaymentStep>('select');
  const [isProcessing, setIsProcessing] = useState(false);
  const [qrisCountdown, setQrisCountdown] = useState(60);
  const updatePayment = useUpdatePayment();
  
  // Get order data to check existing payment method
  const sessionId = getSessionId();
  const { data: orders } = useSessionOrders(sessionId);
  
  // Find the current order
  const currentOrder = useMemo(() => {
    return orders?.find(o => o.id === orderId);
  }, [orders, orderId]);

  // Determine the correct step based on order's existing payment state
  useEffect(() => {
    if (!open) return;
    
    // Reset processing state
    setIsProcessing(false);
    
    if (currentOrder) {
      // If payment is already confirmed, show confirmation step
      if (currentOrder.payment_status === 'paid') {
        setStep('confirmed');
        return;
      }
      
      // If payment method is already selected, show the appropriate waiting step
      if (currentOrder.payment_method === 'cash' && currentOrder.payment_status === 'pending') {
        setStep('cash-waiting');
        return;
      }
      
      if (currentOrder.payment_method === 'qris' && currentOrder.payment_status === 'pending') {
        setStep('qris-waiting');
        setQrisCountdown(60); // Reset countdown only for QRIS
        return;
      }
    }
    
    // Default to selection step if no payment method selected
    setStep('select');
  }, [open, currentOrder]);

  // QRIS countdown timer
  useEffect(() => {
    if (step !== 'qris-waiting') return;
    
    const timer = setInterval(() => {
      setQrisCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          toast.error('Waktu pembayaran QRIS habis. Silakan coba lagi.');
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step]);
  
  // Listen for payment confirmation from kitchen side (realtime update)
  useEffect(() => {
    if (currentOrder?.payment_status === 'paid' && step !== 'confirmed') {
      setStep('confirmed');
      toast.success('Pembayaran telah dikonfirmasi!');
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
      }, 2000);
    }
  }, [currentOrder?.payment_status, step, onSuccess, onOpenChange]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleSelectPayment = async (method: 'qris' | 'cash') => {
    setIsProcessing(true);
    
    try {
      // Set payment method to database with pending status
      await updatePayment.mutateAsync({
        orderId,
        paymentMethod: method,
        paymentStatus: 'pending',
      });

      if (method === 'qris') {
        setStep('qris-waiting');
        setQrisCountdown(60);
      } else {
        // For cash, just transition to waiting step - no success animation
        setStep('cash-waiting');
        toast.info('Pesanan terkirim. Menunggu konfirmasi waiter.');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Gagal memproses pembayaran');
    } finally {
      setIsProcessing(false);
    }
  };

  // Close dialog but keep order state (user can reopen later)
  const handleCloseDialog = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleCloseDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pembayaran</DialogTitle>
          <DialogDescription>
            Total: {formatPrice(totalAmount)}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === 'select' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <p className="text-center text-muted-foreground mb-4">
                Pilih metode pembayaran:
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => handleSelectPayment('qris')}
                  disabled={isProcessing}
                >
                  <QrCode className="w-8 h-8 text-primary" />
                  <span>QRIS</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => handleSelectPayment('cash')}
                  disabled={isProcessing}
                >
                  <Banknote className="w-8 h-8 text-sage" />
                  <span>Tunai</span>
                </Button>
              </div>
              {isProcessing && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memproses...</span>
                </div>
              )}
            </motion.div>
          )}

          {step === 'qris-waiting' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <div className="w-48 h-48 mx-auto bg-white p-4 rounded-xl border relative">
                {/* Mock QRIS */}
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-sage/20 rounded-lg flex items-center justify-center">
                  <QrCode className="w-24 h-24 text-foreground" />
                </div>
              </div>
              
              <p className="text-muted-foreground">Scan QRIS untuk membayar</p>
              
              {/* Countdown Timer */}
              <div className="flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className={`font-mono ${qrisCountdown <= 10 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {Math.floor(qrisCountdown / 60)}:{(qrisCountdown % 60).toString().padStart(2, '0')}
                </span>
              </div>

              <div className="flex items-center justify-center gap-2 text-primary">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menunggu verifikasi pembayaran...</span>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Pembayaran akan dikonfirmasi secara otomatis setelah berhasil
              </p>

            </motion.div>
          )}

          {step === 'cash-waiting' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <div className="w-24 h-24 mx-auto bg-amber-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-12 h-12 text-amber-600" />
              </div>
              <p className="font-semibold text-lg text-amber-700">Menunggu Konfirmasi</p>
              <p className="text-muted-foreground">
                Silakan bayar <span className="font-bold text-foreground">{formatPrice(totalAmount)}</span> ke waiter
              </p>
              
              <div className="flex items-center justify-center gap-2 text-amber-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menunggu konfirmasi waiter...</span>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-700">
                  💡 Waiter akan menghampiri meja Anda untuk menerima pembayaran.
                  <br />Pesanan akan diproses setelah pembayaran dikonfirmasi.
                </p>
              </div>
              
              <p className="text-xs text-muted-foreground pt-2">
                Anda dapat menutup dialog ini. Status pembayaran tersimpan.
              </p>
            </motion.div>
          )}

          {step === 'confirmed' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <div className="w-24 h-24 mx-auto bg-green-50 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <p className="font-semibold text-lg text-green-700">
                Pembayaran Dikonfirmasi!
              </p>
              <p className="text-muted-foreground">
                Pesanan sedang diproses ke dapur
              </p>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
