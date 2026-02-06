# 📚 RestoAI - Dokumentasi Teknis Lengkap

**Versi**: 1.0  
**Terakhir Diperbarui**: Februari 2026  
**Deskripsi**: Sistem pemesanan restoran cerdas dengan AI Assistant berbasis suara dan teks.

---

## 📑 Daftar Isi

1. [Gambaran Umum Sistem](#1-gambaran-umum-sistem)
2. [Arsitektur Sistem](#2-arsitektur-sistem)
3. [Technology Stack](#3-technology-stack)
4. [Struktur Proyek](#4-struktur-proyek)
5. [Database Schema](#5-database-schema)
6. [Alur Aplikasi (Application Flow)](#6-alur-aplikasi-application-flow)
7. [Komponen Frontend](#7-komponen-frontend)
8. [State Management](#8-state-management)
9. [Backend Services (Edge Functions)](#9-backend-services-edge-functions)
10. [Sistem Autentikasi & Keamanan](#10-sistem-autentikasi--keamanan)
11. [Fitur AI & Voice Assistant](#11-fitur-ai--voice-assistant)
12. [Sistem Pembayaran](#12-sistem-pembayaran)
13. [Realtime Subscriptions](#13-realtime-subscriptions)
14. [Testing & Debugging](#14-testing--debugging)
15. [Deployment](#15-deployment)

---

## 1. Gambaran Umum Sistem

### 1.1 Apa itu RestoAI?

RestoAI adalah sistem pemesanan restoran modern yang menggabungkan:
- **AI Chat Assistant**: Pelanggan dapat memesan menggunakan bahasa natural
- **Voice Assistant**: Pemesanan melalui suara dengan STT/TTS
- **QR Code Ordering**: Scan QR di meja untuk akses langsung
- **Realtime Kitchen Dashboard**: Pesanan langsung masuk ke dapur
- **Multi-Payment Support**: QRIS dan Tunai dengan konfirmasi realtime

### 1.2 User Personas

| Persona | Deskripsi | Akses |
|---------|-----------|-------|
| **Customer** | Pelanggan di meja restoran | `/menu?table=N` |
| **Kitchen Staff** | Staf dapur yang memproses pesanan | `/admin/kitchen` |
| **Admin** | Pengelola menu dan sistem | `/admin/menu` |

### 1.3 Fitur Utama

```
┌─────────────────────────────────────────────────────────────────┐
│                        CUSTOMER SIDE                             │
├──────────────────┬──────────────────┬──────────────────┬────────┤
│   QR Ordering    │   AI Chat        │  Voice Assistant │  Cart  │
│   (Scan & Order) │   (Text-based)   │  (Hands-free)    │  Sheet │
├──────────────────┴──────────────────┴──────────────────┴────────┤
│   Order History  │  Payment Dialog  │  Realtime Status Tracking │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        STAFF SIDE                                │
├────────────────────────────┬────────────────────────────────────┤
│    Kitchen Dashboard       │        Menu Management             │
│    (Order Processing)      │        (Admin Only)                │
├────────────────────────────┴────────────────────────────────────┤
│   Realtime Order Updates   │   Payment Confirmation             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Arsitektur Sistem

### 2.1 High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │   Customer   │  │   Kitchen    │  │    Admin     │                  │
│  │   Web App    │  │  Dashboard   │  │  Dashboard   │                  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │
└─────────┼─────────────────┼─────────────────┼──────────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           API LAYER (Supabase)                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      Supabase Client SDK                          │  │
│  │   • REST API (PostgREST)                                          │  │
│  │   • Realtime Subscriptions (WebSocket)                            │  │
│  │   • Edge Functions (Deno)                                         │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER (Supabase)                          │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐            │
│  │   PostgreSQL   │  │   Supabase     │  │   Supabase     │            │
│  │   Database     │  │   Auth         │  │   Storage      │            │
│  └────────────────┘  └────────────────┘  └────────────────┘            │
└────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       EXTERNAL SERVICES                                 │
│  ┌────────────────┐  ┌────────────────┐                                │
│  │  Lovable AI    │  │   ElevenLabs   │                                │
│  │  Gateway       │  │   TTS API      │                                │
│  │  (Gemini)      │  │                │                                │
│  └────────────────┘  └────────────────┘                                │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
CUSTOMER ORDERING FLOW:
=======================

[QR Scan] → [Menu Page] → [Browse Menu] → [Add to Cart]
                              ↓
                        [AI Chat / Voice]
                              ↓
                    [AI Processes Request]
                              ↓
                    [[ACTION:add_to_cart]]
                              ↓
                      [Cart Updated]
                              ↓
                     [Place Order]
                              ↓
                   [Select Payment]
                              ↓
            ┌─────────────────┴─────────────────┐
            ↓                                   ↓
       [QRIS Payment]                    [Cash Payment]
            ↓                                   ↓
       [Auto Verify]                   [Waiter Confirms]
            ↓                                   ↓
            └─────────────────┬─────────────────┘
                              ↓
                    [Order → Kitchen]
                              ↓
                 [Kitchen Processes Order]
                              ↓
        pending → confirmed → preparing → ready → delivered
```

---

## 3. Technology Stack

### 3.1 Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.3.x | UI Framework |
| **TypeScript** | 5.x | Type Safety |
| **Vite** | 5.x | Build Tool & Dev Server |
| **Tailwind CSS** | 3.x | Styling |
| **shadcn/ui** | latest | UI Component Library |
| **Framer Motion** | 12.x | Animations |
| **TanStack Query** | 5.x | Server State Management |
| **Zustand** | 5.x | Client State Management |
| **React Router** | 6.x | Routing |

### 3.2 Backend (Supabase)

| Service | Purpose |
|---------|---------|
| **PostgreSQL** | Primary Database |
| **PostgREST** | Auto-generated REST API |
| **Realtime** | WebSocket Subscriptions |
| **Auth** | Staff Authentication |
| **Edge Functions** | Serverless Functions (Deno) |
| **Storage** | File/Image Storage |

### 3.3 AI & Voice

| Service | Purpose |
|---------|---------|
| **Lovable AI Gateway** | AI Model Access (Gemini) |
| **Web Speech API** | Browser-native STT |
| **ElevenLabs** | Text-to-Speech |

---

## 4. Struktur Proyek

```
project-root/
├── docs/                          # Dokumentasi
│   ├── API.md                     # API Reference
│   ├── DEPLOYMENT.md              # Deployment Guide
│   └── TECHNICAL.md               # Technical Documentation (this file)
│
├── public/                        # Static Assets
│   ├── favicon.ico
│   ├── placeholder.svg
│   └── robots.txt
│
├── src/
│   ├── components/                # React Components
│   │   ├── cart/
│   │   │   └── CartSheet.tsx      # Shopping Cart Drawer
│   │   ├── chat/
│   │   │   └── AIChat.tsx         # AI Chat Interface
│   │   ├── menu/
│   │   │   ├── CategoryTabs.tsx   # Category Navigation
│   │   │   └── MenuItemCard.tsx   # Menu Item Display
│   │   ├── orders/
│   │   │   └── OrderHistory.tsx   # Order Tracking
│   │   ├── payment/
│   │   │   └── PaymentDialog.tsx  # Payment Modal
│   │   ├── ui/                    # shadcn/ui Components
│   │   └── voice/
│   │       ├── VoiceAssistantBubble.tsx  # Floating Voice UI
│   │       └── VoiceAssistantButton.tsx  # Activation Button
│   │
│   ├── hooks/                     # Custom React Hooks
│   │   ├── useCart.ts             # Cart State (Zustand)
│   │   ├── useChat.ts             # AI Chat Logic
│   │   ├── useMenu.ts             # Menu Data Fetching
│   │   ├── useOrders.ts           # Order CRUD Operations
│   │   ├── useTable.ts            # Table Validation
│   │   ├── useTTS.ts              # Text-to-Speech
│   │   ├── useVoiceInput.ts       # Speech-to-Text
│   │   ├── useCancelOrder.ts      # Customer Cancel Order
│   │   ├── useDeleteOrder.ts      # Delete Cancelled Orders
│   │   ├── useKitchenCancelOrder.ts  # Kitchen Cancel Order
│   │   └── useConfirmPayment.ts   # Cash Payment Confirmation
│   │
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts          # Supabase Client (auto-generated)
│   │       └── types.ts           # Database Types (auto-generated)
│   │
│   ├── lib/
│   │   ├── session.ts             # Session ID Management
│   │   └── utils.ts               # Utility Functions
│   │
│   ├── pages/                     # Page Components
│   │   ├── Index.tsx              # Landing Page
│   │   ├── MenuPage.tsx           # Customer Menu Page
│   │   ├── AdminLoginPage.tsx     # Staff Login
│   │   ├── KitchenDashboard.tsx   # Kitchen Order Management
│   │   ├── AdminMenuPage.tsx      # Menu Management
│   │   └── NotFound.tsx           # 404 Page
│   │
│   ├── stores/
│   │   └── voiceAssistantStore.ts # Voice Assistant State
│   │
│   ├── types/
│   │   ├── restaurant.ts          # Domain Types
│   │   └── ai-actions.ts          # AI Action Types
│   │
│   ├── App.tsx                    # Root Component
│   ├── App.css                    # Global Styles
│   ├── index.css                  # Tailwind & CSS Variables
│   └── main.tsx                   # Entry Point
│
├── supabase/
│   ├── config.toml                # Supabase Configuration
│   ├── migrations/                # Database Migrations
│   └── functions/                 # Edge Functions
│       ├── restaurant-ai/
│       │   └── index.ts           # AI Chat Handler
│       ├── elevenlabs-tts/
│       │   └── index.ts           # TTS Proxy
│       └── create-demo-staff/
│           └── index.ts           # Demo Staff Creation
│
├── tailwind.config.ts             # Tailwind Configuration
├── vite.config.ts                 # Vite Configuration
└── tsconfig.json                  # TypeScript Configuration
```

---

## 5. Database Schema

### 5.1 Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  menu_categories│     │   menu_items    │     │     tables      │
│─────────────────│     │─────────────────│     │─────────────────│
│ id (PK)         │◄────│ category_id(FK) │     │ id (PK)         │
│ name            │     │ id (PK)         │     │ table_number    │
│ description     │     │ name            │     │ capacity        │
│ icon            │     │ description     │     │ is_active       │
│ sort_order      │     │ price           │     └────────┬────────┘
│ is_active       │     │ image_url       │              │
└─────────────────┘     │ tags[]          │              │
                        │ is_available    │              │
                        │ is_recommended  │              │
                        │ preparation_time│              │
                        └─────────────────┘              │
                                                         │
┌────────────────────────────────────────────────────────┘
│
│   ┌─────────────────┐     ┌─────────────────┐
│   │     orders      │     │   order_items   │
│   │─────────────────│     │─────────────────│
└──►│ table_id (FK)   │◄────│ order_id (FK)   │
    │ id (PK)         │     │ id (PK)         │
    │ session_id      │     │ menu_item_id(FK)│───► menu_items
    │ status          │     │ quantity        │
    │ payment_status  │     │ unit_price      │
    │ payment_method  │     │ notes           │
    │ total_amount    │     └─────────────────┘
    │ notes           │
    │ created_at      │
    │ updated_at      │
    └─────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  chat_messages  │     │    feedback     │     │ staff_profiles  │
│─────────────────│     │─────────────────│     │─────────────────│
│ id (PK)         │     │ id (PK)         │     │ id (PK)         │
│ session_id      │     │ session_id      │     │ user_id (FK)    │───► auth.users
│ table_id (FK)   │     │ order_id (FK)   │     │ name            │
│ role            │     │ rating          │     │ role            │
│ content         │     │ comment         │     │ is_active       │
│ created_at      │     │ created_at      │     └─────────────────┘
└─────────────────┘     └─────────────────┘
```

### 5.2 Enums

```sql
-- Order Status Progression
CREATE TYPE order_status AS ENUM (
  'pending',    -- Baru dibuat, menunggu pembayaran
  'confirmed',  -- Pembayaran dikonfirmasi
  'preparing',  -- Sedang dimasak
  'ready',      -- Siap diantar
  'delivered',  -- Sudah diantar
  'cancelled'   -- Dibatalkan
);

-- Payment Status
CREATE TYPE payment_status AS ENUM (
  'pending',  -- Menunggu pembayaran
  'paid',     -- Sudah dibayar
  'failed'    -- Gagal
);

-- Payment Method
CREATE TYPE payment_method AS ENUM (
  'qris',  -- Pembayaran digital QRIS
  'cash'   -- Pembayaran tunai
);

-- Staff Role
CREATE TYPE staff_role AS ENUM (
  'admin',   -- Full access
  'kitchen', -- Kitchen dashboard
  'waiter'   -- Order & delivery
);
```

### 5.3 Key Tables Detail

#### orders
```typescript
interface Order {
  id: string;                     // UUID Primary Key
  table_id: string | null;        // FK → tables.id
  session_id: string;             // Customer session identifier
  status: OrderStatus;            // Enum: pending → delivered
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus;
  total_amount: number;
  notes: string | null;           // Special instructions
  created_at: string;
  updated_at: string;
}
```

#### order_items
```typescript
interface OrderItem {
  id: string;                     // UUID Primary Key
  order_id: string;               // FK → orders.id
  menu_item_id: string | null;    // FK → menu_items.id
  quantity: number;
  unit_price: number;             // Price at time of order
  notes: string | null;           // Item-specific notes (allergies, etc.)
}
```

---

## 6. Alur Aplikasi (Application Flow)

### 6.1 Customer Journey

```
┌──────────────────────────────────────────────────────────────────┐
│                    CUSTOMER JOURNEY                               │
└──────────────────────────────────────────────────────────────────┘

1. ENTRY POINT
   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
   │   Scan QR   │ ──► │  Validate   │ ──► │   Load      │
   │   at Table  │     │   Table     │     │   Menu      │
   └─────────────┘     └─────────────┘     └─────────────┘
         │
         ▼
   URL: /menu?table=N

2. BROWSING & ORDERING
   ┌─────────────────────────────────────────────────────────┐
   │                    TAB NAVIGATION                        │
   │  ┌─────────┐    ┌─────────┐    ┌─────────┐              │
   │  │  Menu   │    │ Orders  │    │  Chat   │              │
   │  │  Tab    │    │   Tab   │    │   Tab   │              │
   │  └────┬────┘    └────┬────┘    └────┬────┘              │
   │       │              │              │                    │
   │       ▼              ▼              ▼                    │
   │  ┌─────────┐    ┌─────────┐    ┌─────────┐              │
   │  │ Browse  │    │ View    │    │ AI Chat │              │
   │  │ Items   │    │ History │    │ Orders  │              │
   │  │ Add to  │    │ Track   │    │ Via     │              │
   │  │ Cart    │    │ Status  │    │ Text    │              │
   │  └─────────┘    └─────────┘    └─────────┘              │
   └─────────────────────────────────────────────────────────┘

3. CART & CHECKOUT
   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
   │  Review     │ ──► │   Select    │ ──► │   Submit    │
   │   Cart      │     │   Payment   │     │   Order     │
   └─────────────┘     └─────────────┘     └─────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
              ┌─────────┐         ┌─────────┐
              │  QRIS   │         │  CASH   │
              │ (Auto)  │         │(Waiter) │
              └────┬────┘         └────┬────┘
                   │                   │
                   ▼                   ▼
              ┌─────────┐         ┌─────────┐
              │ Waiting │         │ Waiting │
              │ Payment │         │ Waiter  │
              └────┬────┘         └────┬────┘
                   │                   │
                   └─────────┬─────────┘
                             ▼
                       ┌───────────┐
                       │ Confirmed │
                       │ (Realtime)│
                       └───────────┘

4. ORDER TRACKING
   ┌─────────────────────────────────────────────────────────┐
   │                   ORDER STATUS FLOW                      │
   │                                                          │
   │   pending ──► confirmed ──► preparing ──► ready ──► delivered  │
   │                                                          │
   │   (Customer receives realtime updates via WebSocket)    │
   └─────────────────────────────────────────────────────────┘
```

### 6.2 Kitchen Staff Journey

```
┌──────────────────────────────────────────────────────────────────┐
│                    KITCHEN STAFF JOURNEY                          │
└──────────────────────────────────────────────────────────────────┘

1. AUTHENTICATION
   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
   │   Login     │ ──► │   Verify    │ ──► │   Access    │
   │   Page      │     │   Staff     │     │  Dashboard  │
   │   /admin    │     │   Profile   │     │             │
   └─────────────┘     └─────────────┘     └─────────────┘

2. ORDER MANAGEMENT
   ┌─────────────────────────────────────────────────────────┐
   │                  DASHBOARD TABS                          │
   │  ┌───────────┐  ┌───────────┐  ┌───────────┐            │
   │  │  Pending  │  │ Preparing │  │   Ready   │            │
   │  │  Orders   │  │  Orders   │  │  Orders   │            │
   │  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘            │
   │        │              │              │                   │
   │        ▼              ▼              ▼                   │
   │  ┌───────────┐  ┌───────────┐  ┌───────────┐            │
   │  │ Confirm   │  │  Mark     │  │  Mark     │            │
   │  │ Payment   │  │  Ready    │  │ Delivered │            │
   │  │ + Start   │  │           │  │           │            │
   │  └───────────┘  └───────────┘  └───────────┘            │
   └─────────────────────────────────────────────────────────┘

3. ACTIONS AVAILABLE
   ┌─────────────────────────────────────────────────────────┐
   │  • Confirm Cash Payment                                  │
   │  • Update Order Status (pending → confirmed → etc.)     │
   │  • Cancel/Close Order (with reason)                     │
   │  • View Order Details                                    │
   │  • Realtime Order Updates (auto-refresh)                │
   └─────────────────────────────────────────────────────────┘
```

---

## 7. Komponen Frontend

### 7.1 Page Components

#### `MenuPage.tsx` - Halaman Utama Customer
```typescript
// Flow:
// 1. Read table number from URL (?table=N)
// 2. Validate table exists and is active
// 3. Initialize session and table context
// 4. Render tab navigation: Menu | Orders | Chat
// 5. Floating components: CartSheet, VoiceAssistantBubble

// Key Features:
// - Category-based menu browsing
// - AI Chat integration
// - Order history with realtime updates
// - Voice assistant floating bubble
```

#### `KitchenDashboard.tsx` - Dashboard Dapur
```typescript
// Flow:
// 1. Check authentication (must be logged in)
// 2. Verify staff profile exists and is active
// 3. Fetch all active orders with realtime subscription
// 4. Group orders by table for easier processing
// 5. Provide status update buttons

// Key Features:
// - Realtime order updates
// - Order grouping by table
// - Cash payment confirmation
// - Order cancellation with reason
```

### 7.2 Feature Components

#### `CartSheet.tsx` - Keranjang Belanja
```typescript
// Responsibilities:
// - Display cart items with quantities
// - Update/remove items
// - Calculate totals
// - Submit order
// - Open payment dialog

// State: Uses Zustand store (useCart)
```

#### `PaymentDialog.tsx` - Dialog Pembayaran
```typescript
// Payment Flow States:
type PaymentStep = 'select' | 'cash-waiting' | 'qris-waiting' | 'confirmed';

// Key Features:
// - Persists payment method selection
// - Realtime confirmation from kitchen
// - QRIS countdown timer
// - Cash waiting for waiter confirmation
```

#### `AIChat.tsx` - Chat dengan AI
```typescript
// Features:
// - Message history display
// - Text input for user messages
// - AI responses with typing indicator
// - Action handling (add_to_cart, etc.)
```

#### `VoiceAssistantBubble.tsx` - Voice Assistant
```typescript
// States:
// - isActive: Whether voice mode is on
// - isListening: Recording user speech
// - isSpeaking: AI is speaking response
// - isLoading: Processing request

// Flow:
// 1. User speaks → STT converts to text
// 2. Text sent to AI via useChat
// 3. AI response spoken via TTS
// 4. Loop continues until deactivated
```

---

## 8. State Management

### 8.1 Server State (TanStack Query)

```typescript
// Pattern: Query Keys for caching and invalidation

// Menu Data
['categories']                    // All active categories
['menu-items', categoryId?]       // Menu items by category

// Orders
['orders', sessionId]             // Session-specific orders
['all-orders']                    // All orders (kitchen)

// Chat
['chat-messages', sessionId]      // Chat history

// Tables
['table', tableNumber]            // Table validation
```

### 8.2 Client State (Zustand)

#### `useCart` Store
```typescript
interface CartStore {
  items: CartItem[];
  tableId: string | null;
  tableNumber: number | null;
  
  // Actions
  addItem: (menuItem, quantity?, notes?) => void;
  removeItem: (menuItemId) => void;
  updateQuantity: (menuItemId, quantity) => void;
  updateNotes: (menuItemId, notes) => void;
  clearCart: () => void;
  setTable: (tableId, tableNumber) => void;
  
  // Computed
  getTotalAmount: () => number;
  getTotalItems: () => number;
}

// Persistence: localStorage (restaurant-cart)
```

#### `voiceAssistantStore`
```typescript
interface VoiceAssistantStore {
  isActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isLoading: boolean;
  currentTranscript: string;
  showConfirmDialog: boolean;
  
  // Actions
  activate: () => void;
  deactivate: () => void;
  setListening: (val) => void;
  setSpeaking: (val) => void;
  // ... etc
}
```

### 8.3 Session Management

```typescript
// src/lib/session.ts

// Session ID Format: session_{timestamp}_{uuid}
// Example: session_1706789012345_a1b2c3d4-e5f6-7890-abcd-ef1234567890

// Storage: sessionStorage (per-tab, cleared on close)

function getSessionId(): string {
  // Returns cached session or creates new one
}

function isValidSessionId(id: string): boolean {
  // Validates format for security
}
```

---

## 9. Backend Services (Edge Functions)

### 9.1 `restaurant-ai` - AI Chat Handler

**Endpoint**: `POST /functions/v1/restaurant-ai`

#### Request Flow:
```
1. Validate Request
   ├── Check LOVABLE_API_KEY configured
   ├── Parse and validate JSON body
   ├── Validate sessionId format
   ├── Validate tableId (UUID or null)
   └── Validate messages array

2. Rate Limiting
   ├── Check Deno KV for session rate
   ├── Allow: 15 requests per minute
   └── Return 429 if exceeded

3. Build Context
   ├── Fetch menu items from database
   ├── Fetch recent orders for session
   └── Get current cart state from request

4. Call AI Gateway
   ├── Build system prompt with context
   ├── Send to Lovable AI Gateway (Gemini)
   └── Parse response for actions

5. Response Processing
   ├── Extract [[ACTION:...]] markers
   ├── Clean message text
   └── Return message + actions
```

#### AI Action Format:
```
[[ACTION:type:menuItemName:quantity:notes]]

Types:
- add_to_cart    : Add item to cart
- update_notes   : Add/update item notes
- remove_from_cart: Remove item from cart

Examples:
[[ACTION:add_to_cart:Nasi Goreng:2:Tidak pedas]]
[[ACTION:update_notes:Es Teh:1:Gula dikit]]
[[ACTION:remove_from_cart:Sate Ayam:1:]]
```

### 9.2 `elevenlabs-tts` - Text-to-Speech

**Endpoint**: `POST /functions/v1/elevenlabs-tts`

```typescript
// Request
{
  text: string,
  voice_id?: string  // Default: Indonesian voice
}

// Response: audio/mpeg stream
```

### 9.3 `create-demo-staff` - Demo Staff Creation

**Purpose**: Create demo staff accounts for testing

**Security**: Requires `DEMO_ADMIN_SECRET` environment variable

---

## 10. Sistem Autentikasi & Keamanan

### 10.1 Authentication Model

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION MODEL                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   CUSTOMERS (Anonymous)                                      │
│   ├── No login required                                      │
│   ├── Session ID in sessionStorage                          │
│   ├── Session ID sent via x-session-id header               │
│   └── RLS policies use session_id for isolation             │
│                                                              │
│   STAFF (Authenticated)                                      │
│   ├── Email/password login via Supabase Auth                │
│   ├── JWT token in Authorization header                     │
│   ├── Profile in staff_profiles table                       │
│   └── Role-based access (admin, kitchen, waiter)            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 Row Level Security (RLS)

#### Customer Data Isolation
```sql
-- Pattern: Session-based access
USING (
  session_id = COALESCE(
    (current_setting('request.headers')::json->>'x-session-id'),
    ''
  )
)

-- Applied to:
-- • orders (customers see only their orders)
-- • order_items (via orders relationship)
-- • chat_messages (customers see only their chats)
-- • feedback (customers see only their feedback)
```

#### Staff Access
```sql
-- Pattern: Check staff_profiles table
USING (is_active_staff(auth.uid()))

-- Role-specific:
USING (has_staff_role(auth.uid(), 'admin'))
USING (has_staff_role(auth.uid(), 'kitchen'))
```

### 10.3 Security Functions

```sql
-- Check if user is active staff
CREATE FUNCTION is_active_staff(user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff_profiles
    WHERE user_id = user_uuid AND is_active = true
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check specific role
CREATE FUNCTION has_staff_role(user_uuid UUID, required_role staff_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff_profiles
    WHERE user_id = user_uuid 
      AND role = required_role 
      AND is_active = true
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

---

## 11. Fitur AI & Voice Assistant

### 11.1 AI Chat Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     AI CHAT FLOW                              │
└──────────────────────────────────────────────────────────────┘

User Input                    AI Processing                Output
────────────                  ─────────────                ──────
"Rekomen minuman    ────►    ┌────────────────┐
 seger dong"                 │ System Prompt: │
                             │ • Menu context │
                             │ • Cart context │
                             │ • Order history│
                             │ • Action rules │
                             └───────┬────────┘
                                     │
                                     ▼
                             ┌────────────────┐
                             │  Gemini AI     │
                             │  (via Gateway) │
                             └───────┬────────┘
                                     │
                                     ▼
                             ┌────────────────┐
                             │ Parse Actions  │
                             │ Clean Message  │
                             └───────┬────────┘
                                     │
                             ────────┼────────────────►  "Jus Jeruk
                                     │                    paling seger!
                                     ▼                    Mau aku
                             ┌────────────────┐           masukin?"
                             │ If user says   │
                             │ "iya"          │
                             └───────┬────────┘
                                     │
                                     ▼
                             ┌────────────────┐
                             │[[ACTION:       │  ────►   Cart Updated
                             │ add_to_cart:   │          Toast: "Ditambahkan!"
                             │ Jus Jeruk:1:]] │
                             └────────────────┘
```

### 11.2 Voice Assistant Flow

```
┌──────────────────────────────────────────────────────────────┐
│                   VOICE ASSISTANT LOOP                        │
└──────────────────────────────────────────────────────────────┘

┌─────────────┐
│  ACTIVATE   │
│  (Button)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│  LISTENING  │ ──► │  STT        │
│  (Mic on)   │     │  (Web API)  │
└─────────────┘     └──────┬──────┘
       ▲                   │
       │                   ▼ transcript
       │            ┌─────────────┐
       │            │  PROCESSING │
       │            │  (AI Call)  │
       │            └──────┬──────┘
       │                   │
       │                   ▼ response
       │            ┌─────────────┐
       │            │  SPEAKING   │
       │            │  (TTS)      │
       │            └──────┬──────┘
       │                   │
       │                   ▼
       └───────────────────┘
              (Loop)

States:
• isListening: Microphone recording
• isLoading: Processing request
• isSpeaking: AI voice playing
• currentTranscript: Real-time speech text
```

### 11.3 TTS Integration (ElevenLabs)

```typescript
// useTTS Hook
const { speak, stop, isPlaying, isLoading } = useTTS({ autoPlay: true });

// Flow:
// 1. Call speak(text)
// 2. Edge function calls ElevenLabs API
// 3. Audio stream returned
// 4. Browser plays audio
// 5. isPlaying → true during playback
```

---

## 12. Sistem Pembayaran

### 12.1 Payment Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    PAYMENT FLOW                               │
└──────────────────────────────────────────────────────────────┘

                    ┌───────────────┐
                    │ Place Order   │
                    │ (Cart Submit) │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Payment       │
                    │ Dialog Opens  │
                    └───────┬───────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
      ┌───────────────┐           ┌───────────────┐
      │   QRIS        │           │   CASH        │
      │   Selected    │           │   Selected    │
      └───────┬───────┘           └───────┬───────┘
              │                           │
              ▼                           ▼
      ┌───────────────┐           ┌───────────────┐
      │ DB: payment_  │           │ DB: payment_  │
      │ method: qris  │           │ method: cash  │
      │ status:pending│           │ status:pending│
      └───────┬───────┘           └───────┬───────┘
              │                           │
              ▼                           ▼
      ┌───────────────┐           ┌───────────────┐
      │ Show QR Code  │           │ "Waiting for  │
      │ with Timer    │           │  Waiter"      │
      └───────┬───────┘           └───────┬───────┘
              │                           │
              │ (User scans)              │ (Waiter confirms
              │                           │  in dashboard)
              ▼                           ▼
      ┌───────────────┐           ┌───────────────┐
      │ Auto-verify   │           │ Staff clicks  │
      │ (simulation)  │           │ "Terima       │
      └───────┬───────┘           │  Pembayaran"  │
              │                   └───────┬───────┘
              │                           │
              └─────────────┬─────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ DB: payment_  │
                    │ status: paid  │
                    │ order_status: │
                    │ confirmed     │
                    └───────┬───────┘
                            │
                            ▼ (Realtime)
                    ┌───────────────┐
                    │ Customer sees │
                    │ "Confirmed!"  │
                    │ Toast/Dialog  │
                    └───────────────┘
```

### 12.2 State Persistence

Jika customer menutup dialog dan membuka kembali:
- Sistem mengecek `payment_method` dan `payment_status` di database
- Dialog langsung menampilkan state yang sesuai (tidak reset)
- Contoh: Jika sudah pilih Cash → langsung tampil "Menunggu Waiter"

---

## 13. Realtime Subscriptions

### 13.1 Subscription Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                   REALTIME SUBSCRIPTIONS                      │
└──────────────────────────────────────────────────────────────┘

CUSTOMER SIDE:
─────────────
┌─────────────────────┐
│ OrderHistory        │
│ Component           │
└──────────┬──────────┘
           │ Subscribe to:
           │ orders WHERE session_id = current_session
           ▼
┌─────────────────────┐
│ Supabase Realtime   │
│ Channel: orders     │
│ event: UPDATE/DELETE│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Effects:            │
│ • Update order list │
│ • Show toast if     │
│   cancelled         │
│ • Update status UI  │
└─────────────────────┘

KITCHEN SIDE:
─────────────
┌─────────────────────┐
│ KitchenDashboard    │
│ Component           │
└──────────┬──────────┘
           │ Subscribe to:
           │ orders (all active)
           ▼
┌─────────────────────┐
│ Supabase Realtime   │
│ Channel: orders     │
│ event: * (all)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Effects:            │
│ • Invalidate query  │
│ • Refetch orders    │
│ • Sound notification│
│   (new orders)      │
└─────────────────────┘
```

### 13.2 Implementation Pattern

```typescript
// Kitchen Dashboard - Subscribe to all orders
useEffect(() => {
  const channel = supabase
    .channel('orders-realtime')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders',
      },
      () => {
        queryClient.invalidateQueries({ queryKey: ['all-orders'] });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [queryClient]);
```

### 13.3 Order Cancellation Notification

```typescript
// OrderHistory.tsx - Detect kitchen cancellation
useEffect(() => {
  if (!orders) return;
  
  orders.forEach(order => {
    if (order.status === 'cancelled' && 
        order.notes?.includes('[Dibatalkan:')) {
      // Extract reason and show toast
      const reasonMatch = order.notes.match(/\[Dibatalkan: (.+?)\]/);
      const reason = reasonMatch?.[1] || 'Alasan tidak disebutkan';
      
      toast.error('Pesanan Dibatalkan oleh Dapur', {
        description: reason
      });
    }
  });
}, [orders]);
```

---

## 14. Testing & Debugging

### 14.1 Development Testing

```bash
# Run development server
npm run dev

# Test endpoints:
# - Customer: http://localhost:5173/menu?table=1
# - Kitchen: http://localhost:5173/admin/kitchen
# - Landing: http://localhost:5173/

# Check Supabase logs:
# - Edge function logs in Supabase dashboard
# - Console logs in browser DevTools
```

### 14.2 Key Testing Scenarios

1. **Customer Ordering Flow**
   - Scan QR / access menu page
   - Browse and add items
   - Place order
   - Select payment method
   - Verify order appears in kitchen

2. **AI Chat Testing**
   - Send text messages
   - Test recommendations
   - Test cart manipulation via AI
   - Test allergies/notes

3. **Voice Assistant Testing**
   - Activate voice mode
   - Speak orders
   - Verify TTS response
   - Test deactivation

4. **Kitchen Dashboard**
   - Login as staff
   - See pending orders
   - Update order status
   - Confirm cash payments
   - Cancel orders

5. **Realtime Updates**
   - Open customer and kitchen in separate tabs
   - Place order from customer
   - Verify kitchen sees order
   - Update status in kitchen
   - Verify customer sees update

### 14.3 Debug Helpers

```typescript
// Check session ID
console.log(getSessionId());

// Check cart state
console.log(useCart.getState().items);

// Check order subscription
supabase
  .channel('debug')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, 
      (payload) => console.log('Order change:', payload))
  .subscribe();
```

---

## 15. Deployment

### 15.1 Environment Variables

```env
# Auto-generated by Lovable Cloud
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_PROJECT_ID=xxx

# Edge Function Secrets (set in Supabase)
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
LOVABLE_API_KEY         # For AI Gateway
ELEVENLABS_API_KEY      # For TTS
DEMO_ADMIN_SECRET       # For demo staff creation
```

### 15.2 Deployment Checklist

```
□ Database migrations applied
□ RLS policies verified
□ Edge functions deployed
□ Secrets configured
□ Demo data cleaned (orders, chat, feedback)
□ Staff accounts created
□ Menu items added
□ Tables configured
□ Storage buckets set up (if using images)
```

### 15.3 URLs

```
Preview: https://xxx-preview--project-id.lovable.app
Published: https://your-domain.lovable.app
```

---

## Appendix

### A. TypeScript Interfaces

```typescript
// src/types/restaurant.ts
export interface Table {
  id: string;
  table_number: number;
  is_active: boolean;
  capacity: number;
}

export interface MenuItem {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  tags: string[];
  is_available: boolean;
  is_recommended: boolean;
  preparation_time: number;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

export interface Order {
  id: string;
  table_id: string | null;
  session_id: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  payment_method: 'qris' | 'cash' | null;
  payment_status: 'pending' | 'paid' | 'failed';
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// src/types/ai-actions.ts
export interface AIAction {
  type: 'add_to_cart' | 'update_notes' | 'remove_from_cart';
  menuItemId: string;
  menuItemName?: string;
  quantity?: number;
  notes?: string;
}

export interface AIResponse {
  message: string;
  actions?: AIAction[];
  error?: string;
}
```

### B. Important Hooks Reference

| Hook | Purpose | State Type |
|------|---------|------------|
| `useCart` | Cart management | Zustand |
| `useChat` | AI chat functionality | TanStack Query |
| `useMenu` | Menu data fetching | TanStack Query |
| `useOrders` | Order CRUD | TanStack Query |
| `useTable` | Table validation | TanStack Query |
| `useTTS` | Text-to-Speech | Local state |
| `useVoiceInput` | Speech-to-Text | Local state |

### C. API Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `restaurant-ai` | 15 requests | 1 minute |
| Client-side chat | 2 seconds | Per request |
| ElevenLabs TTS | Per API plan | - |

---

**Dokumentasi ini terakhir diperbarui: Februari 2026**

Untuk pertanyaan atau kontribusi, silakan buka issue di repository.
