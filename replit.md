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
- **Automated Payments**: Milestone approval triggers automatic payment processing
- **Budget Management**: Business account spending limits and tracking

## External Integrations
- **Trolley API**: Batch payment processing and recipient management
- **Stripe API**: Payment intents, Connect accounts, and subscription management
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

# Changelog

Changelog:
- June 25, 2025. Initial setup