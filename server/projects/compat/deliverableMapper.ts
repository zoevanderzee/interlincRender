// Compatibility mapper for deliverable/milestone terminology
// Maps frontend deliverable fields to backend milestone fields

export type DeliverableInput = {
  deliverableId?: string;
  title?: string;
  description?: string;
  dueDate?: string; // ISO
  amount?: number;
  currency?: string; // default from project
  assigneeUserId?: string;
  contractId?: number;
  // legacy aliases:
  milestoneId?: string;
  name?: string;
  deadline?: string;
  price?: number;
  paymentAmount?: string;
};

export function normalizeDeliverable(input: DeliverableInput) {
  return {
    id: input.deliverableId ?? input.milestoneId ?? null,
    name: input.title ?? input.name ?? "",
    description: input.description ?? "",
    dueDate: input.dueDate ?? input.deadline ?? null,
    paymentAmount: input.amount?.toString() ?? input.price?.toString() ?? input.paymentAmount ?? "0",
    currency: input.currency ?? null,
    contractId: input.contractId ?? null,
    assigneeUserId: input.assigneeUserId ?? null,
  };
}

// Log validation failures for debugging
export function logValidationFailure(requestBody: any, projectId?: string, userId?: string) {
  const keys = Object.keys(requestBody).sort();
  console.log(`[DELIVERABLE_VALIDATE] keys=${keys.join(',')} projectId=${projectId || 'unknown'} user=${userId || 'unknown'}`);
}

// Expected keys for error responses
export const EXPECTED_DELIVERABLE_KEYS = ["title", "dueDate", "amount", "currency", "assigneeUserId"];
export const LEGACY_MILESTONE_KEYS = ["name", "deadline", "price", "paymentAmount"];