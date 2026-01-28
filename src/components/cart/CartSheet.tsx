import { useCart } from '@/hooks/useCart';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Minus, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface CartSheetProps {
  onCheckout: () => void;
}

export function CartSheet({ onCheckout }: CartSheetProps) {
  const { items, getTotalAmount, getTotalItems, updateQuantity, removeItem } = useCart();
  const totalItems = getTotalItems();
  const totalAmount = getTotalAmount();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-strong hover:scale-105 transition-transform z-50"
          size="icon"
        >
          <ShoppingBag className="w-6 h-6" />
          {totalItems > 0 && (
            <Badge className="absolute -top-1 -right-1 w-6 h-6 p-0 flex items-center justify-center bg-sage text-sage-dark">
              {totalItems}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="flex flex-col w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Keranjang Pesanan
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="text-6xl mb-4">🛒</div>
            <p className="text-muted-foreground">Keranjang masih kosong</p>
            <p className="text-sm text-muted-foreground mt-1">
              Yuk pilih menu favoritmu!
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              <AnimatePresence mode="popLayout">
                {items.map((item) => (
                  <motion.div
                    key={item.menuItem.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex gap-4 p-3 rounded-xl bg-secondary/50"
                  >
                    {/* Image */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-cream-dark shrink-0">
                      {item.menuItem.image_url ? (
                        <img
                          src={item.menuItem.image_url}
                          alt={item.menuItem.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">
                          🍽️
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">
                        {item.menuItem.name}
                      </h4>
                      <p className="text-primary font-semibold">
                        {formatPrice(item.menuItem.price)}
                      </p>
                      
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="w-7 h-7"
                          onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="w-7 h-7"
                          onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-7 h-7 text-destructive ml-auto"
                          onClick={() => removeItem(item.menuItem.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <Separator />

            {/* Total and Checkout */}
            <div className="pt-4 space-y-4">
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>Total</span>
                <span className="text-primary">{formatPrice(totalAmount)}</span>
              </div>
              <Button
                className="w-full h-12 text-lg font-semibold"
                onClick={onCheckout}
              >
                Pesan Sekarang
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
