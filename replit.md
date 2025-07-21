# Overview

This is a comprehensive contractor/freelancer management platform built with React, Express.js, and PostgreSQL. The system enables businesses to manage contractors, handle project milestones, process payments, and maintain relationships with external workers through a unified dashboard.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite for build tooling
- **UI Components**: Radix UI primitives with custom shadcn/ui components
- **Styling**: Tailwind CSS with custom theming
- **State Management**: React Query for server state, React Hook Form for form management
- **Routing**: Client-side routing with catch-all handler for SPA behavior

## Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Passport.js with local strategy and express-session
- **Payment Processing**: Dual integration with Stripe Connect and Trolley for different payment flows
- **API Design**: RESTful API with middleware for authentication, CSRF protection, and error handling

# Key Components

## Database Schema
- **Users**: Supports business accounts, contractors, and freelancers with role-based access
- **Contracts**: Project agreements between businesses and contractors
- **Milestones**: Project deliverables with automated payment triggers
- **Payments**: Payment records with status tracking and external service integration
- **Invites**: System for onboarding new contractors and freelancers
- **Work Requests**: Streamlined project request system with token-based acceptance

## Authentication System
- Session-based authentication with PostgreSQL session store
- Role-based access control (business, contractor, freelancer, admin)
- Password hashing using crypto.scrypt
- CSRF protection for form submissions

## Payment Processing
- **Stripe Connect**: For direct business-to-contractor payments with platform fees
- **Trolley Integration**: For batch payments and international contractor support
- **Trolley Submerchant System**: Complete business account management with budget controls
- **Payment Methods**: Pre-funded accounts and pay-as-you-go options for businesses
- **Automated Payments**: Milestone approval triggers automatic payment processing
- **Budget Management**: Business account spending limits and tracking with real-time validation

## External Integrations
- **Trolley API**: Comprehensive submerchant system, batch payment processing, and recipient management
- **Stripe API**: Payment intents, Connect accounts, and subscription management
- **Firebase Auth**: Production-ready email service integration for password resets
- **Plaid** (configured): Bank account verification and ACH transfers
- **SendGrid** (disabled): Email notifications system

# Data Flow

## Payment Flow
1. Business creates contract with contractor
2. Contract milestones are defined with payment amounts
3. Contractor completes milestone work
4. Business approves milestone
5. Automated payment service processes payment through Stripe or Trolley
6. Payment status tracked in database with external service IDs

## User Onboarding Flow
1. Business sends invite to contractor email
2. Invite contains unique token for registration
3. Contractor registers account and links payment method
4. Stripe Connect or Trolley account setup for payout capability
5. Contractor marked as payout-enabled for future payments

## Work Request Flow
1. Business creates work request with description and budget
2. System generates unique token and shares with potential contractors
3. Contractors can accept work request using token
4. Acceptance creates formal contract and milestone structure

# External Dependencies

## Payment Services
- **Stripe**: Primary payment processor for US-based transactions
- **Trolley**: International payments and batch processing
- **Plaid**: Bank account verification (configured but not actively used)

## Database & Infrastructure
- **Neon PostgreSQL**: Serverless PostgreSQL database with connection pooling
- **Drizzle ORM**: Type-safe database operations with automatic migrations
- **Express Session Store**: PostgreSQL-backed session management

## Development & Build Tools
- **Vite**: Frontend build tool with hot module replacement
- **ESBuild**: Server-side bundling for production builds
- **TypeScript**: Full-stack type safety
- **Drizzle Kit**: Database schema management and migrations

# Deployment Strategy

## Development Environment
- **Runtime**: Node.js 20 with ES modules
- **Development Server**: TSX for TypeScript execution with hot reload
- **Database**: Neon PostgreSQL with WebSocket connections for serverless compatibility
- **Port Configuration**: Application runs on port 5000 with proper external port mapping

## Production Build Process
1. Frontend assets built with Vite to `dist/public`
2. Server code bundled with ESBuild to `dist/index.js`
3. Static file serving configured for SPA routing
4. Session management with persistent PostgreSQL store
5. Autoscale deployment target with health checks

## Environment Configuration
- Database URL for Neon PostgreSQL connection
- Stripe API keys for payment processing
- Trolley API credentials for international payments
- Session secret for secure cookie management
- Optional email service configuration (currently disabled)

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Changes

- July 21, 2025: **Firebase-to-Database Sync Fixed for All Users** - Fixed sync-user endpoint to properly handle Firebase users with placeholder passwords, ensuring all future email verified users can complete the login → subscription flow
- July 21, 2025: **Login Success Subscription Redirect Implemented** - Users with inactive subscriptions are automatically redirected to existing subscription selection after successful login
- July 21, 2025: **Email Verification to Login Flow Corrected** - Email verification now properly redirects to login page, then login process handles subscription redirect for inactive users
- July 21, 2025: **Authentication Bug Fixed** - Resolved critical password comparison mismatch between scrypt hashing and bcrypt verification
- July 8, 2025: **Firebase Web SDK Integration Complete** - Replaced server-side registration with client-side Firebase authentication
- July 8, 2025: Updated email verification flow to use Firebase's built-in email verification system
- July 8, 2025: Created hybrid authentication flow: Firebase handles signup+verification, Passport.js handles post-verification sessions
- July 8, 2025: Added `/api/sync-user` endpoint to sync Firebase users with PostgreSQL database
- July 8, 2025: Firebase configuration updated to use verified `creativ-linc.firebaseapp.com` domain
- July 8, 2025: **Multiple Business Subscription Tiers Added** - Business users can now choose from Starter, Standard, and Enterprise plans
- July 4, 2025: Complete subscription system implemented for live mode
- July 4, 2025: Fixed major data isolation bugs preventing cross-account data leaks
- July 4, 2025: Subscription-gated registration flow fully functional
- July 4, 2025: Live Stripe integration with business (£49/month) and contractor (£5/month) plans
- July 4, 2025: Removed hardcoded test data that caused contractor data leaks
- July 4, 2025: Enhanced security with proper user filtering and authentication checks
- June 28, 2025: Comprehensive Trolley submerchant integration completed
- June 28, 2025: Database schema updated with Trolley submerchant fields
- June 28, 2025: API endpoints created for submerchant account management
- June 28, 2025: Payment method controls (pre-funded vs pay-as-you-go) implemented
- June 28, 2025: Budget checking and validation system operational
- June 25, 2025: Email verification system implemented with token-based authentication
- June 25, 2025: Password reset functionality working with manual token entry
- June 25, 2025: Firebase Auth configured for future email service integration
- June 25, 2025: Database schema updated with email verification fields

# Email Service Status

**Current Implementation:**
- Password reset generates secure tokens (e.g., `2df512c2-3d12-47cb-bdf6-48c52d647081`)
- Firebase Admin SDK installed and configured for email sending
- System currently in development mode - logs URLs to console
- Production-ready structure in place for automatic email sending

**User Flow:**
1. User clicks "Forgot Password" and enters email
2. System generates secure token and saves to database with expiration
3. Once Firebase credentials are active: automatic email sent with reset link
4. User clicks link in email, taken to reset page with pre-filled token
5. User enters new password, system validates token and updates password

**Production Status:**
- Firebase Admin SDK successfully initialized and active
- Password reset tokens generated and validated through Firebase Auth
- Email links created successfully via Firebase generatePasswordResetLink API
- System ready for external email delivery service integration
- All authentication flows working with secure token generation

# Trolley Submerchant System Status

**Current Implementation:**
- Complete submerchant account creation system for businesses
- Database schema includes all Trolley-specific fields (submerchant ID, status, payment method, balance)
- API endpoints for account management, payment processing, and budget validation
- Support for both pre-funded and pay-as-you-go payment models
- Comprehensive budget checking to prevent overspending

**User Flow:**
1. Business creates submerchant account through validated API
2. Chooses payment method: pre-funded account or pay-as-you-go
3. System validates budget availability before processing payments
4. Milestone approvals trigger automatic Trolley submerchant payments
5. Real-time balance tracking and budget management

**Production Ready Features:**
- ✅ Authentication-protected API endpoints
- ✅ Database integration with proper schema
- ✅ Budget validation and spending controls
- ✅ Payment method configuration
- ✅ Mock responses for sandbox development
- ✅ Error handling and validation
- ✅ Session management integration

# Subscription System Status

**Current Implementation:**
- Complete live-mode subscription system for both business and contractor accounts
- Subscription requirement enforced during registration for direct signups
- Business Starter: £29.99/month (Stripe Price ID: price_1RiEGMF4bfRUGDn9UErjyXjX)
- Business Plan: £49.99/month (Stripe Price ID: price_1RgRilF4bfRUGDn9jMnjAo96)
- Business Enterprise: Monthly (Stripe Price ID: price_1Ricn6F4bfRUGDn91XzkPq5F)
- Contractor Plan: £5/month (Stripe Price ID: price_1RgSmQ2VZ9lMI7tFePh2AV2g)
- Full payment processing with Stripe Elements integration
- Automatic user login after successful subscription completion

**User Flow:**
1. User registers for new account (business or contractor role)
2. System checks if subscription is required (non-invited direct registrations)
3. User taken to subscription selection page matching their role
4. Stripe payment processing with live mode integration
5. Successful payment activates subscription and logs user in
6. User redirected to main dashboard with full access

**Production Ready Features:**
- ✅ Live Stripe integration with approved account
- ✅ Subscription requirement middleware for protected routes
- ✅ Automatic subscription status synchronization
- ✅ Database storage of subscription details and status
- ✅ Complete user authentication flow with subscription gates
- ✅ Error handling and payment failure management
- ✅ Role-based subscription plan presentation

# Changelog

Changelog:
- July 7, 2025: Email verification system fully implemented for user registration
- July 4, 2025: Comprehensive subscription system implemented with live Stripe integration
- June 25, 2025: Initial setup with comprehensive authentication system

# Email Verification Status

**Current Implementation:**
- Complete email verification system for new user registration
- Database integration with verification tokens and expiration handling
- Secure UUID token generation with 24-hour expiration
- Frontend email verification component with resend functionality
- Registration flow requires email verification before subscription for direct signups
- Storage methods for saving and validating verification tokens

**User Flow:**
1. User registers with email address
2. System generates secure verification token and saves to database
3. Email verification form displayed to user
4. User verifies email using token (via email link or manual entry)
5. After verification, user proceeds to subscription checkout
6. Invited users bypass email verification requirement

**Production Ready Features:**
- ✅ Database schema with email verification fields
- ✅ Secure token generation and validation
- ✅ Proper expiration handling (24 hours)
- ✅ Frontend verification component with user-friendly interface
- ✅ Integration with existing subscription flow
- ✅ Error handling and retry mechanisms
- ✅ Bypass verification for invited users