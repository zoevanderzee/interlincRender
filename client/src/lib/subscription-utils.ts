export interface UserSubscriptionData {
  subscriptionStatus?: string;
  stripe_subscription_id?: string | null;
  invited?: boolean;
}

export function hasActiveSubscription(user: UserSubscriptionData): boolean {
  return user.subscriptionStatus === 'active' || 
         user.subscriptionStatus === 'trialing' || 
         !!user.stripe_subscription_id;
}

export function requiresSubscription(user: UserSubscriptionData): boolean {
  return !hasActiveSubscription(user) && !user.invited;
}