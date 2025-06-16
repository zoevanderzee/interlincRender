/**
 * Test script to verify Trolley API connection
 */

import { createHmac } from 'crypto';

const TROLLEY_API_BASE = 'https://api.trolley.com/v1';

class TrolleyConnectionTest {
  constructor() {
    this.apiKey = process.env.TROLLEY_API_KEY;
    this.apiSecret = process.env.TROLLEY_API_SECRET;
    
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Trolley API credentials not found. Ensure TROLLEY_API_KEY and TROLLEY_API_SECRET are set.');
    }
  }

  generateAuthHeader(method, path, body = '') {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const message = `${timestamp}${method.toUpperCase()}${path}${body}`;
    const signature = createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('hex');
    
    return {
      timestamp,
      authorization: `prsign ${this.apiKey}:${signature}`
    };
  }

  getAuthHeaders(method, path, body = '') {
    const { timestamp, authorization } = this.generateAuthHeader(method, path, body);
    
    return {
      'Content-Type': 'application/json',
      'Authorization': authorization,
      'X-PR-Timestamp': timestamp,
      'Accept': 'application/json'
    };
  }

  async testConnection() {
    const path = '/balances';
    
    try {
      console.log('Testing Trolley API connection...');
      console.log(`API Key: ${this.apiKey.substring(0, 8)}...`);
      
      const response = await fetch(`${TROLLEY_API_BASE}${path}`, {
        method: 'GET',
        headers: this.getAuthHeaders('GET', path)
      });

      console.log(`Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Trolley API error:', errorData);
        return false;
      }

      const data = await response.json();
      console.log('✅ Trolley API connection successful!');
      console.log('Account balance data:', JSON.stringify(data, null, 2));
      return true;
      
    } catch (error) {
      console.error('❌ Trolley API connection failed:', error.message);
      return false;
    }
  }
}

async function main() {
  try {
    const tester = new TrolleyConnectionTest();
    const success = await tester.testConnection();
    
    if (success) {
      console.log('\n🎉 Trolley integration is ready to use!');
    } else {
      console.log('\n❌ Trolley integration needs configuration.');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

main().catch(console.error);