import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

// Use the verified sender email from environment or fallback
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@creativlinc.com';

export async function sendWorkRequestDeclinedEmail(
  businessOwnerEmail: string,
  businessOwnerName: string,
  workRequestTitle: string,
  contractorName: string,
  workRequestDescription?: string
): Promise<boolean> {
  try {
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #dc2626; margin-bottom: 20px;">Work Request Declined</h2>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.5;">
            Hello ${businessOwnerName},
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.5;">
            We wanted to notify you that <strong>${contractorName}</strong> has declined your work request.
          </p>
          
          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
            <h3 style="color: #dc2626; margin: 0 0 10px 0; font-size: 18px;">Declined Work Request:</h3>
            <p style="color: #374151; margin: 0; font-weight: bold;">${workRequestTitle}</p>
            ${workRequestDescription ? `<p style="color: #6b7280; margin: 10px 0 0 0; font-size: 14px;">${workRequestDescription}</p>` : ''}
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.5;">
            You can view this declined request in your dashboard under the "Declined" tab to review the details and consider next steps.
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              This is an automated notification from your contractor management platform.
            </p>
          </div>
        </div>
      </div>
    `;

    const emailText = `
Work Request Declined

Hello ${businessOwnerName},

${contractorName} has declined your work request: "${workRequestTitle}"

${workRequestDescription ? `Description: ${workRequestDescription}` : ''}

You can view this declined request in your dashboard under the "Declined" tab.

This is an automated notification from your contractor management platform.
    `;

    await mailService.send({
      to: businessOwnerEmail,
      from: FROM_EMAIL,
      subject: `Work Request Declined: ${workRequestTitle}`,
      text: emailText,
      html: emailHtml,
    });

    console.log(`✓ Decline notification email sent to ${businessOwnerEmail}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}