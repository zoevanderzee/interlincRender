# Overview

This project is a comprehensive contractor/freelancer management platform built with React, Express.js, and PostgreSQL. Its primary purpose is to empower businesses to efficiently manage external workers by handling contractor onboarding, project milestones, payment processing, and ongoing relationships through a unified dashboard.

The platform has achieved a major milestone by transitioning to live money transfers using verified business accounts, processing real money transactions for both pre-funded wallets and pay-as-you-go payments. It aims to provide a robust, secure, and user-friendly solution for the gig economy, enabling seamless collaboration and financial transactions between businesses and contractors.

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
- **Authentication System**: PostgreSQL session-based authentication (primary) with Firebase Auth fallback (secondary), featuring session cookie management, email verification, role-based access control, and CSRF protection.
- **Payment Processing**: Live Trolley integration for real money contractor payments via verified business accounts, supporting pre-funded wallets and direct bank debiting. Stripe Connect handles subscription billing.
- **Notification System**: Real-time, event-based notifications for key actions like milestone approvals, work submissions, and payments, with user-specific filtering.
- **Deployment Strategy**: Node.js 20, ES modules, TSX for development, ESBuild for production bundling. Utilizes Neon PostgreSQL and static file serving.
- **Subscription System**: Live-mode subscription enforcement for both business and contractor accounts, ensuring role-based plan presentation and routing.
- **Contractor Onboarding**: Native Interlinc payment setup interface at `/payment-setup` replaces external widgets, collecting payout details and creating Trolley recipients via direct API calls.
- **File Storage**: Custom in-app file storage system replaces external cloud storage for secure local file management, with upload, view, and download endpoints.
- **Project Management**: Enhanced project creation with deadline tracking, improved UI/UX for project forms, and clear separation between multi-contractor projects and quick tasks.
- **Contract Management**: Comprehensive contract filtering by status and automatic detection of overdue contracts based on end dates, with UI indicators.
- **Work Request Overdue Tracking**: Automatic overdue detection for work requests (tasks) based on due_date comparison, computing isOverdue, daysOverdue, and daysRemaining fields for accepted/active/assigned work requests. Red OVERDUE badges display across both business Tasks tab and contractor assignments view.
- **Security**: Robust data isolation for users, with authentication and ownership validation on sensitive endpoints, and optimized payment queries.

# External Dependencies

## Payment Services
- **Stripe**: Subscription billing and platform fee processing.
- **Trolley**: Live production-mode for real money contractor payments, supporting pre-funded wallets and direct bank debiting.
- **Plaid**: Bank account verification.

## Database & Infrastructure
- **Neon PostgreSQL**: Serverless PostgreSQL database.
- **Drizzle ORM**: Type-safe database operations and migrations.
- **Express Session Store**: PostgreSQL-backed session management.

## Authentication & Communication
- **Firebase Auth**: Email verification, password resets, and fallback authentication.
- **SendGrid**: Configured for email notifications (currently disabled).

## Development & Build Tools
- **Vite**: Frontend build tool.
- **ESBuild**: Server-side bundling.
- **TypeScript**: Full-stack type safety.
- **Drizzle Kit**: Database schema management and migrations.