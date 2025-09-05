/**
 * Trolley Configuration Management
 * Handles dynamic credential loading and API connection testing
 */

import { createHmac } from 'crypto';

interface TrolleyCredentials {
  apiKey: string;
  apiSecret: string;
}

class TrolleyConfig {
  private static instance: TrolleyConfig;
  private credentials: TrolleyCredentials | null = null;

  private constructor() {
    this.loadCredentials();
  }

  public static getInstance(): TrolleyConfig {
    if (!TrolleyConfig.instance) {
      TrolleyConfig.instance = new TrolleyConfig();
    }
    return TrolleyConfig.instance;
  }

  private loadCredentials(): void {
    const apiKey = process.env.TROLLEY_API_KEY;
    const apiSecret = process.env.TROLLEY_API_SECRET;

    if (apiKey && apiSecret) {
      this.credentials = { apiKey, apiSecret };
    } else {
      this.credentials = null;
    }
  }

  public refreshCredentials(): void {
    this.loadCredentials();
  }

  public getCredentials(): TrolleyCredentials | null {
    // Always reload from environment to catch updates
    this.loadCredentials();
    return this.credentials;
  }

  public async testConnection(): Promise<{ success: boolean; error?: string }> {
    const creds = this.getCredentials();
    if (!creds) {
      return { success: false, error: 'No credentials configured' };
    }

    try {
      const method = 'GET';
      const path = '/v1/recipients';
      const timestamp = Math.floor(Date.now() / 1000);
      
      const message = `${timestamp}${method.toUpperCase()}${path}`;
      const signature = createHmac('sha256', creds.apiSecret).update(message).digest('hex');
      const authorization = `prsign ${creds.apiKey}:${signature}`;

      const response = await fetch('https://api.trolley.com/v1/recipients', {
        method: 'GET',
        headers: {
          'Authorization': authorization,
          'Content-Type': 'application/json',
          'X-PR-Timestamp': timestamp.toString(),
          'Accept': 'application/json'
        }
      });

      if (response.status === 200) {
        return { success: true };
      } else {
        const data = await response.json();
        return { success: false, error: data.errors?.[0]?.message || 'API error' };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Connection failed' };
    }
  }
}

export const trolleyConfig = TrolleyConfig.getInstance();
export type { TrolleyCredentials };