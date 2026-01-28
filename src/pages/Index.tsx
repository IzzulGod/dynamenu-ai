import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QrCode, ChefHat, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-sage/20 rounded-full blur-3xl" />
        </div>

        <div className="container relative py-20 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              AI-Powered Restaurant System
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              Pesan Makanan dengan
              <span className="text-gradient"> AI Assistant</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Scan QR, chat dengan AI, dan nikmati hidangan lezat. Pengalaman makan yang lebih cerdas dan menyenangkan.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/menu?table=7">
                <Button size="lg" className="gap-2 h-14 px-8 text-lg">
                  <QrCode className="w-5 h-5" />
                  Demo Meja 7
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/admin">
                <Button size="lg" variant="outline" className="gap-2 h-14 px-8 text-lg">
                  <ChefHat className="w-5 h-5" />
                  Dashboard Admin
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-8"
        >
          {/* Feature 1 */}
          <div className="text-center p-6 rounded-2xl bg-card border border-border">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <QrCode className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Scan & Order</h3>
            <p className="text-muted-foreground">
              Scan QR di meja, langsung akses menu dan pesan tanpa antri
            </p>
          </div>

          {/* Feature 2 */}
          <div className="text-center p-6 rounded-2xl bg-card border border-border">
            <div className="w-16 h-16 mx-auto bg-sage/20 rounded-2xl flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-sage-dark" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">AI Assistant</h3>
            <p className="text-muted-foreground">
              Tanya rekomendasi, alergi, atau preferensi makanan ke AI
            </p>
          </div>

          {/* Feature 3 */}
          <div className="text-center p-6 rounded-2xl bg-card border border-border">
            <div className="w-16 h-16 mx-auto bg-coffee/10 rounded-2xl flex items-center justify-center mb-4">
              <ChefHat className="w-8 h-8 text-coffee" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Real-time Kitchen</h3>
            <p className="text-muted-foreground">
              Pesanan langsung masuk ke dapur, tracking status real-time
            </p>
          </div>
        </motion.div>
      </div>

      {/* Demo Tables */}
      <div className="container py-20 border-t border-border">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Coba Demo Sekarang
          </h2>
          <p className="text-muted-foreground">
            Klik salah satu meja untuk mencoba pengalaman pemesanan
          </p>
        </motion.div>

        <div className="grid grid-cols-4 md:grid-cols-8 gap-4 max-w-3xl mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((tableNum) => (
            <motion.div
              key={tableNum}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: tableNum * 0.05 }}
            >
              <Link to={`/menu?table=${tableNum}`}>
                <div className="aspect-square rounded-xl bg-card border border-border hover:border-primary hover:shadow-glow transition-all duration-300 flex flex-col items-center justify-center cursor-pointer group">
                  <span className="text-2xl mb-1">🪑</span>
                  <span className="text-sm font-medium text-muted-foreground group-hover:text-primary">
                    {tableNum}
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="container py-8 border-t border-border text-center">
        <p className="text-sm text-muted-foreground">
          🍽️ RestoAI - Smart Restaurant Ordering System
        </p>
      </footer>
    </div>
  );
};

export default Index;
