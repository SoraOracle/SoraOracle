/**
 * Cost Tracker for x402 API Gateway
 * 
 * Tracks:
 * - Revenue from agents (x402 payments)
 * - Costs to external APIs
 * - Profit margins
 * - Per-API statistics
 */

export interface Transaction {
  api: string;
  revenue: number;      // What agent paid us
  cost: number;         // What we paid external API
  profit: number;       // revenue - cost
  payer: string;        // Agent address
  timestamp: number;
}

export interface APIStats {
  name: string;
  totalCalls: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  avgRevenue: number;
  avgCost: number;
  avgProfit: number;
}

export interface GatewayStats {
  totalTransactions: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  apiBreakdown: APIStats[];
  topPayers: Array<{ address: string; volume: number; count: number }>;
}

export class CostTracker {
  private transactions: Transaction[] = [];
  private apiStats: Map<string, APIStats> = new Map();
  private payerStats: Map<string, { volume: number; count: number }> = new Map();

  /**
   * Record a transaction
   */
  async recordTransaction(transaction: Transaction): Promise<void> {
    this.transactions.push(transaction);

    // Update API stats
    const apiStat = this.apiStats.get(transaction.api) || {
      name: transaction.api,
      totalCalls: 0,
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      avgRevenue: 0,
      avgCost: 0,
      avgProfit: 0
    };

    apiStat.totalCalls++;
    apiStat.totalRevenue += transaction.revenue;
    apiStat.totalCost += transaction.cost;
    apiStat.totalProfit += transaction.profit;
    apiStat.avgRevenue = apiStat.totalRevenue / apiStat.totalCalls;
    apiStat.avgCost = apiStat.totalCost / apiStat.totalCalls;
    apiStat.avgProfit = apiStat.totalProfit / apiStat.totalCalls;

    this.apiStats.set(transaction.api, apiStat);

    // Update payer stats
    const payerStat = this.payerStats.get(transaction.payer) || {
      volume: 0,
      count: 0
    };

    payerStat.volume += transaction.revenue;
    payerStat.count++;

    this.payerStats.set(transaction.payer, payerStat);
  }

  /**
   * Get gateway statistics
   */
  async getStats(): Promise<GatewayStats> {
    const totalTransactions = this.transactions.length;
    const totalRevenue = this.transactions.reduce((sum, t) => sum + t.revenue, 0);
    const totalCost = this.transactions.reduce((sum, t) => sum + t.cost, 0);
    const totalProfit = this.transactions.reduce((sum, t) => sum + t.profit, 0);
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const apiBreakdown = Array.from(this.apiStats.values());

    const topPayers = Array.from(this.payerStats.entries())
      .map(([address, stats]) => ({
        address,
        volume: stats.volume,
        count: stats.count
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);

    return {
      totalTransactions,
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
      apiBreakdown,
      topPayers
    };
  }

  /**
   * Get stats for specific API
   */
  async getAPIStats(apiName: string): Promise<APIStats | null> {
    return this.apiStats.get(apiName) || null;
  }

  /**
   * Get recent transactions
   */
  getRecentTransactions(limit: number = 10): Transaction[] {
    return this.transactions.slice(-limit).reverse();
  }

  /**
   * Export all data (for backup/analysis)
   */
  exportData() {
    return {
      transactions: this.transactions,
      apiStats: Array.from(this.apiStats.entries()),
      payerStats: Array.from(this.payerStats.entries()),
      exportedAt: Date.now()
    };
  }

  /**
   * Clear all data (use with caution)
   */
  clear(): void {
    this.transactions = [];
    this.apiStats.clear();
    this.payerStats.clear();
  }
}
