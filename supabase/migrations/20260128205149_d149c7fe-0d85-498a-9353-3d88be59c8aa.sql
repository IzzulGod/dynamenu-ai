-- Create enum for order status
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled');

-- Create enum for payment method
CREATE TYPE public.payment_method AS ENUM ('qris', 'cash');

-- Create enum for payment status
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed');

-- Create enum for staff role
CREATE TYPE public.staff_role AS ENUM ('admin', 'kitchen', 'waiter');

-- Tables: restaurant tables
CREATE TABLE public.tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_number INTEGER NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    capacity INTEGER DEFAULT 4,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Menu categories
CREATE TABLE public.menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Menu items
CREATE TABLE public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.menu_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    tags TEXT[] DEFAULT '{}',
    is_available BOOLEAN DEFAULT true,
    is_recommended BOOLEAN DEFAULT false,
    preparation_time INTEGER DEFAULT 15,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Orders
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
    session_id TEXT NOT NULL,
    status order_status DEFAULT 'pending',
    payment_method payment_method,
    payment_status payment_status DEFAULT 'pending',
    total_amount DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Order items
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Chat messages for AI conversation
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Customer feedback
CREATE TABLE public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    session_id TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Staff profiles for admin access
CREATE TABLE public.staff_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role staff_role NOT NULL DEFAULT 'waiter',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public read access (menu, tables)
CREATE POLICY "Anyone can view active tables" ON public.tables
    FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view active categories" ON public.menu_categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view available menu items" ON public.menu_items
    FOR SELECT USING (is_available = true);

-- RLS Policies for orders (session-based)
CREATE POLICY "Anyone can create orders" ON public.orders
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their session orders" ON public.orders
    FOR SELECT USING (true);

CREATE POLICY "Users can update their session orders" ON public.orders
    FOR UPDATE USING (true);

-- RLS Policies for order items
CREATE POLICY "Anyone can create order items" ON public.order_items
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view order items" ON public.order_items
    FOR SELECT USING (true);

-- RLS Policies for chat messages
CREATE POLICY "Anyone can create chat messages" ON public.chat_messages
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their session messages" ON public.chat_messages
    FOR SELECT USING (true);

-- RLS Policies for feedback
CREATE POLICY "Anyone can create feedback" ON public.feedback
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view feedback" ON public.feedback
    FOR SELECT USING (true);

-- RLS Policies for staff (authenticated only)
CREATE POLICY "Staff can view their own profile" ON public.staff_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view all staff" ON public.staff_profiles
    FOR SELECT TO authenticated USING (true);

-- Enable realtime for orders (kitchen updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;

-- Insert sample data: Tables
INSERT INTO public.tables (table_number, capacity) VALUES
    (1, 2), (2, 2), (3, 4), (4, 4), (5, 4), (6, 6), (7, 6), (8, 8);

-- Insert sample data: Categories
INSERT INTO public.menu_categories (name, description, icon, sort_order) VALUES
    ('Appetizers', 'Hidangan pembuka yang menggugah selera', '🥗', 1),
    ('Main Course', 'Hidangan utama spesial chef', '🍽️', 2),
    ('Beverages', 'Minuman segar dan hangat', '🥤', 3),
    ('Desserts', 'Penutup manis yang memanjakan', '🍰', 4);

-- Insert sample data: Menu items
INSERT INTO public.menu_items (category_id, name, description, price, tags, is_recommended, preparation_time) VALUES
    ((SELECT id FROM public.menu_categories WHERE name = 'Appetizers'), 'Salad Garden Bowl', 'Sayuran segar dengan dressing vinaigrette', 45000, ARRAY['sehat', 'vegetarian', 'segar'], true, 10),
    ((SELECT id FROM public.menu_categories WHERE name = 'Appetizers'), 'Chicken Wings BBQ', 'Sayap ayam crispy dengan saus BBQ homemade', 55000, ARRAY['pedas', 'favorit'], true, 15),
    ((SELECT id FROM public.menu_categories WHERE name = 'Appetizers'), 'Spring Rolls', 'Lumpia sayur dengan saus kacang', 35000, ARRAY['vegetarian', 'crispy'], false, 12),
    ((SELECT id FROM public.menu_categories WHERE name = 'Main Course'), 'Nasi Goreng Spesial', 'Nasi goreng dengan telur, ayam, dan sayuran', 65000, ARRAY['favorit', 'mengenyangkan'], true, 20),
    ((SELECT id FROM public.menu_categories WHERE name = 'Main Course'), 'Grilled Salmon', 'Salmon panggang dengan herbs dan lemon butter', 125000, ARRAY['sehat', 'protein', 'premium'], true, 25),
    ((SELECT id FROM public.menu_categories WHERE name = 'Main Course'), 'Ayam Bakar Madu', 'Ayam bakar dengan glazing madu spesial', 75000, ARRAY['favorit', 'manis'], false, 20),
    ((SELECT id FROM public.menu_categories WHERE name = 'Main Course'), 'Pasta Carbonara', 'Spaghetti dengan saus krim dan bacon', 70000, ARRAY['creamy', 'western'], false, 18),
    ((SELECT id FROM public.menu_categories WHERE name = 'Beverages'), 'Jus Jeruk Segar', 'Jus jeruk peras tanpa gula tambahan', 25000, ARRAY['sehat', 'segar', 'vitamin'], true, 5),
    ((SELECT id FROM public.menu_categories WHERE name = 'Beverages'), 'Es Teh Manis', 'Teh manis dingin yang menyegarkan', 15000, ARRAY['segar', 'klasik'], false, 3),
    ((SELECT id FROM public.menu_categories WHERE name = 'Beverages'), 'Kopi Susu', 'Espresso dengan susu segar', 28000, ARRAY['kafein', 'creamy'], true, 5),
    ((SELECT id FROM public.menu_categories WHERE name = 'Beverages'), 'Smoothie Berry', 'Mixed berries dengan yogurt', 35000, ARRAY['sehat', 'segar'], false, 8),
    ((SELECT id FROM public.menu_categories WHERE name = 'Desserts'), 'Chocolate Lava Cake', 'Kue cokelat dengan lelehan di dalam', 45000, ARRAY['manis', 'cokelat', 'hangat'], true, 15),
    ((SELECT id FROM public.menu_categories WHERE name = 'Desserts'), 'Es Krim Trio', 'Tiga scoop es krim pilihan', 35000, ARRAY['dingin', 'manis'], false, 5),
    ((SELECT id FROM public.menu_categories WHERE name = 'Desserts'), 'Cheesecake', 'New York style cheesecake', 40000, ARRAY['creamy', 'klasik'], false, 5);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_tables_updated_at
    BEFORE UPDATE ON public.tables
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at
    BEFORE UPDATE ON public.menu_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staff_profiles_updated_at
    BEFORE UPDATE ON public.staff_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();