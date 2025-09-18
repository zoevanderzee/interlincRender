
// Feature flags for gradual rollout
const FEATURE_FLAGS = {
  STRIPE_CONNECT_V2: {
    enabled: false, // Start with V2 disabled
    rollout_percentage: 0, // 0% of users get V2
    user_whitelist: [], // Specific user IDs to force V2
    user_blacklist: [] // Specific user IDs to force V1
  }
};

export function isFeatureEnabled(flagName, userId = null) {
  const flag = FEATURE_FLAGS[flagName];
  if (!flag) return false;
  
  // Check if globally disabled
  if (!flag.enabled) return false;
  
  // Check blacklist first
  if (userId && flag.user_blacklist.includes(userId)) {
    return false;
  }
  
  // Check whitelist
  if (userId && flag.user_whitelist.includes(userId)) {
    return true;
  }
  
  // Check rollout percentage
  if (userId) {
    const userHash = userId % 100;
    return userHash < flag.rollout_percentage;
  }
  
  return false;
}

export function enableFeatureForUser(flagName, userId) {
  const flag = FEATURE_FLAGS[flagName];
  if (flag && !flag.user_whitelist.includes(userId)) {
    flag.user_whitelist.push(userId);
  }
}

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
