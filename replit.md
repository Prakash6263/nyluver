# Nyluver - Luxury Gifting & Florist App

## Overview

Nyluver is a bilingual (Arabic/English) luxury gifting and florist mobile application targeting the Libyan market. It operates with owned fulfillment (central warehouses, internal delivery fleet) and uses WhatsApp-first delivery coordination. The app supports anonymous gifting where recipients never see sender identity.

The project is a full-stack application with an Expo/React Native mobile frontend, an Express.js backend API, a PostgreSQL database with Drizzle ORM, and a server-rendered admin panel. It runs on Replit with the mobile app served via Expo's web export and the backend on port 5000.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Mobile App - Expo/React Native)
- **Framework**: Expo SDK 54 with React Native 0.81, using expo-router for file-based routing
- **Navigation**: Tab-based layout with 5 tabs (Home, Categories, Cart, Orders, Profile) plus stack screens for product detail, checkout, order confirmation, and category browsing
- **State Management**: React Context (`AppContext`) for global state (language, cart, orders, points, onboarding). React Query (`@tanstack/react-query`) for server data fetching
- **Local Storage**: AsyncStorage for persisting user preferences, cart, orders, and points on-device
- **Styling**: StyleSheet-based with a custom color system (`constants/colors.ts`). Uses Inter and Playfair Display Google Fonts for luxury branding
- **Animations**: react-native-reanimated for entrance animations and transitions
- **RTL Support**: Built-in Arabic/English toggle with RTL layout adjustments throughout all screens
- **Platform Handling**: Web-specific inset adjustments (67px top offset for web). Haptic feedback on native only

### Backend (Express.js API Server)
- **Runtime**: Node.js with Express 5, TypeScript compiled via tsx (dev) and esbuild (prod)
- **API Pattern**: RESTful routes registered in `server/routes.ts` with session-based auth
- **Authentication**: Simple email+phone login for app users (no password). Token-based auth via in-memory token store. Admin uses Phone+OTP flow (OTP logged to console in dev). Session management via express-session with MemoryStore
- **Authorization**: Three middleware guards - `adminAuth` (session-based), `customerAuth` (session-based), `appAuth` (token-based for mobile app)
- **Admin Panel**: Server-rendered HTML admin dashboard at `/admin` (`server/admin/index.html`) - single HTML file with inline CSS/JS
- **CORS**: Dynamic origin allowlist based on Replit environment variables, plus localhost for dev

### Database (PostgreSQL + Drizzle ORM)
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` - shared between frontend and backend via path alias `@shared/*`
- **Key Tables**: cities, warehouses, users, products, orders, OTPs, add-ons, occasions, moods, categories
- **Enums**: user_role, order_status (12 states), inventory_mode, payment_method, subscription_freq/status
- **Validation**: drizzle-zod for generating Zod schemas from table definitions
- **Migrations**: Drizzle Kit with `drizzle-kit push` for schema sync (config in `drizzle.config.ts`)
- **Storage Layer**: `server/storage.ts` provides a data access object wrapping all Drizzle queries

### Data Flow
- **Client-side data**: Product catalog fetched via React Query from `/api/products`, `/api/occasions`, `/api/moods`, `/api/add-ons`
- **Mapping functions**: `lib/data.ts` contains `mapApiProduct`, `mapApiOccasion`, `mapApiMood`, `mapApiAddOn`, `mapApiCategory` to transform API responses to frontend types
- **Cart/Orders**: Currently managed client-side in AppContext with AsyncStorage persistence. Order placement creates local order objects with crypto-generated UUIDs
- **Currency**: Supports LYD (Libyan Dinar) with FX rate to USD stored per city

### Build & Deployment
- **Dev mode**: Two processes - `expo:dev` for mobile/web frontend, `server:dev` for API backend
- **Production**: Static web export via custom `scripts/build.js`, server bundled with esbuild to `server_dist/`
- **Proxy**: In dev, Expo packager proxy configured through Replit environment variables
- **Port**: Server runs on port 5000

### Key Business Rules
- Exact-match photo guarantee (no substitutions)
- No refunds policy (replacement/escalation only)
- Anonymous gifting (recipient never sees sender)
- Delivery slots with capacity tracking (morning/afternoon/evening)
- Express delivery option with surcharge
- Loyalty points system
- Order status pipeline: pending_payment → paid → awaiting_recipient → accepted → in_prep → ready → out_for_delivery → delivered

## External Dependencies

- **Database**: PostgreSQL via `DATABASE_URL` environment variable
- **Session Store**: MemoryStore (in-memory, suitable for single-instance deployment)
- **Image Hosting**: Product images currently reference Unsplash URLs (placeholder); designed for S3-compatible storage
- **Fonts**: Google Fonts (Inter, Playfair Display) loaded via expo-google-fonts
- **Payment**: Designed for bank card gateway + PayPal (payment method enum exists, integration pending)
- **WhatsApp Cloud API**: Meta WhatsApp Business API (`server/whatsapp.ts`) for OTP delivery, order confirmations, gift notifications, and status updates. Uses Graph API v21.0 with env vars WHATSAPP_PHONE_ID, WHATSAPP_BUSINESS_ID, WHATSAPP_ACCESS_TOKEN
- **Delivery Coordination**: WhatsApp-based (operational workflow, not API-integrated)
- **Environment Variables Required**:
  - `DATABASE_URL` - PostgreSQL connection string
  - `SESSION_SECRET` - Express session secret (has fallback default)
  - `REPLIT_DEV_DOMAIN` / `REPLIT_DOMAINS` - Set automatically by Replit for CORS
  - `EXPO_PUBLIC_DOMAIN` - API domain for mobile app to connect to backend