import { queryClient } from './queryClient';
import { queryKeys as QK } from './queryKeys';

/**
 * Centralized cache invalidation helper - ensures all related data updates across pages
 * when mutations occur. This fixes the "data not integrated across pages" issue.
 */
export function invalidateAfter(
  action: 
    | 'workRequest.change'
    | 'workRequest.create' 
    | 'project.change'
    | 'task.change'
    | 'contract.change'
    | 'user.change',
  context: {
    id?: number;
    projectId?: number;
    contractorId?: number;
    businessId?: number;
  } = {}
) {
  const invalidations = new Set<readonly (string | number)[]>();

  switch (action) {
    case 'workRequest.change':
    case 'workRequest.create':
      // Invalidate core work request data
      invalidations.add(QK.workRequests.all);
      invalidations.add(QK.dashboard.root);
      invalidations.add(QK.notifications.count);
      invalidations.add(QK.budget.root);
      invalidations.add(QK.integrated.all);
      
      // Invalidate specific items if IDs provided
      if (context.id) {
        invalidations.add(QK.workRequests.detail(context.id));
      }
      if (context.projectId) {
        invalidations.add(QK.workRequests.byProject(context.projectId));
        invalidations.add(QK.projects.detail(context.projectId));
      }
      break;

    case 'project.change':
      invalidations.add(QK.projects.all);
      invalidations.add(QK.workRequests.all);
      invalidations.add(QK.dashboard.root);
      invalidations.add(QK.integrated.all);
      
      if (context.id) {
        invalidations.add(QK.projects.detail(context.id));
        invalidations.add(QK.workRequests.byProject(context.id));
      }
      break;

    case 'task.change':
      invalidations.add(QK.tasks.all);
      invalidations.add(QK.dashboard.root);
      invalidations.add(QK.notifications.count);
      invalidations.add(QK.budget.root);
      invalidations.add(QK.integrated.all);
      
      if (context.id) {
        invalidations.add(QK.tasks.detail(context.id));
        invalidations.add(QK.tasks.submissions(context.id));
      }
      break;

    case 'contract.change':
      invalidations.add(QK.contracts.all);
      invalidations.add(QK.dashboard.root);
      invalidations.add(QK.integrated.all);
      
      if (context.id) {
        invalidations.add(QK.contracts.detail(context.id));
      }
      break;

    case 'user.change':
      invalidations.add(QK.users.current);
      invalidations.add(QK.contractors.all);
      invalidations.add(QK.integrated.all);
      
      if (context.id) {
        invalidations.add(QK.users.detail(context.id));
      }
      break;
  }

  // Execute all invalidations
  Array.from(invalidations).forEach(queryKey => {
    queryClient.invalidateQueries({ queryKey: queryKey as any });
  });

  console.log(`[Cache Invalidation] ${action}:`, {
    context,
    invalidatedKeys: Array.from(invalidations)
  });
}

/**
 * Optimistic update helper for common UI patterns
 */
export function optimisticUpdate<T>(
  queryKey: readonly (string | number)[],
  updater: (oldData: T | undefined) => T | undefined
) {
  const oldData = queryClient.getQueryData<T>(queryKey as any);
  const newData = updater(oldData);
  
  if (newData) {
    queryClient.setQueryData(queryKey as any, newData);
  }
  
  return oldData; // Return for rollback on error
}