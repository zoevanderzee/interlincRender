// Feature flags configuration - V2 only
const FEATURE_FLAGS = {
  // Stripe Connect V2 - enabled for ALL users (V1 removed)
  STRIPE_CONNECT_V2: {
    enabled: true,
    enabledUsers: 'all'
  },
  // Custom onboarding v2 - in-app onboarding with ToS via API
  CUSTOM_ONBOARDING_V2: {
    enabled: true, // Enabled for all users
    enabledUsers: 'all'
  }
};

export function isFeatureEnabled(flagName, userId = null) {
  const flag = FEATURE_FLAGS[flagName];

  if (!flag || !flag.enabled) {
    return false;
  }

  // V2 is enabled for ALL users (V1 completely removed)
  if (flagName === 'STRIPE_CONNECT_V2') {
    return true;
  }

  // If no user restrictions, feature is enabled
  if (!flag.enabledUsers) {
    return true;
  }

  // If enabled for all users
  if (flag.enabledUsers === 'all') {
    return true;
  }

  // Check if user is in the enabled list
  if (Array.isArray(flag.enabledUsers)) {
    return userId && flag.enabledUsers.includes(userId);
  }

  return false;
}

// This function is no longer relevant as V1 is removed, but kept for backward compatibility if needed elsewhere.
export function enableFeatureForUser(flagName, userId) {
  const flag = FEATURE_FLAGS[flagName];
  if (flag && !flag.user_whitelist.includes(userId)) {
    flag.user_whitelist.push(userId);
  }
}

// This function is no longer relevant as V1 is removed, but kept for backward compatibility if needed elsewhere.
export function setRolloutPercentage(flagName, percentage) {
  const flag = FEATURE_FLAGS[flagName];
  if (flag) {
    flag.rollout_percentage = Math.max(0, Math.min(100, percentage));
  }
}

export function getFeatureFlag(flagName) {
  return FEATURE_FLAGS[flagName] || null;
}

export default {
  isFeatureEnabled,
  enableFeatureForUser,
  setRolloutPercentage,
  getFeatureFlag
};