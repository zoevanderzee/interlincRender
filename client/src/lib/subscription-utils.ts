
export interface UserSubscriptionData {
  id?: number;
  subscriptionStatus?: string;
  stripe_subscription_id?: string | null;
  invited?: boolean;
  role?: string;
}

export function hasActiveSubscription(user: UserSubscriptionData): boolean {
  // If user is invited (contractor invited to project), they don't need subscription
  if (user.invited) {
    return true;
  }

  // Check for active subscription statuses - THIS IS THE KEY FIX
  if (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing') {
    return true;
  }

  // Also check if they have a valid Stripe subscription ID (backup check)
  if (user.stripe_subscription_id && user.stripe_subscription_id.trim() !== '') {
    return true;
  }

  return false;
}

export function requiresSubscription(user: UserSubscriptionData): boolean {
  // Invited users never require subscription
  if (user.invited) {
    return false;
  }

  // If user has active subscription, they don't require subscription
  return !hasActiveSubscription(user);
}
