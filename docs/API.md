# 📡 RestoAI - API & Database Reference

## Database Schema

### Tables Overview

```
┌─────────────────┐     ┌─────────────────┐
│  menu_categories│     │   menu_items    │
│─────────────────│     │─────────────────│
│ id (PK)         │◄────│ category_id (FK)│
│ name            │     │ id (PK)         │
│ description     │     │ name            │
│ icon            │     │ description     │
│ sort_order      │     │ price           │
│ is_active       │     │ image_url       │
└─────────────────┘     │ tags[]          │
                        │ is_available    │
                        │ is_recommended  │
                        │ preparation_time│
                        └─────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     tables      │     │     orders      │     │   order_items   │
│─────────────────│     │─────────────────│     │─────────────────│
│ id (PK)         │◄────│ table_id (FK)   │◄────│ order_id (FK)   │
│ table_number    │     │ id (PK)         │     │ id (PK)         │
│ capacity        │     │ session_id      │     │ menu_item_id(FK)│
│ is_active       │     │ status          │     │ quantity        │
└─────────────────┘     │ payment_status  │     │ unit_price      │
                        │ payment_method  │     │ notes           │
                        │ total_amount    │     └─────────────────┘
                        │ notes           │
                        └─────────────────┘

┌─────────────────┐     ┌─────────────────┐
│  chat_messages  │     │  staff_profiles │
│─────────────────│     │─────────────────│
│ id (PK)         │     │ id (PK)         │
│ session_id      │     │ user_id (FK)    │
│ table_id (FK)   │     │ name            │
│ role            │     │ role            │
│ content         │     │ is_active       │
└─────────────────┘     └─────────────────┘
```

---

## Enums

### order_status
```sql
'pending'    -- Pesanan baru dibuat
'confirmed'  -- Dikonfirmasi oleh dapur
'preparing'  -- Sedang dimasak
'ready'      -- Siap diantar
'delivered'  -- Sudah diantar
'cancelled'  -- Dibatalkan
```

### payment_status
```sql
'pending'  -- Menunggu pembayaran
'paid'     -- Sudah dibayar
'failed'   -- Gagal
```

### payment_method
```sql
'qris'  -- Pembayaran QRIS
'cash'  -- Tunai
```

### staff_role
```sql
'admin'   -- Full access
'kitchen' -- Kitchen dashboard access
'waiter'  -- Order & delivery access
```

---

## Row Level Security (RLS) Policies

### Guest Customer Access (Session-based)
Pelanggan menggunakan `x-session-id` header untuk identifikasi:

```sql
-- Orders: Customer hanya bisa lihat/edit pesanan sendiri
USING (session_id = current_setting('request.headers')::json->>'x-session-id')

-- Chat: Customer hanya bisa lihat/kirim chat sendiri
USING (session_id = current_setting('request.headers')::json->>'x-session-id')
```

### Staff Access
Staff harus authenticated dan ada di `staff_profiles`:

```sql
-- Function helper
public.is_active_staff(user_uuid) -- Cek apakah user adalah staff aktif
public.has_staff_role(user_uuid, role) -- Cek role spesifik
```

---

## Edge Functions

### restaurant-ai

**Endpoint**: `POST /functions/v1/restaurant-ai`

**Headers**:
```
Authorization: Bearer <supabase_anon_key>
Content-Type: application/json
x-session-id: <session_id>
```

**Request Body**:
```json
{
  "messages": [
    {"role": "user", "content": "Mau pesan nasi goreng"}
  ],
  "sessionId": "session_xxx",
  "tableId": "uuid-of-table"
}
```

**Response**:
```json
{
  "message": "Baik, satu Nasi Goreng Spesial ya! Ada tambahan lain?"
}
```

**Error Responses**:
- `400` - Invalid input
- `429` - Rate limit exceeded
- `500` - Server error

---

## React Hooks Reference

### useMenu
```typescript
// Get all active categories
const { data: categories } = useCategories();

// Get menu items (optional filter by category)
const { data: items } = useMenuItems(categoryId?: string);
```

### useCart (Zustand Store)
```typescript
const { 
  items,           // CartItem[]
  addItem,         // (menuItem, quantity, notes?) => void
  updateQuantity,  // (itemId, quantity) => void
  removeItem,      // (itemId) => void
  clearCart,       // () => void
  getTotalAmount,  // () => number
  tableId,         // string | null
  setTable,        // (id, number) => void
} = useCart();
```

### useOrders
```typescript
// Create new order
const createOrder = useCreateOrder();
await createOrder.mutateAsync({
  tableId: "uuid",
  sessionId: "session_xxx",
  items: [...],
  totalAmount: 50000
});

// Get orders for session
const { data: orders } = useSessionOrders(sessionId);

// Update order status (staff only)
const updateStatus = useUpdateOrderStatus();
await updateStatus.mutateAsync({ orderId: "uuid", status: "preparing" });
```

### useChat
```typescript
const { 
  messages,     // ChatMessage[]
  sendMessage,  // (content: string) => Promise<string>
  isLoading     // boolean
} = useChat(sessionId, tableId);
```

### useTable
```typescript
// Validate table by number
const { data: table, error } = useTable(tableNumber);
```

---

## Frontend Routes

| Route | Component | Access |
|-------|-----------|--------|
| `/` | Index | Public |
| `/menu?table=N` | MenuPage | Public (dengan nomor meja) |
| `/admin` | AdminLoginPage | Public |
| `/admin/kitchen` | KitchenDashboard | Staff only |

---

## Session Management

### Guest Sessions
- ID format: `session_{timestamp}_{random}`
- Disimpan di `localStorage`
- Digunakan untuk RLS policies
- Dikirim via header `x-session-id`

### Staff Sessions  
- Menggunakan Supabase Auth
- JWT token di Authorization header
- Role dicek via `staff_profiles` table

---

## Realtime Subscriptions

### Kitchen Dashboard
```typescript
// Subscribe ke perubahan orders
const channel = supabase
  .channel('orders')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'orders'
  }, callback)
  .subscribe();
```

---

## Rate Limiting

### AI Chat
- Client-side: 2 detik minimum antar request
- Server-side: Dikelola oleh AI gateway

### Database
- Default Supabase limits apply
- Max 1000 rows per query

---

## Security Headers

### Required Headers untuk API calls
```typescript
{
  'Authorization': 'Bearer ' + supabaseAnonKey,
  'apikey': supabaseAnonKey,
  'x-session-id': sessionId,  // Untuk guest users
  'Content-Type': 'application/json'
}
```

---

*Dokumentasi API untuk RestoAI v1.0*
