# Email Setup for Production

## Current Status
- Password reset and email verification generate tokens correctly
- Email sending is simulated (logs URLs to console)
- For development: tokens are included in API responses
- For production: actual email service integration needed

## Email Integration Options

### 1. Firebase Auth Email Service (Recommended)
```bash
npm install firebase-admin
```

Configure Firebase Admin SDK:
- Download service account key from Firebase Console
- Set FIREBASE_SERVICE_ACCOUNT_KEY environment variable
- Enable Authentication > Settings > Email Templates

### 2. SendGrid Integration
```bash
npm install @sendgrid/mail
```

Configure SendGrid:
- Set SENDGRID_API_KEY environment variable
- Create email templates for password reset and verification

### 3. Other Email Services
- Nodemailer with SMTP
- AWS SES
- Mailgun
- Postmark

## Current Implementation
- Backend generates reset/verification tokens
- URLs are logged to console for development
- Frontend handles token validation
- Database stores token expiration

## Production Deployment
1. Choose email service provider
2. Configure environment variables
3. Remove development token exposure
4. Test email delivery
5. Set up email templates

## Development Testing
- Check server console for reset URLs
- Copy token from logs
- Navigate to /reset-password or /verify-email manually