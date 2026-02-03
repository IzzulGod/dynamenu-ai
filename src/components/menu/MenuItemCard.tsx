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

// Food placeholder images based on keywords
const getFoodPlaceholder = (name: string): string => {
  const lowerName = name.toLowerCase();
  
  // Map common Indonesian food keywords to Unsplash food images
  if (lowerName.includes('nasi goreng') || lowerName.includes('fried rice')) {
    return 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=300&fit=crop';
  }
  if (lowerName.includes('nasi') || lowerName.includes('rice')) {
    return 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400&h=300&fit=crop';
  }
  if (lowerName.includes('mie') || lowerName.includes('noodle') || lowerName.includes('bakmi')) {
    return 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop';
  }
  if (lowerName.includes('ayam') || lowerName.includes('chicken')) {
    return 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop';
  }
  if (lowerName.includes('sate') || lowerName.includes('satay')) {
    return 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop';
  }
  if (lowerName.includes('soto') || lowerName.includes('soup') || lowerName.includes('sup')) {
    return 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop';
  }
  if (lowerName.includes('rendang') || lowerName.includes('beef') || lowerName.includes('sapi')) {
    return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop';
  }
  if (lowerName.includes('seafood') || lowerName.includes('ikan') || lowerName.includes('fish') || lowerName.includes('udang') || lowerName.includes('shrimp')) {
    return 'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=400&h=300&fit=crop';
  }
  if (lowerName.includes('teh') || lowerName.includes('tea')) {
    return 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop';
  }
  if (lowerName.includes('kopi') || lowerName.includes('coffee')) {
    return 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=300&fit=crop';
  }
  if (lowerName.includes('jus') || lowerName.includes('juice') || lowerName.includes('smoothie')) {
    return 'https://images.unsplash.com/photo-1546173159-315724a31696?w=400&h=300&fit=crop';
  }
  if (lowerName.includes('es') || lowerName.includes('ice') || lowerName.includes('minuman')) {
    return 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=300&fit=crop';
  }
  if (lowerName.includes('dessert') || lowerName.includes('kue') || lowerName.includes('cake')) {
    return 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&h=300&fit=crop';
  }
  
  // Default food image
  return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop';
};

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
        <img
          src={item.image_url || getFoodPlaceholder(item.name)}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={(e) => {
            // Fallback to placeholder if image fails to load
            const target = e.target as HTMLImageElement;
            target.src = getFoodPlaceholder(item.name);
          }}
        />
        
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
