// Email service disabled - no environment variables required

// Use the verified sender email from environment or fallback
// const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@creativlinc.com';

import * as crypto from 'crypto';

// Function to generate a token and its hash for work requests
export function generateWorkRequestToken(): { token: string, tokenHash: string } {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
}

// Function to verify a work request token against its hash
export function verifyWorkRequestToken(token: string, tokenHash: string): boolean {
  const calculatedHash = crypto.createHash('sha256').update(token).digest('hex');
  return calculatedHash === tokenHash;
}

export async function sendWorkRequestDeclinedEmail(
  businessOwnerEmail: string,
  businessOwnerName: string,
  workRequestTitle: string,
  contractorName: string,
  workRequestDescription?: string
): Promise<boolean> {
  try {
    // Email sending is disabled
    console.log('Email sending is disabled');
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}