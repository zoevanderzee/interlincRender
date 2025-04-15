/**
 * Basic performance monitoring utility for React applications
 * Can be expanded later with third-party monitoring solutions if needed
 */

// Constants
const PERFORMANCE_LOGGING = import.meta.env.MODE !== 'production';
const PERF_THRESHOLD_WARNING = 2000; // 2 seconds for warning
const PERF_THRESHOLD_ERROR = 5000; // 5 seconds for error
const PERF_MEASURES_PREFIX = 'creativ-linc:';

// Interface for performance data
interface PerformanceData {
  component: string;
  duration: number;
  timestamp: number;
  eventType: 'render' | 'api' | 'interaction' | 'navigation';
  details?: Record<string, any>;
}

// Collection of performance data
const performanceEntries: PerformanceData[] = [];

/**
 * Starts a performance measurement
 * @param name Unique identifier for this measurement
 */
export function startMeasure(name: string): void {
  if (!PERFORMANCE_LOGGING) return;
  
  const measureName = `${PERF_MEASURES_PREFIX}${name}`;
  
  try {
    performance.mark(`${measureName}-start`);
  } catch (error) {
    console.error('Error starting performance measure:', error);
  }
}

/**
 * Ends a performance measurement and records the result
 * @param name The same identifier used with startMeasure
 * @param type The type of operation being measured
 * @param componentName Optional name of the component being measured
 * @param details Additional details to record
 */
export function endMeasure(
  name: string, 
  type: PerformanceData['eventType'] = 'render',
  componentName = '',
  details?: Record<string, any>
): number {
  if (!PERFORMANCE_LOGGING) return 0;
  
  const measureName = `${PERF_MEASURES_PREFIX}${name}`;
  let duration = 0;
  
  try {
    performance.mark(`${measureName}-end`);
    performance.measure(measureName, `${measureName}-start`, `${measureName}-end`);
    
    const entries = performance.getEntriesByName(measureName, 'measure');
    if (entries.length > 0) {
      duration = entries[0].duration;
      
      // Clean up marks and measures
      performance.clearMarks(`${measureName}-start`);
      performance.clearMarks(`${measureName}-end`);
      performance.clearMeasures(measureName);
      
      // Log warning for slow operations
      if (duration > PERF_THRESHOLD_ERROR) {
        console.error(`Performance issue: ${name} took ${duration.toFixed(2)}ms`);
      } else if (duration > PERF_THRESHOLD_WARNING) {
        console.warn(`Performance warning: ${name} took ${duration.toFixed(2)}ms`);
      }
      
      // Record the performance data
      const data: PerformanceData = {
        component: componentName || name,
        duration,
        timestamp: Date.now(),
        eventType: type,
        details
      };
      
      performanceEntries.push(data);
      
      // Keep only the last 100 entries to avoid memory issues
      if (performanceEntries.length > 100) {
        performanceEntries.shift();
      }
    }
  } catch (error) {
    console.error('Error ending performance measure:', error);
  }
  
  return duration;
}

/**
 * Get all recorded performance entries
 */
export function getPerformanceData(): PerformanceData[] {
  return [...performanceEntries];
}

/**
 * Clear all recorded performance data
 */
export function clearPerformanceData(): void {
  performanceEntries.length = 0;
}

/**
 * React component performance monitoring hook
 * Wrap in useEffect with a dependency array to track rendering performance
 * 
 * @example
 * // Track component rendering performance
 * useEffect(() => {
 *   const end = trackComponentRender('MyComponent');
 *   return end;
 * }, [dependency1, dependency2]);
 */
export function trackComponentRender(componentName: string): () => void {
  const measureName = `component:${componentName}`;
  startMeasure(measureName);
  
  return () => {
    endMeasure(measureName, 'render', componentName);
  };
}

/**
 * API call performance monitoring utility
 * Wrap API calls to track performance
 * 
 * @example
 * // Track API call performance
 * const data = await trackApiCall(
 *   'fetchUsers',
 *   () => api.fetchUsers()
 * );
 */
export async function trackApiCall<T>(
  name: string,
  apiCall: () => Promise<T>,
  details?: Record<string, any>
): Promise<T> {
  const measureName = `api:${name}`;
  startMeasure(measureName);
  
  try {
    const result = await apiCall();
    endMeasure(measureName, 'api', name, details);
    return result;
  } catch (error) {
    endMeasure(measureName, 'api', name, { 
      ...details,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}