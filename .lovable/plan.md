
# Perbaikan Alur Pembayaran (Cash & QRIS)

## Analisis Masalah

Saat ini ada 2 masalah utama di alur pembayaran:

### 1. Pembayaran Tunai (Cash)
- **Masalah**: Setelah pilih "Tunai" → langsung muncul animasi sukses → pesanan diproses
- **Tapi**: Di tab "Pesanan" tertulis "Belum Bayar" karena `payment_status: 'pending'`
- **Alur sekarang** (PaymentDialog.tsx baris 48-52):
  - Cash → set payment_status = 'pending', lalu langsung tampil "success" animation
  - User harus klik "Konfirmasi Pembayaran" lagi untuk set ke 'paid'

### 2. Pembayaran QRIS
- **Masalah**: QR code tampil sebentar (3 detik) → langsung sukses tanpa konfirmasi real
- **Alur sekarang**: setTimeout 3 detik → otomatis set payment_status = 'paid' → success
- **Untuk real use**: Seharusnya menunggu webhook dari payment gateway

---

## Solusi yang Direkomendasikan

### Opsi A: Alur Demo/Testing (Cocok untuk demo saat ini)

**Cash:**
1. User pilih "Tunai" → Tampil info "Silakan bayar ke waiter"
2. User klik "Konfirmasi Sudah Bayar" → Kirim notifikasi ke kitchen dashboard
3. Staff di dashboard bisa melihat pesanan dengan status "Menunggu Pembayaran Tunai"
4. Staff konfirmasi → pesanan diproses

**QRIS:**
1. User pilih "QRIS" → Tampil QR code (tetap visible sampai timeout/konfirmasi)
2. Tambah tombol "Simulasi Bayar" untuk testing
3. Setelah klik → payment_status = 'paid' → success

### Opsi B: Alur Production-Ready (Untuk real use case)

**Cash:**
1. Order dibuat dengan `payment_status: 'pending'` + flag `payment_method: 'cash'`
2. Staff melihat di dashboard ada indikator "Bayar Tunai"
3. Staff bisa mengklik "Terima Pembayaran" dari dashboard
4. Setelah dikonfirmasi staff → order status berubah ke 'confirmed'

**QRIS:**
1. Buat webhook endpoint yang menerima callback dari payment gateway (seperti Midtrans/Xendit)
2. QR code tetap tampil dengan polling/realtime subscription
3. Ketika webhook menerima konfirmasi pembayaran → update database
4. UI pelanggan otomatis terupdate via realtime subscription

---

## Rencana Implementasi (Opsi A - Demo Mode)

### Langkah 1: Perbaiki PaymentDialog.tsx
- **Cash Flow**: Tampilkan layar "Menunggu Konfirmasi Waiter" setelah user submit, bukan langsung success
- Tambah tombol "Simulasi: Waiter Konfirmasi" untuk testing
- Atau langsung sukses tapi dengan pesan yang jelas bahwa ini mode demo

### Langkah 2: Perbaiki QRIS Flow
- Tambah countdown timer (misal 60 detik)
- QR code tetap visible sampai timeout atau user klik "Sudah Bayar"
- Tambah tombol "Simulasi Bayar" untuk testing demo

### Langkah 3: Tambah Indikator di Kitchen Dashboard
- Tampilkan badge payment method (Cash/QRIS)
- Untuk cash yang belum dibayar, tampilkan tombol "Terima Pembayaran"

### Langkah 4: Update OrderHistory
- Tampilkan status pembayaran dengan warna yang konsisten
- Tambah info waktu kapan dibayar

---

## Detail Teknis

### File yang Diubah:

1. **src/components/payment/PaymentDialog.tsx**
   - Refactor state machine: 'select' → 'qris' → 'waiting' → 'success'
   - Untuk cash: 'select' → 'cash' → (user confirm) → 'success'
   - Tambah countdown untuk QRIS
   - Tambah tombol simulasi untuk demo

2. **src/pages/KitchenDashboard.tsx**
   - Tampilkan badge metode pembayaran
   - Tambah tombol "Konfirmasi Pembayaran Tunai" untuk order dengan payment_method='cash' dan payment_status='pending'

3. **src/hooks/useOrders.ts**
   - Tambah mutation untuk staff konfirmasi pembayaran

4. **src/components/orders/OrderHistory.tsx**
   - Konsistensi tampilan status pembayaran

---

## Catatan untuk Production (Jika Ingin Real QRIS)

Untuk implementasi QRIS real, perlu:

1. **Integrasi Payment Gateway** (Midtrans/Xendit/dll)
   - Daftar merchant account
   - Setup API credentials

2. **Edge Function Webhook**
   - Buat endpoint `/functions/payment-webhook`
   - Verifikasi signature dari payment gateway
   - Update order di database

3. **Generate Real QR Code**
   - Call API payment gateway untuk generate QRIS
   - Tampilkan QR yang valid

4. **Realtime Status Update**
   - Gunakan Supabase Realtime untuk update UI saat payment masuk

Implementasi ini membutuhkan API key dari payment gateway yang harus disediakan user.
