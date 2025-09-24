// Central registry for all React Query keys - ensures consistency across components
export const queryKeys = {
  // Projects
  projects: {
    all: ['/api/projects'] as const,
    detail: (id: number) => ['/api/projects', id] as const,
  },

  // Work Requests  
  workRequests: {
    all: ['/api/work-requests'] as const,
    detail: (id: number) => ['/api/work-requests', id] as const,
    byProject: (projectId: number) => ['/api/work-requests', 'byProject', projectId] as const,
    verify: (token: string) => ['/api/work-requests/verify-token', token] as const,
  },

  // Contracts
  contracts: {
    all: ['/api/contracts'] as const,
    detail: (id: number) => ['/api/contracts', id] as const,
  },

  // Contractors & Business Workers
  contractors: {
    all: ['/api/business-workers/contractors'] as const,
    byBusiness: (businessId: number) => ['/api/business-workers/contractors', businessId] as const,
  },

  // Dashboard & Stats
  dashboard: {
    root: ['/api/dashboard'] as const,
  },

  // Budget
  budget: {
    root: ['/api/budget'] as const,
  },

  // Notifications
  notifications: {
    count: ['/api/notifications/count'] as const,
    all: ['/api/notifications'] as const,
  },

  // Tasks (if applicable)
  tasks: {
    all: ['/api/tasks'] as const,
    detail: (id: number) => ['/api/tasks', id] as const,
    submissions: (taskId: number) => ['/api/tasks', taskId, 'submissions'] as const,
  },

  // Users
  users: {
    current: ['/api/user'] as const,
    detail: (id: number) => ['/api/users', id] as const,
  },

  // Integrated data (virtual key for composed hook)
  integrated: {
    all: ['/integrated'] as const,
  },
} as const;

// Convenience re-export
export const QK = queryKeys;