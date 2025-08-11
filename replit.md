# Overview

This is a comprehensive contractor/freelancer management platform built with React, Express.js, and PostgreSQL. It enables businesses to manage contractors, handle project milestones, process payments, and maintain relationships with external workers through a unified dashboard. 

**MAJOR MILESTONE ACHIEVED (August 11, 2025)**: Successfully converted from test/simulation mode to LIVE MONEY TRANSFERS using the user's verified Trolley business account. The platform now processes real money transactions for both pre-funded wallets and pay-as-you-go payments.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite
- **UI Components**: Radix UI primitives with custom shadcn/ui components
- **Styling**: Tailwind CSS with custom theming
- **State Management**: React Query for server state, React Hook Form for form management
- **Routing**: Client-side routing with catch-all handler for SPA behavior

## Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with local strategy and express-session; Hybrid authentication with Firebase Auth fallback
- **Payment Processing**: Dual integration with Stripe Connect and Trolley
- **API Design**: RESTful API with middleware for authentication, CSRF protection, and error handling

## Key Architectural Decisions & Features
- **Database Schema**: Supports users (business, contractor, freelancer roles), contracts, milestones, payments, invites, and work requests with role-based access.
- **Authentication System**: PostgreSQL session-based authentication (primary) with Firebase Auth fallback (secondary). Features session cookie management, email verification requirement, role-based access control, and CSRF protection.
- **Payment Processing**: LIVE TROLLEY INTEGRATION - Real money transfers through user's verified Trolley business account. Supports both pre-funded wallet transfers and pay-as-you-go direct bank debiting. Integrates Stripe Connect for subscription billing and Trolley for all contractor payments with automated milestone-triggered payments.
- **Notification System**: Real-time, event-based notifications for milestone approvals, work submissions, payment completions, and connection acceptances, with user-specific filtering and interactive UI.
- **Deployment Strategy**: Node.js 20 with ES modules, TSX for development, ESBuild for production bundling. Utilizes Neon PostgreSQL for the database and static file serving for SPA routing.
- **Subscription System**: Live-mode subscription system for both business and contractor accounts, enforcing subscription requirements during registration for direct signups with role-based plan presentation.

# External Dependencies

## Payment Services
- **Stripe**: Subscription billing and payment processing for platform fees.
- **Trolley**: LIVE PRODUCTION MODE - Real money contractor payments using verified business account. Supports pre-funded wallets and direct bank account debiting for pay-as-you-go payments.
- **Plaid**: Bank account verification (configured).

## Database & Infrastructure
- **Neon PostgreSQL**: Serverless PostgreSQL database with connection pooling.
- **Drizzle ORM**: Type-safe database operations and migrations.
- **Express Session Store**: PostgreSQL-backed session management.

## Authentication & Communication
- **Firebase Auth**: Used for email verification, password resets, and as a fallback authentication mechanism.
- **SendGrid**: Configured for email notifications (currently disabled).

## Development & Build Tools
- **Vite**: Frontend build tool with hot module replacement.
- **ESBuild**: Server-side bundling for production builds.
- **TypeScript**: Full-stack type safety.
- **Drizzle Kit**: Database schema management and migrations.