# Creativ Linc - Smart Contract SaaS Platform

## Deployment Instructions

### Prerequisites
- Make sure your Replit has Node.js installed
- PostgreSQL database should be provisioned and available

### How to Deploy

1. Click on the **Deploy** button in the Replit interface.

2. Configure your deployment with the following settings:
   - **Build Command**: `./build.sh`
   - **Run Command**: `./start.sh`

3. Set up environment variables in the Replit Deployment settings:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `SESSION_SECRET`: A random string for session security
   - `STRIPE_SECRET_KEY`: Your Stripe secret key
   - `VITE_STRIPE_PUBLIC_KEY`: Your Stripe publishable key (starts with pk_)
   - `SENDGRID_API_KEY`: Your SendGrid API key
   - `SENDGRID_VERIFIED_SENDER`: Your verified sender email

4. Click **Deploy** to start the deployment process.

### Troubleshooting

- If you encounter a build error, check the logs for details.
- Ensure all environment variables are correctly set.
- Verify Node.js is available in the deployment environment.

## About Creativ Linc

A sophisticated SaaS platform revolutionizing outsourced work management by providing businesses a centralized solution for contractor recruitment, project management, and financial workflows.

### Tech Stack
- TypeScript
- React
- PostgreSQL
- Drizzle ORM
- Plaid Integration
- Stripe Payment Processing
- SendGrid Email Integration
- Zod Schema Validation
- React Query
- Passport.js Authentication