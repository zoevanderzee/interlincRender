import { storage } from "../storage";
import { Payment, User } from "@shared/schema";

/**
 * Email notifications disabled - all functions return false
 */
export async function sendPaymentNotification(): Promise<boolean> {
  console.log('Payment notification skipped - email disabled');
  return false;
}

export async function sendBankAccountVerificationNotification(): Promise<boolean> {
  console.log('Bank account verification notification skipped - email disabled');
  return false;
}

export async function sendContractPaymentCompletionNotification(): Promise<boolean> {
  console.log('Contract completion notification skipped - email disabled');
  return false;
}

export default {
  sendPaymentNotification,
  sendBankAccountVerificationNotification,
  sendContractPaymentCompletionNotification
};