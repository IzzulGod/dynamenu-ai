# 🚀 RestoAI - Panduan Deployment & Konfigurasi

## Daftar Isi
1. [Struktur Proyek](#struktur-proyek)
2. [Deploy via GitHub](#deploy-via-github)
3. [Setup Supabase Sendiri](#setup-supabase-sendiri)
4. [Manajemen Staff](#manajemen-staff)
5. [Konfigurasi Menu & Meja](#konfigurasi-menu--meja)
6. [Menghapus Data Demo](#menghapus-data-demo)
7. [Environment Variables](#environment-variables)
8. [Troubleshooting](#troubleshooting)

---

## Struktur Proyek

```
src/
├── components/          # Komponen UI
│   ├── cart/           # Cart & checkout components
│   ├── chat/           # AI chat components
│   ├── menu/           # Menu display components
│   ├── payment/        # Payment dialog
│   └── ui/             # Shadcn/UI components
├── hooks/              # Custom React hooks
│   ├── useCart.ts      # Cart state management (Zustand)
│   ├── useChat.ts      # AI chat functionality
│   ├── useMenu.ts      # Menu data fetching
│   ├── useOrders.ts    # Order management
│   └── useTable.ts     # Table validation
├── pages/              # Route pages
│   ├── MenuPage.tsx    # Customer menu view
│   ├── KitchenDashboard.tsx  # Kitchen staff view
│   └── AdminLoginPage.tsx    # Staff authentication
├── lib/                # Utilities
│   ├── session.ts      # Guest session management
│   └── utils.ts        # Helper functions
├── types/              # TypeScript definitions
└── integrations/       # Supabase client

supabase/
├── functions/          # Edge Functions
│   └── restaurant-ai/  # AI assistant endpoint
├── migrations/         # Database migrations
└── config.toml         # Supabase configuration
```

---

## Deploy via GitHub

### Langkah 1: Connect ke GitHub
1. Di Lovable editor, klik nama proyek (kiri atas)
2. Pilih **Settings** → **GitHub** tab
3. Klik **Connect project**
4. Authorize Lovable GitHub App
5. Pilih akun/organisasi GitHub
6. Klik **Create Repository**

### Langkah 2: Clone & Deploy Lokal
```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO

# Install dependencies
npm install

# Run locally
npm run dev
```

### Langkah 3: Deploy ke Hosting
Anda bisa deploy ke:
- **Vercel**: `npm i -g vercel && vercel`
- **Netlify**: Connect repo di dashboard Netlify
- **Cloudflare Pages**: Connect repo di dashboard

> **Penting**: Set environment variables di hosting provider!

---

## Setup Supabase Sendiri

### Langkah 1: Buat Project Supabase
1. Buka [supabase.com](https://supabase.com)
2. Klik **New Project**
3. Isi nama, password database, dan region
4. Tunggu project selesai dibuat

### Langkah 2: Import Database Schema
1. Buka **SQL Editor** di Supabase Dashboard
2. Copy isi file dari `supabase/migrations/` secara berurutan
3. Jalankan setiap file migration

Atau gunakan Supabase CLI:
```bash
# Install CLI
npm install -g supabase

# Login
supabase login

# Link ke project
supabase link --project-ref YOUR_PROJECT_ID

# Push migrations
supabase db push
```

### Langkah 3: Deploy Edge Functions
```bash
# Deploy semua functions
supabase functions deploy restaurant-ai
```

### Langkah 4: Update Environment Variables
Buat file `.env` di root project:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
VITE_SUPABASE_PROJECT_ID=YOUR_PROJECT_ID
```

### Langkah 5: Update Supabase Client
Edit `src/integrations/supabase/client.ts` dengan URL dan key baru Anda.

---

## Manajemen Staff

### Membuat Akun Staff Pertama

**PENTING**: Registrasi publik dinonaktifkan untuk keamanan. Staff harus dibuat via database.

#### Langkah 1: Buat User di Supabase Auth
1. Buka Supabase Dashboard → **Authentication** → **Users**
2. Klik **Add user** → **Create new user**
3. Isi email dan password
4. Klik **Create user**
5. Catat `User UID` yang dihasilkan

#### Langkah 2: Tambahkan ke Staff Profiles
Buka **SQL Editor** dan jalankan:
```sql
INSERT INTO public.staff_profiles (user_id, name, role, is_active)
VALUES (
  'USER_UID_DARI_LANGKAH_1',  -- Ganti dengan UID user
  'Nama Staff',               -- Nama tampilan
  'admin',                    -- Role: admin, kitchen, atau waiter
  true                        -- Aktif
);
```

### Contoh Membuat Beberapa Staff
```sql
-- Admin utama
INSERT INTO public.staff_profiles (user_id, name, role) 
VALUES ('uid-admin', 'Admin Restoran', 'admin');

-- Staff dapur
INSERT INTO public.staff_profiles (user_id, name, role) 
VALUES ('uid-kitchen', 'Chef Budi', 'kitchen');

-- Waiter
INSERT INTO public.staff_profiles (user_id, name, role) 
VALUES ('uid-waiter', 'Siti Pelayan', 'waiter');
```

### Role & Akses
| Role | Akses |
|------|-------|
| `admin` | Semua akses, termasuk manajemen staff |
| `kitchen` | Kitchen Dashboard, update status pesanan |
| `waiter` | Lihat pesanan, update status delivery |

### Login Staff
URL: `/admin` atau `/admin/login`
- Email: Email yang didaftarkan di Auth
- Password: Password yang diset saat create user

---

## Konfigurasi Menu & Meja

### Mengelola Kategori Menu
```sql
-- Lihat kategori
SELECT * FROM menu_categories;

-- Tambah kategori baru
INSERT INTO menu_categories (name, description, icon, sort_order) 
VALUES ('Seafood', 'Hidangan laut segar', '🦐', 5);

-- Update kategori
UPDATE menu_categories SET name = 'Nama Baru' WHERE id = 'uuid';

-- Nonaktifkan kategori
UPDATE menu_categories SET is_active = false WHERE id = 'uuid';
```

### Mengelola Menu Items
```sql
-- Lihat semua menu
SELECT * FROM menu_items;

-- Tambah menu baru
INSERT INTO menu_items (
  category_id, name, description, price, 
  tags, is_available, is_recommended, preparation_time
) VALUES (
  'category-uuid',
  'Sate Ayam',
  '10 tusuk sate dengan bumbu kacang',
  45000,
  ARRAY['favorit', 'pedas'],
  true,
  true,
  15
);

-- Update harga
UPDATE menu_items SET price = 50000 WHERE name = 'Sate Ayam';

-- Set tidak tersedia
UPDATE menu_items SET is_available = false WHERE id = 'uuid';
```

### Mengelola Meja
```sql
-- Lihat semua meja
SELECT * FROM tables ORDER BY table_number;

-- Tambah meja baru
INSERT INTO tables (table_number, capacity, is_active) 
VALUES (10, 4, true);

-- Nonaktifkan meja
UPDATE tables SET is_active = false WHERE table_number = 5;
```

### Generate QR Code untuk Meja
URL untuk QR Code setiap meja:
```
https://YOUR_DOMAIN/menu?table=NOMOR_MEJA
```

Contoh:
- Meja 1: `https://dynamenu-ai.lovable.app/menu?table=1`
- Meja 7: `https://dynamenu-ai.lovable.app/menu?table=7`

---

## Menghapus Data Demo

### Hapus Semua Data Demo
```sql
-- Hapus chat messages
DELETE FROM chat_messages;

-- Hapus order items
DELETE FROM order_items;

-- Hapus orders
DELETE FROM orders;

-- Hapus feedback
DELETE FROM feedback;

-- Opsional: Hapus menu items demo
DELETE FROM menu_items;

-- Opsional: Hapus kategori demo
DELETE FROM menu_categories;

-- Reset meja (hapus lalu buat ulang)
DELETE FROM tables;
INSERT INTO tables (table_number, capacity) VALUES 
  (1, 2), (2, 2), (3, 4), (4, 4), (5, 6), (6, 6), (7, 8), (8, 8);
```

### Script Reset Lengkap
```sql
-- HATI-HATI: Ini akan menghapus SEMUA data!
TRUNCATE chat_messages, order_items, orders, feedback CASCADE;

-- Reset session pelanggan (jika perlu)
-- Pelanggan yang refresh akan mendapat session baru
```

---

## Environment Variables

### Frontend (.env)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

### Edge Functions (Supabase Secrets)
Di Supabase Dashboard → **Settings** → **Edge Functions** → **Secrets**:

| Name | Keterangan |
|------|------------|
| `SUPABASE_URL` | Auto-set oleh Supabase |
| `SUPABASE_ANON_KEY` | Auto-set oleh Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-set oleh Supabase |

### Tambah Secret untuk AI (jika pakai API sendiri)
Jika ingin menggunakan OpenAI atau AI provider lain:
1. Supabase Dashboard → **Settings** → **Edge Functions**
2. Klik **Add new secret**
3. Name: `OPENAI_API_KEY`
4. Value: `sk-your-api-key`

---

## Troubleshooting

### Error: "Meja Tidak Ditemukan"
- Pastikan meja ada di database dengan `is_active = true`
- Cek URL: `/menu?table=NOMOR` (bukan ID)

### Error: "Unauthorized" di Kitchen Dashboard
- Pastikan user sudah login
- Pastikan user ada di tabel `staff_profiles`
- Pastikan `is_active = true` di staff profile

### AI Chat Tidak Merespons
- Cek Edge Function logs di Supabase Dashboard
- Pastikan function `restaurant-ai` ter-deploy
- Cek rate limiting (tunggu beberapa detik)

### Pesanan Tidak Muncul di Kitchen
- Pastikan pesanan sudah dibayar (payment_status = 'paid')
- Refresh halaman Kitchen Dashboard
- Cek koneksi realtime Supabase

### Session Customer Reset Terus
- Session disimpan di localStorage browser
- Private browsing tidak menyimpan session
- Cookie/localStorage harus diizinkan

---

## Kontak & Support

Untuk bantuan lebih lanjut:
- Dokumentasi Supabase: [supabase.com/docs](https://supabase.com/docs)
- Dokumentasi Lovable: [docs.lovable.dev](https://docs.lovable.dev)

---

*Dokumentasi ini dibuat untuk RestoAI - Restaurant AI Ordering System*
