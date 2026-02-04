import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Banknote, QrCode, CheckCircle, Loader2, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useUpdatePayment } from '@/hooks/useOrders';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

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
  const [step, setStep] = useState<'select' | 'qris' | 'cash-waiting' | 'success'>('select');
  const [isProcessing, setIsProcessing] = useState(false);
  const [qrisCountdown, setQrisCountdown] = useState(60);
  const updatePayment = useUpdatePayment();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep('select');
      setIsProcessing(false);
      setQrisCountdown(60);
    }
  }, [open]);

  // QRIS countdown timer
  useEffect(() => {
    if (step !== 'qris') return;
    
    const timer = setInterval(() => {
      setQrisCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          toast.error('Waktu pembayaran QRIS habis');
          setStep('select');
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step]);

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
        setStep('qris');
        setQrisCountdown(60);
      } else {
        setStep('cash-waiting');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Gagal memproses pembayaran');
    } finally {
      setIsProcessing(false);
    }
  };

  // Simulate QRIS payment (for demo/testing)
  const handleSimulateQRIS = async () => {
    setIsProcessing(true);
    try {
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
      }, 2000);
    } catch (error) {
      toast.error('Gagal memproses pembayaran');
    } finally {
      setIsProcessing(false);
    }
  };

  // Simulate cash confirmation by waiter (for demo/testing)
  const handleSimulateCashConfirm = async () => {
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
      }, 2000);
    } catch (error) {
      toast.error('Gagal mengkonfirmasi pembayaran');
    } finally {
      setIsProcessing(false);
    }
  };

  // Customer submits order without waiting (staff will confirm later)
  const handleSubmitCashOrder = async () => {
    setStep('success');
    toast.success('Pesanan dikirim! Waiter akan menghampiri untuk pembayaran.');
    setTimeout(() => {
      onSuccess();
      onOpenChange(false);
    }, 2000);
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
            </motion.div>
          )}

          {step === 'qris' && (
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
                <span>Menunggu pembayaran...</span>
              </div>

              {/* Demo Simulate Button */}
              <div className="pt-4 border-t space-y-2">
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Mode Demo
                </Badge>
                <Button 
                  onClick={handleSimulateQRIS} 
                  disabled={isProcessing}
                  variant="secondary"
                  className="w-full"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Simulasi: Bayar QRIS
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'cash-waiting' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <div className="w-24 h-24 mx-auto bg-amber-50 rounded-full flex items-center justify-center">
                <Banknote className="w-12 h-12 text-amber-600" />
              </div>
              <p className="font-semibold text-lg">Pembayaran Tunai</p>
              <p className="text-muted-foreground">
                Silakan bayar <span className="font-bold text-foreground">{formatPrice(totalAmount)}</span> ke waiter
              </p>
              
              <div className="flex items-center justify-center gap-2 text-amber-600">
                <Clock className="w-4 h-4" />
                <span>Menunggu konfirmasi waiter...</span>
              </div>

              {/* Submit order button - customer confirms they'll pay */}
              <Button 
                onClick={handleSubmitCashOrder} 
                disabled={isProcessing} 
                className="w-full"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Kirim Pesanan
              </Button>
              
              <p className="text-xs text-muted-foreground">
                Pesanan akan diproses setelah waiter mengkonfirmasi pembayaran
              </p>

              {/* Demo Simulate Button */}
              <div className="pt-4 border-t space-y-2">
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Mode Demo
                </Badge>
                <Button 
                  onClick={handleSimulateCashConfirm} 
                  disabled={isProcessing}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Simulasi: Waiter Konfirmasi
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <div className="w-24 h-24 mx-auto bg-green-50 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <p className="font-semibold text-lg text-green-700">
                Pesanan Berhasil!
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
