import Stripe from 'stripe';
import { Payment, User } from '@shared/schema';

// Initialize Stripe with the secret key from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export interface CreatePaymentIntentParams {
  amount: number;
  currency: string;
  description: string;
  metadata?: Record<string, string>;
  transferData?: {
    destination: string;
    amount?: number;
  };
  applicationFeeAmount?: number;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  id: string;
}

export interface ConnectAccountResponse {
  id: string;
  accountLink: string;
}

/**
 * Creates a payment intent in Stripe
 */
export async function createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResponse> {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency,
      description: params.description,
      metadata: params.metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret as string,
      id: paymentIntent.id,
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
}

/**
 * Retrieves a payment intent from Stripe
 */
export async function retrievePaymentIntent(id: string) {
  try {
    return await stripe.paymentIntents.retrieve(id);
  } catch (error) {
    console.error('Error retrieving payment intent:', error);
    throw error;
  }
}

/**
 * Processes a milestone payment
 * Creates a payment intent and returns the client secret for the frontend
 */
export async function processMilestonePayment(payment: Payment): Promise<PaymentIntentResponse> {
  // Convert payment amount to cents (Stripe uses smallest currency unit)
  const amount = Math.round(parseFloat(payment.amount) * 100);
  
  return createPaymentIntent({
    amount,
    currency: 'usd', // Default to USD
    description: `Payment for milestone ID: ${payment.milestoneId}`,
    metadata: {
      paymentId: payment.id.toString(),
      contractId: payment.contractId.toString(),
      milestoneId: payment.milestoneId ? payment.milestoneId.toString() : '',
    },
  });
}

/**
 * Updates the payment status based on the Stripe payment intent status
 */
export async function updatePaymentStatus(paymentIntentId: string): Promise<string> {
  const paymentIntent = await retrievePaymentIntent(paymentIntentId);
  return paymentIntent.status;
}

export default {
  createPaymentIntent,
  retrievePaymentIntent,
  processMilestonePayment,
  updatePaymentStatus,
};