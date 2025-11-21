import { type Payment } from "@shared/schema";

/**
 * Maps raw payment processor and platform statuses into a unified payment status for display.
 */
export function mapPaymentStatus(payment: Pick<Payment, "status" | "stripePaymentIntentStatus" | "stripeTransferStatus">): string {
  if (payment.stripeTransferStatus === "succeeded") {
    return "paid";
  }

  if (payment.stripePaymentIntentStatus === "succeeded" || payment.stripePaymentIntentStatus === "processing") {
    return "processing";
  }

  if (
    payment.stripePaymentIntentStatus === "requires_payment_method" ||
    payment.stripePaymentIntentStatus === "requires_action" ||
    payment.stripePaymentIntentStatus === "requires_confirmation" ||
    payment.stripePaymentIntentStatus === "incomplete" ||
    payment.stripePaymentIntentStatus === "canceled"
  ) {
    return "incomplete";
  }

  if (payment.status === "completed") {
    return "paid";
  }

  return payment.status;
}
