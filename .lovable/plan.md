

# MAAK — Community Mobility & Parcel Sharing App

## Overview
A mobile app (built as a web app + wrapped with Capacitor for iOS/Android) connecting travelers with parcel senders across Algerian cities. French language, no monetization for MVP.

---

## Phase 1: Foundation & Auth
- **Set up Lovable Cloud** (Supabase) for database, auth, and real-time
- **Phone OTP authentication** via Supabase Auth with Twilio SMS provider
- **User profile creation** after signup: name, phone (verified), optional photo, role preference (Traveler / Parcel Owner / Both)
- **Onboarding flow**: Welcome screens → role selection → phone verification → profile setup

## Phase 2: Core Data & Navigation
- **Database schema**: Users, Trips, ParcelRequests, Deals, Messages, Ratings, Reports tables
- **Bottom tab navigation**: Accueil (Home), Mes Trajets/Colis, Messages, Profil
- **Algerian wilayas/cities** preloaded dropdown list (48 wilayas)
- **Home screen**: Search bar, quick action buttons (Publier un trajet / Envoyer un colis), recent activity feed

## Phase 3: Traveler Flow
- **Create Trip form**: Origin wilaya/city → Destination wilaya/city → Departure date/time → Space available → Accepted parcel categories (documents, small box, fragile, etc.)
- **Browse matching parcel requests** with match scores
- **Accept/decline** parcel requests
- **Trip management**: View active trips, trip history

## Phase 4: Parcel Owner Flow
- **Create Parcel Request form**: Origin → Destination → Date/time window → Category → Size/weight estimate → Optional photo upload → Reward amount (DZD) → Forbidden items checkbox acknowledgment
- **Browse matching trips** with match scores
- **Send request** to travelers
- **Parcel management**: Active requests, history

## Phase 5: Matching System
- **Scoring algorithm**: Same origin (+40), Same destination (+40), Time compatibility (+15), Category match (+5)
- **"Best matches" results screen** sorted by score
- **Request details page** with traveler/owner info, match breakdown, Accept/Decline buttons

## Phase 6: Deal Lifecycle & Delivery Tracking
- **Deal states**: Proposed → Accepted → Picked Up → Delivered → Cancelled
- **Contact reveal**: Phone number shown only after both parties accept
- **Confirmation system**: Both sides confirm pickup, both sides confirm delivery
- **Active deliveries screen** with timeline/status tracker

## Phase 7: In-App Chat
- **Real-time messaging** per deal (Supabase Realtime)
- **Chat list** showing active conversations
- **Message thread** with text messages and timestamps

## Phase 8: Ratings & Trust
- **Post-delivery rating**: 1-5 stars + optional comment (both sides rate each other)
- **Profile reputation**: Average rating, number of completed deliveries
- **Report/Block system**: Report user with reason, block user

## Phase 9: Profile & Safety
- **Profile page**: Name, photo, verification status, rating, delivery history
- **Legal disclaimer page**: MAAK intermediary role, user responsibilities
- **Forbidden items list** reference page
- **Settings**: Edit profile, notification preferences, logout

## Phase 10: Native App Wrapping
- **Capacitor setup** for iOS and Android builds
- **PWA configuration** as fallback for users who don't install from app stores
- **Mobile-optimized UI**: Lightweight, works on low-end phones and weak internet connections

---

## Design Approach
- Clean, minimal mobile-first UI
- French language throughout
- Algerian-friendly: DZD currency, wilaya-based location system
- Lightweight assets for slow connections
- Bottom navigation pattern familiar to mobile users

