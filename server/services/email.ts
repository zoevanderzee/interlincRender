// Email service disabled - no environment variables required

// Use the verified sender email from environment or fallback
// const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@creativlinc.com';

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