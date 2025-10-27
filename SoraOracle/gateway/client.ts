/**
 * x402 Gateway Client
 * 
 * Helper for agents to call gateway-proxied APIs with x402 payments
 */

import { X402Client } from '../src/sdk/X402Client';

export interface GatewayConfig {
  gatewayUrl: string;
  x402Client: X402Client;
}

export interface GatewayAPICall {
  api: 'coingecko' | 'openweather' | 'newsapi' | 'alphavantage';
  endpoint?: string;
  params?: Record<string, any>;
}

export class GatewayClient {
  private config: GatewayConfig;

  constructor(config: GatewayConfig) {
    this.config = config;
  }

  /**
   * Call CoinGecko via gateway
   */
  async callCoinGecko(endpoint: string, params?: Record<string, any>): Promise<any> {
    return this.callGateway({
      api: 'coingecko',
      endpoint,
      params
    });
  }

  /**
   * Call OpenWeatherMap via gateway
   */
  async callOpenWeather(endpoint: string, params?: Record<string, any>): Promise<any> {
    return this.callGateway({
      api: 'openweather',
      endpoint,
      params
    });
  }

  /**
   * Call NewsAPI via gateway
   */
  async callNewsAPI(endpoint: string, params?: Record<string, any>): Promise<any> {
    return this.callGateway({
      api: 'newsapi',
      endpoint,
      params
    });
  }

  /**
   * Call Alpha Vantage via gateway
   */
  async callAlphaVantage(params: Record<string, any>): Promise<any> {
    return this.callGateway({
      api: 'alphavantage',
      params
    });
  }

  /**
   * Generic gateway call with x402 payment
   */
  private async callGateway(call: GatewayAPICall): Promise<any> {
    // Generate payment proof
    const payment = await this.config.x402Client.createPayment('dataSourceAccess');

    // Call gateway
    const response = await fetch(`${this.config.gatewayUrl}/proxy/${call.api}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-402-Payment': JSON.stringify(payment)
      },
      body: JSON.stringify({
        endpoint: call.endpoint,
        params: call.params
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gateway error: ${error.message || response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(`API error: ${result.error || 'Unknown error'}`);
    }

    return result.data;
  }

  /**
   * Get gateway pricing
   */
  async getPricing(): Promise<any> {
    const response = await fetch(`${this.config.gatewayUrl}/pricing`);
    return response.json();
  }

  /**
   * Get gateway stats (if available)
   */
  async getStats(): Promise<any> {
    const response = await fetch(`${this.config.gatewayUrl}/stats`);
    return response.json();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.gatewayUrl}/health`);
      const data = await response.json();
      return data.status === 'healthy';
    } catch {
      return false;
    }
  }
}
