import { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Banknote, QrCode, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useUpdatePayment } from '@/hooks/useOrders';
import { toast } from 'sonner';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  totalAmount: number;
  onSuccess: () => void;
}

export function PaymentDialog({
  open,
  onOpenChange,
  orderId,
  totalAmount,
  onSuccess,
}: PaymentDialogProps) {
  const [step, setStep] = useState<'select' | 'qris' | 'cash' | 'success'>('select');
  const [isProcessing, setIsProcessing] = useState(false);
  const updatePayment = useUpdatePayment();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handlePayment = async (method: 'qris' | 'cash') => {
    if (method === 'cash') {
      // Cash: show instruction screen, don't mark as paid yet
      setStep('cash');
      return;
    }

    // QRIS flow
    setIsProcessing(true);
    try {
      setStep('qris');
      // Simulate QRIS payment delay
      await new Promise((resolve) => setTimeout(resolve, 3000));

      await updatePayment.mutateAsync({
        orderId,
        paymentMethod: 'qris',
        paymentStatus: 'paid',
      });

      setStep('success');
      toast.success('Pembayaran QRIS berhasil!');
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
        setStep('select');
      }, 2000);
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Gagal memproses pembayaran');
      setStep('select');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCashConfirm = async () => {
    setIsProcessing(true);
    try {
      await updatePayment.mutateAsync({
        orderId,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      });
      setStep('success');
      toast.success('Pembayaran tunai dikonfirmasi!');
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
        setStep('select');
      }, 2000);
    } catch (error) {
      toast.error('Gagal mengkonfirmasi pembayaran');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                  onClick={() => handlePayment('qris')}
                  disabled={isProcessing}
                >
                  <QrCode className="w-8 h-8 text-primary" />
                  <span>QRIS</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => handlePayment('cash')}
                  disabled={isProcessing}
                >
                  <Banknote className="w-8 h-8 text-sage" />
                  <span>Tunai</span>
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'qris' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <div className="w-48 h-48 mx-auto bg-white p-4 rounded-xl border">
                {/* Mock QRIS */}
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-sage/20 rounded-lg flex items-center justify-center">
                  <QrCode className="w-24 h-24 text-foreground" />
                </div>
              </div>
              <p className="text-muted-foreground">Scan QRIS untuk membayar</p>
              <div className="flex items-center justify-center gap-2 text-primary">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menunggu pembayaran...</span>
              </div>
            </motion.div>
          )}

          {step === 'cash' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <div className="w-24 h-24 mx-auto bg-sage-light rounded-full flex items-center justify-center">
                <Banknote className="w-12 h-12 text-sage-dark" />
              </div>
              <p className="font-semibold text-lg">Pembayaran Tunai</p>
              <p className="text-muted-foreground">
                Silakan bayar {formatPrice(totalAmount)} ke waiter.
              </p>
              <p className="text-sm text-muted-foreground">
                Tekan tombol di bawah <strong>setelah waiter konfirmasi</strong> pembayaran kamu.
              </p>
              <Button onClick={handleCashConfirm} disabled={isProcessing} className="w-full">
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Waiter Sudah Konfirmasi
              </Button>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <div className="w-24 h-24 mx-auto bg-sage-light rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-sage" />
              </div>
              <p className="font-semibold text-lg text-sage-dark">
                Pembayaran Berhasil!
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
