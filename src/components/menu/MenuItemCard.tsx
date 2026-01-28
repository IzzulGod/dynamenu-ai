import { MenuItem } from '@/types/restaurant';
import { useCart } from '@/hooks/useCart';
import { motion } from 'framer-motion';
import { Plus, Clock, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface MenuItemCardProps {
  item: MenuItem;
  index?: number;
}

export function MenuItemCard({ item, index = 0 }: MenuItemCardProps) {
  const { addItem } = useCart();

  const handleAddToCart = () => {
    addItem(item);
    toast.success(`${item.name} ditambahkan ke keranjang!`);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="menu-card group"
    >
      {/* Image Container */}
      <div className="relative h-40 overflow-hidden bg-cream-dark">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">
            🍽️
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {item.is_recommended && (
            <Badge className="bg-primary text-primary-foreground text-xs gap-1">
              <Star className="w-3 h-3" />
              Favorit
            </Badge>
          )}
        </div>

        {/* Quick Add Button */}
        <Button
          size="icon"
          onClick={handleAddToCart}
          className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-primary text-primary-foreground opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-strong hover:scale-110"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground line-clamp-1">
            {item.name}
          </h3>
        </div>

        {item.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {item.description}
          </p>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Price and Time */}
        <div className="flex items-center justify-between pt-2">
          <span className="font-bold text-primary text-lg">
            {formatPrice(item.price)}
          </span>
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <Clock className="w-3.5 h-3.5" />
            <span>{item.preparation_time} min</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
