import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon to use WebSockets
neonConfig.webSocketConstructor = ws;

// Set the idle timeout to prevent connection termination (Neon terminates after 5 minutes of inactivity)
const IDLE_TIMEOUT_SECONDS = 30;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create the connection pool with improved configuration
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Add connection pool settings to improve reliability
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 5000, // How long to wait for a connection to become available
});

// Set up a health check to keep connections alive
const healthCheckInterval = setInterval(async () => {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      console.log(`[${new Date().toISOString()}] Database health check: OK`);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Database health check failed:`, err);
  }
}, IDLE_TIMEOUT_SECONDS * 1000);

// Clean up on application shutdown
process.on('SIGINT', () => {
  clearInterval(healthCheckInterval);
  pool.end();
  console.log('Database connection pool has been closed');
  process.exit(0);
});

export const db = drizzle(pool, { schema });