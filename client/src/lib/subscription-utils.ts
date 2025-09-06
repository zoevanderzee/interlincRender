export interface UserSubscriptionData {
  id?: number;
  subscriptionStatus?: string;
  stripe_subscription_id?: string | null;
  invited?: boolean;
  role?: string;
}

export function hasActiveSubscription(user: UserSubscriptionData): boolean {
  // Simple check: if subscription status is active or trialing, they have access
  return user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing';
}

export function requiresSubscription(user: UserSubscriptionData): boolean {
  // Invited users don't need subscription
  if (user.invited) {
    return false;
  }

  // Everyone else needs an active subscription
  return !hasActiveSubscription(user);
}