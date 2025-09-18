
// Feature flags for gradual rollout
const FEATURE_FLAGS = {
  STRIPE_CONNECT_V2: {
    enabled: true, // Enable V2 today
    rollout_percentage: 100, // 100% rollout for testing
    user_whitelist: [86], // Enable for your business account
    user_blacklist: [] // No blacklist
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
