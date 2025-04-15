import { pool } from '../db';
import { log as serverLog } from '../vite';

/**
 * Performs a health check on the database connection
 * @returns Promise resolving to true if the database is healthy, false otherwise
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    // Execute a simple query to check the database connection
    const result = await pool.query('SELECT 1 as health_check');
    const isHealthy = result.rows.length > 0 && result.rows[0].health_check === 1;
    
    if (isHealthy) {
      serverLog('[Database] Health check: OK');
      return true;
    } else {
      serverLog('[Database] Health check failed: Unexpected query result');
      return false;
    }
  } catch (error) {
    serverLog(`[Database] Health check failed: ${(error as Error).message}`);
    return false;
  }
}

/**
 * Sets up periodic database health checks
 * @param interval Interval in milliseconds between health checks (default: 5 minutes)
 */
export function setupDatabaseHealthChecks(interval: number = 5 * 60 * 1000): void {
  // Initial health check
  checkDatabaseHealth().catch(error => {
    serverLog(`[Database] Initial health check error: ${error.message}`);
  });

  // Schedule periodic health checks
  setInterval(async () => {
    try {
      await checkDatabaseHealth();
    } catch (error) {
      serverLog(`[Database] Periodic health check error: ${(error as Error).message}`);
    }
  }, interval);

  serverLog(`[Database] Health checks scheduled every ${interval / 1000} seconds`);
}