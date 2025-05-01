import nodemailer from 'nodemailer';
import { Invite, WorkRequest } from '@shared/schema';
import sgMail from '@sendgrid/mail';
import crypto from 'crypto';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

// Create a transporter for sending emails
let transporter: nodemailer.Transporter;

/**
 * Initialize the email service
 * In production, you would use real SMTP credentials
 */
export function initializeEmailService() {
  // Initialize SendGrid if API key is available
  if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    console.log('SendGrid email service initialized');
    
    // Display verified sender email for debugging
    const verifiedSender = process.env.SENDGRID_VERIFIED_SENDER || 'support@creativlinc.replit.app';
    console.log(`Using verified sender email: ${verifiedSender.includes('@') ? verifiedSender : '[HIDDEN]'}`);
  }
  // For production, use real SMTP settings
  else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    console.log('Email service initialized with SMTP configuration');
  } else {
    // For development, use ethereal.email (fake SMTP service for testing)
    console.log('No SMTP credentials found. Using test account for email delivery.');
    nodemailer.createTestAccount().then(testAccount => {
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log('Test email account created', {
        user: testAccount.user,
        pass: testAccount.pass,
        preview: 'https://ethereal.email'
      });
    }).catch(err => {
      console.error('Failed to create test email account', err);
    });
  }
}

/**
 * Send an invitation email to a contractor or freelancer
 */
export async function sendInvitationEmail(invite: Invite, appUrl: string = 'https://creativlinc.replit.app') {
  console.log(`Sending invitation email with app URL: ${appUrl}`);
  
  // Initialize email service if needed
  if (!transporter && !process.env.SENDGRID_API_KEY) {
    console.warn('Email service not initialized. Initializing now...');
    initializeEmailService();
    
    // Wait a moment for the transporter to be fully initialized
    if (!transporter) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  const workerType = invite.workerType || 'contractor';
  
  try {
    // Generate a sign-up URL with the invite ID
    const signupUrl = `${appUrl}/auth?invite=${invite.id}&email=${encodeURIComponent(invite.email)}`;
    
    // Create the HTML email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${appUrl}/logo.png" alt="Creativ Linc Logo" style="max-width: 150px;" />
        </div>
        
        <h2 style="color: #000; margin-bottom: 20px;">You've Been Invited to a Project</h2>
        
        <p>Hello,</p>
        
        <p>You've been invited to join <strong>${invite.projectName}</strong> as a ${workerType === 'freelancer' ? 'freelancer' : 'sub contractor'}.</p>
        
        ${invite.message ? `<p><strong>Message:</strong> "${invite.message}"</p>` : ''}
        
        <p>Project details:</p>
        <ul>
          <li><strong>Project:</strong> ${invite.projectName}</li>
          <li><strong>Payment Amount:</strong> $${invite.paymentAmount || 'To be discussed'}</li>
        </ul>
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="${signupUrl}" style="background-color: #000; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 4px; display: inline-block;">Accept Invitation</a>
        </div>
        
        <p style="color: #666; font-size: 14px;">This invitation will expire on ${invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : 'N/A'}.</p>
        
        <p>If you have any questions, please contact the project administrator.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
        
        <p style="color: #999; font-size: 12px; text-align: center;">
          Creativ Linc - Smart Contract Management for Your Business<br />
          This is an automated email, please do not reply.
        </p>
      </div>
    `;
    
    // Plain text fallback content
    const textContent = `
      Hello,
      
      You've been invited to join ${invite.projectName} as a ${workerType === 'freelancer' ? 'freelancer' : 'sub contractor'}.
      
      ${invite.message ? `Message: "${invite.message}"` : ''}
      
      Project details:
      - Project: ${invite.projectName}
      - Payment Amount: $${invite.paymentAmount || 'To be discussed'}
      
      To accept the invitation, please visit: ${signupUrl}
      
      This invitation will expire on ${invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : 'N/A'}.
      
      If you have any questions, please contact the project administrator.
      
      Creativ Linc - Smart Contract Management for Your Business
      This is an automated email, please do not reply.
    `;
    
    let info;
    
    // Try to use SendGrid first
    if (process.env.SENDGRID_API_KEY) {
      try {
        // Use a verified sender email from SendGrid account
        const verifiedSender = process.env.SENDGRID_VERIFIED_SENDER || 'support@creativlinc.replit.app';
        
        console.log(`Using SendGrid to send invitation email from ${verifiedSender} to ${invite.email}`);
        console.log(`SendGrid API Key present and starts with: ${process.env.SENDGRID_API_KEY.substring(0, 7)}...`);
        
        // Create the email data
        const emailData = {
          to: invite.email,
          from: verifiedSender,
          subject: `Invitation to join a project as a ${workerType === 'freelancer' ? 'freelancer' : 'sub contractor'}`,
          text: textContent,
          html: htmlContent
        };

        // Log basic email data for debugging (omitting content)
        console.log('Email data for SendGrid:', {
          to: emailData.to,
          from: emailData.from,
          subject: emailData.subject,
          textLength: textContent.length,
          htmlLength: htmlContent.length
        });
        
        // Send the email
        const result = await sgMail.send(emailData);
        
        console.log(`Invitation email sent via SendGrid to ${invite.email} - Response:`, result);
        return { success: true, provider: 'sendgrid' };
      } catch (sendGridError: any) {
        console.error('SendGrid error, falling back to Nodemailer:', sendGridError);
        
        // Extract more detailed error information from SendGrid response
        if (sendGridError.response && sendGridError.response.body) {
          console.error('SendGrid detailed error:', JSON.stringify(sendGridError.response.body));
        }
        
        // If the error is related to the sender verification, log a specific message
        if (sendGridError.message && sendGridError.message.includes('Sender Identity')) {
          console.error('IMPORTANT: The sender email is not verified in SendGrid. Please verify it in your SendGrid account.');
        }
      }
    }
    
    // Fall back to Nodemailer if SendGrid fails or isn't configured
    if (!transporter) {
      // Create a test account if needed
      await nodemailer.createTestAccount().then(testAccount => {
        transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
        
        console.log('Created test email account for invitation:', {
          user: testAccount.user,
          pass: testAccount.pass,
          preview: 'https://ethereal.email'
        });
      });
    }
    
    // Create the email options
    const mailOptions = {
      from: process.env.SMTP_FROM || '"Creativ Linc" <noreply@creativlinc.com>',
      to: invite.email,
      subject: `Invitation to join a project as a ${workerType === 'freelancer' ? 'freelancer' : 'sub contractor'}`,
      text: textContent,
      html: htmlContent
    };
    
    // Send with Nodemailer
    info = await transporter.sendMail(mailOptions);
    
    // Log the result
    console.log('Invitation email sent via Nodemailer: %s', info.messageId);
    // Preview URL only available when sending through Ethereal
    if (info.messageId && info.messageId.includes('ethereal')) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    return { success: true, provider: 'nodemailer', info };
  } catch (error) {
    console.error('Error sending invitation email:', error);
    throw error;
  }
}

/**
 * Send an email notification when a smart contract is created
 */
export async function sendContractCreatedEmail(contractData: any, recipientEmail: string, appUrl: string = 'https://creativlinc.replit.app') {
  if (!transporter) {
    console.warn('Email service not initialized. Initializing now...');
    initializeEmailService();
    return;
  }
  
  try {
    // Create the email content
    const mailOptions = {
      from: process.env.SMTP_FROM || '"Creativ Linc" <noreply@creativlinc.com>',
      to: recipientEmail,
      subject: `New Smart Contract: ${contractData.contractName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${appUrl}/logo.png" alt="Creativ Linc Logo" style="max-width: 150px;" />
          </div>
          
          <h2 style="color: #000; margin-bottom: 20px;">Smart Contract Created</h2>
          
          <p>Hello,</p>
          
          <p>A new smart contract has been created for you:</p>
          
          <ul>
            <li><strong>Contract Name:</strong> ${contractData.contractName}</li>
            <li><strong>Contract Code:</strong> ${contractData.contractCode}</li>
            <li><strong>Value:</strong> $${contractData.value}</li>
            <li><strong>Start Date:</strong> ${contractData.startDate ? new Date(contractData.startDate).toLocaleDateString() : 'To be determined'}</li>
            <li><strong>End Date:</strong> ${contractData.endDate ? new Date(contractData.endDate).toLocaleDateString() : 'To be determined'}</li>
          </ul>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${appUrl}/contracts/${contractData.id}" style="background-color: #000; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 4px; display: inline-block;">View Contract</a>
          </div>
          
          <p>If you have any questions, please contact the project administrator.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            Creativ Linc - Smart Contract Management for Your Business<br />
            This is an automated email, please do not reply.
          </p>
        </div>
      `
    };
    
    // Send the email
    const info = await transporter.sendMail(mailOptions);
    
    // Log the result
    if (process.env.NODE_ENV !== 'production') {
      console.log('Contract email sent: %s', info.messageId);
      // Preview URL only available when sending through Ethereal
      if (info.messageId && info.messageId.includes('ethereal')) {
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      }
    }
    
    return info;
  } catch (error) {
    console.error('Error sending contract email:', error);
    throw error;
  }
}

/**
 * Generic function to send an email
 */
export async function sendEmail(options: EmailOptions): Promise<any> {
  // Initialize email service if needed
  if (!transporter && !process.env.SENDGRID_API_KEY) {
    console.warn('Email service not initialized. Initializing now...');
    initializeEmailService();
    
    // Wait a moment for initialization
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  try {
    // Try SendGrid first, fall back to Nodemailer if there's an error
    if (process.env.SENDGRID_API_KEY) {
      // Use a verified sender email from your SendGrid account
      const verifiedSender = process.env.SENDGRID_VERIFIED_SENDER || 'support@creativlinc.replit.app';
      
      await sgMail.send({
        to: options.to,
        from: verifiedSender,
        subject: options.subject,
        text: options.text,
        html: options.html || options.text
      });
      
      return { success: true };
    } else {
      // Fall back to Nodemailer
      const mailOptions = {
        from: process.env.SMTP_FROM || '"Creativ Linc" <noreply@creativlinc.com>',
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html || options.text
      };
      
      const info = await transporter.sendMail(mailOptions);
      
      // Log the result
      if (process.env.NODE_ENV !== 'production') {
        console.log('Email sent: %s', info.messageId);
        // Preview URL only available when sending through Ethereal
        if (info.messageId && info.messageId.includes('ethereal')) {
          console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
        }
      }
      
      return info;
    }
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

/**
 * Send a password reset email with a reset link
 */
export async function sendPasswordResetEmail(email: string, token: string, appUrl: string = 'https://creativlinc.replit.app') {
  // Initialize email service if needed
  if (!transporter && !process.env.SENDGRID_API_KEY) {
    console.warn('Email service not initialized. Initializing now...');
    initializeEmailService();
    return;
  }
  
  try {
    // Generate password reset URL
    const resetUrl = `${appUrl}/reset-password?token=${token}`;
    
    // Create the email content
    const mailOptions = {
      from: process.env.SMTP_FROM || '"Creativ Linc" <noreply@creativlinc.com>',
      to: email,
      subject: `Password Reset Request`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; background-color: #000; color: #fff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${appUrl}/logo.png" alt="Creativ Linc Logo" style="max-width: 150px;" />
          </div>
          
          <h2 style="color: #fff; margin-bottom: 20px;">Password Reset</h2>
          
          <p>Hello,</p>
          
          <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
          
          <p>To reset your password, click the button below:</p>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${resetUrl}" style="background-color: #333; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 4px; display: inline-block; border: 1px solid #444;">Reset Password</a>
          </div>
          
          <p style="color: #aaa; font-size: 14px;">This link will expire in 1 hour for security reasons.</p>
          
          <p>If the button doesn't work, copy and paste this URL into your browser:</p>
          <p style="word-break: break-all; background-color: #111; padding: 10px; border-radius: 4px; font-size: 12px;">${resetUrl}</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #333;" />
          
          <p style="color: #aaa; font-size: 12px; text-align: center;">
            Creativ Linc - Smart Contract Management for Your Business<br />
            This is an automated email, please do not reply.
          </p>
        </div>
      `
    };
    
    // Try SendGrid first, fall back to Nodemailer if there's an error
    let info;
    try {
      if (process.env.SENDGRID_API_KEY) {
        // Use a verified sender email from your SendGrid account
        // This email address must be verified in your SendGrid account
        const verifiedSender = process.env.SENDGRID_VERIFIED_SENDER || 'support@creativlinc.replit.app';
        
        info = await sgMail.send({
          to: email,
          from: verifiedSender,
          subject: 'Password Reset Request',
          html: mailOptions.html
        });
        console.log(`Password reset email sent via SendGrid from ${verifiedSender} to ${email}`);
      } else {
        throw new Error('SendGrid API key not available');
      }
    } catch (error: any) {
      console.log('SendGrid error, falling back to Nodemailer:', error.message || 'Unknown error');
      
      // Ensure we have a transporter initialized
      if (!transporter) {
        await nodemailer.createTestAccount().then(testAccount => {
          transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
              user: testAccount.user,
              pass: testAccount.pass
            }
          });
          console.log('Created test email account for password reset:', {
            user: testAccount.user,
            pass: testAccount.pass,
            preview: 'https://ethereal.email'
          });
        });
      }
      
      info = await transporter.sendMail(mailOptions);
      
      // Log the result for development
      console.log('Password reset email sent via Nodemailer: %s', info.messageId);
      // Preview URL only available when sending through Ethereal
      if (info.messageId && info.messageId.includes('ethereal')) {
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      }
    }
    
    return info;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
}

/**
 * Send a payment notification email
 */
export async function sendPaymentNotificationEmail(paymentData: any, recipientEmail: string, appUrl: string = 'https://creativlinc.replit.app') {
  if (!transporter) {
    console.warn('Email service not initialized. Initializing now...');
    initializeEmailService();
    return;
  }
  
  try {
    // Create the email content
    const mailOptions = {
      from: process.env.SMTP_FROM || '"Creativ Linc" <noreply@creativlinc.com>',
      to: recipientEmail,
      subject: `Payment ${paymentData.status === 'completed' ? 'Completed' : 'Processing'}: $${paymentData.amount}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${appUrl}/logo.png" alt="Creativ Linc Logo" style="max-width: 150px;" />
          </div>
          
          <h2 style="color: #000; margin-bottom: 20px;">Payment ${paymentData.status === 'completed' ? 'Completed' : 'Processing'}</h2>
          
          <p>Hello,</p>
          
          <p>We're writing to inform you about a payment for your contract:</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Amount:</strong> $${paymentData.amount}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> ${paymentData.status.charAt(0).toUpperCase() + paymentData.status.slice(1)}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${(paymentData.completedDate || paymentData.scheduledDate) ? new Date(paymentData.completedDate || paymentData.scheduledDate).toLocaleDateString() : 'Scheduled'}</p>
            ${paymentData.notes ? `<p style="margin: 5px 0;"><strong>Notes:</strong> ${paymentData.notes}</p>` : ''}
          </div>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${appUrl}/payments" style="background-color: #000; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 4px; display: inline-block;">View Payment Details</a>
          </div>
          
          <p>If you have any questions, please contact the project administrator.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            Creativ Linc - Smart Contract Management for Your Business<br />
            This is an automated email, please do not reply.
          </p>
        </div>
      `
    };
    
    // Send the email
    const info = await transporter.sendMail(mailOptions);
    
    // Log the result
    if (process.env.NODE_ENV !== 'production') {
      console.log('Payment email sent: %s', info.messageId);
      // Preview URL only available when sending through Ethereal
      if (info.messageId && info.messageId.includes('ethereal')) {
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      }
    }
    
    return info;
  } catch (error) {
    console.error('Error sending payment email:', error);
    throw error;
  }
}

/**
 * Creates a secure token for work requests and returns both the token and its hash
 */
export function generateWorkRequestToken(): { token: string, tokenHash: string } {
  // Generate a random token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Create a hash of the token to store in the database
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  return { token, tokenHash };
}

/**
 * Verifies if a work request token is valid by comparing its hash
 */
export function verifyWorkRequestToken(token: string, storedTokenHash: string): boolean {
  // Hash the provided token
  const hashToCheck = crypto.createHash('sha256').update(token).digest('hex');
  
  // Compare with the stored hash
  return hashToCheck === storedTokenHash;
}

/**
 * Send a work request email to a potential contractor or freelancer
 */
export async function sendWorkRequestEmail(workRequest: WorkRequest, token: string, businessName: string, appUrl: string = 'https://creativlinc.replit.app'): Promise<any> {
  // Initialize email service if needed
  if (!transporter && !process.env.SENDGRID_API_KEY) {
    console.warn('Email service not initialized. Initializing now...');
    initializeEmailService();
    return;
  }
  
  try {
    // Generate the work request link with the token
    const workRequestUrl = `${appUrl}/contractor-connect?token=${token}`;
    
    // Format budget display
    let budgetDisplay = 'To be discussed';
    if (workRequest.budgetMin && workRequest.budgetMax) {
      budgetDisplay = `$${workRequest.budgetMin} - $${workRequest.budgetMax}`;
    } else if (workRequest.budgetMin) {
      budgetDisplay = `Starting at $${workRequest.budgetMin}`;
    } else if (workRequest.budgetMax) {
      budgetDisplay = `Up to $${workRequest.budgetMax}`;
    }
    
    // Format skills display
    const skillsDisplay = workRequest.skills ? 
      `<p><strong>Required Skills:</strong> ${workRequest.skills}</p>` : '';
    
    // Format attachments display
    let attachmentsDisplay = '';
    if (workRequest.attachmentUrls && workRequest.attachmentUrls.length > 0) {
      attachmentsDisplay = `
        <p><strong>Attachments:</strong></p>
        <ul>
          ${(workRequest.attachmentUrls as string[]).map(url => `<li><a href="${url}" target="_blank">${url.split('/').pop()}</a></li>`).join('')}
        </ul>
      `;
    }
    
    // Create the email content
    const mailOptions = {
      from: process.env.SMTP_FROM || '"Creativ Linc" <noreply@creativlinc.com>',
      to: workRequest.recipientEmail,
      subject: `Work Opportunity: ${workRequest.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; background-color: #000; color: #fff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${appUrl}/logo.png" alt="Creativ Linc Logo" style="max-width: 150px;" />
          </div>
          
          <h2 style="color: #fff; margin-bottom: 20px;">Work Opportunity</h2>
          
          <p>Hello,</p>
          
          <p><strong>${businessName}</strong> has a work opportunity that matches your skills and would like to invite you to their project on Creativ Linc.</p>
          
          <div style="background-color: #111; padding: 20px; border-radius: 4px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #fff;">${workRequest.title}</h3>
            <p>${workRequest.description}</p>
            
            <p><strong>Budget:</strong> ${budgetDisplay}</p>
            ${workRequest.dueDate ? `<p><strong>Due Date:</strong> ${new Date(workRequest.dueDate).toLocaleDateString()}</p>` : ''}
            ${skillsDisplay}
            ${attachmentsDisplay}
          </div>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${workRequestUrl}" style="background-color: #333; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 4px; display: inline-block; border: 1px solid #444;">View Work Request</a>
          </div>
          
          <p style="color: #aaa; font-size: 14px;">This request will expire on ${workRequest.expiresAt ? new Date(workRequest.expiresAt).toLocaleDateString() : 'N/A'}.</p>
          
          <p>By accepting this work request, you will be able to coordinate with the client, review contract details, and receive payments directly through our platform.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #333;" />
          
          <p style="color: #aaa; font-size: 12px; text-align: center;">
            Creativ Linc - Smart Contract Management for Your Business<br />
            This is an automated email, please do not reply.
          </p>
        </div>
      `
    };
    
    // Try SendGrid first, fall back to Nodemailer if there's an error
    let info;
    try {
      if (process.env.SENDGRID_API_KEY) {
        const verifiedSender = process.env.SENDGRID_VERIFIED_SENDER || 'support@creativlinc.replit.app';
        
        info = await sgMail.send({
          to: workRequest.recipientEmail,
          from: verifiedSender,
          subject: `Work Opportunity: ${workRequest.title}`,
          html: mailOptions.html
        });
        
        console.log(`Work request email sent via SendGrid to ${workRequest.recipientEmail}`);
      } else {
        throw new Error('SendGrid API key not available');
      }
    } catch (error: any) {
      console.log('SendGrid error, falling back to Nodemailer:', error.message || 'Unknown error');
      
      // Ensure we have a transporter initialized
      if (!transporter) {
        await nodemailer.createTestAccount().then(testAccount => {
          transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
              user: testAccount.user,
              pass: testAccount.pass
            }
          });
        });
      }
      
      info = await transporter.sendMail(mailOptions);
      
      // Log the result for development
      console.log('Work request email sent via Nodemailer: %s', info.messageId);
      if (info.messageId && info.messageId.includes('ethereal')) {
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      }
    }
    
    return info;
  } catch (error) {
    console.error('Error sending work request email:', error);
    throw error;
  }
}