import nodemailer from 'nodemailer';
import { Invite } from '@shared/schema';
import sgMail from '@sendgrid/mail';

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
  if (!transporter) {
    console.warn('Email service not initialized. Initializing now...');
    initializeEmailService();
    return;
  }

  const workerType = invite.workerType || 'contractor';
  
  try {
    // Generate a sign-up URL with the invite ID
    const signupUrl = `${appUrl}/auth?invite=${invite.id}&email=${encodeURIComponent(invite.email)}`;
    
    // Create the email content
    const mailOptions = {
      from: process.env.SMTP_FROM || '"Creativ Linc" <noreply@creativlinc.com>',
      to: invite.email,
      subject: `Invitation to join a project as a ${workerType === 'freelancer' ? 'freelancer' : 'sub contractor'}`,
      html: `
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
      `
    };
    
    // Send the email
    const info = await transporter.sendMail(mailOptions);
    
    // Log the result
    if (process.env.NODE_ENV !== 'production') {
      console.log('Invitation email sent: %s', info.messageId);
      // Preview URL only available when sending through Ethereal
      if (info.messageId && info.messageId.includes('ethereal')) {
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      }
    }
    
    return info;
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