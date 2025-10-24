export interface Market {
  id: string;
  address: string;
  question: string;
  category: string;
  deadline: number;
  description?: string;
  creator?: string;
  creatorName?: string;
  createdAt?: number;
  totalYes: string | bigint;
  totalNo: string | bigint;
  totalPool?: bigint;
  resolved: boolean;
  winningOutcome?: boolean;
  initialLiquidity?: string;
  yesOdds?: number;
  noOdds?: number;
  traders?: number;
  source?: string;
}

export interface UserPosition {
  marketId: string;
  outcome: boolean;
  amount: string;
  timestamp: number;
}

const MARKETS_KEY = 'sora_markets';
const POSITIONS_KEY = 'sora_positions';

export class MarketService {
  static getMarkets(): Market[] {
    const data = localStorage.getItem(MARKETS_KEY);
    return data ? JSON.parse(data) : [];
  }

  static getMarket(id: string): Market | null {
    const markets = this.getMarkets();
    return markets.find(m => m.id === id || m.address === id) || null;
  }

  static createMarket(market: Market): void {
    const markets = this.getMarkets();
    markets.push(market);
    localStorage.setItem(MARKETS_KEY, JSON.stringify(markets));
  }

  static placeBet(marketId: string, userAddress: string, outcome: boolean, amount: string): void {
    const markets = this.getMarkets();
    const market = markets.find(m => m.id === marketId);
    if (!market) throw new Error('Market not found');

    const currentYes = typeof market.totalYes === 'bigint' ? Number(market.totalYes) / 1e18 : parseFloat(market.totalYes.toString());
    const currentNo = typeof market.totalNo === 'bigint' ? Number(market.totalNo) / 1e18 : parseFloat(market.totalNo.toString());
    const betAmount = parseFloat(amount);
    
    if (outcome) {
      market.totalYes = (currentYes + betAmount).toString();
    } else {
      market.totalNo = (currentNo + betAmount).toString();
    }

    localStorage.setItem(MARKETS_KEY, JSON.stringify(markets));

    const positions = this.getUserPositions(userAddress);
    positions.push({
      marketId,
      outcome,
      amount,
      timestamp: Date.now()
    });
    localStorage.setItem(`${POSITIONS_KEY}_${userAddress.toLowerCase()}`, JSON.stringify(positions));
  }

  static getUserPositions(userAddress: string): UserPosition[] {
    const data = localStorage.getItem(`${POSITIONS_KEY}_${userAddress.toLowerCase()}`);
    return data ? JSON.parse(data) : [];
  }

  static resolveMarket(marketId: string, winningOutcome: boolean): void {
    const markets = this.getMarkets();
    const market = markets.find(m => m.id === marketId);
    if (!market) throw new Error('Market not found');

    market.resolved = true;
    market.winningOutcome = winningOutcome;
    localStorage.setItem(MARKETS_KEY, JSON.stringify(markets));
  }

  static calculateOdds(market: Market): { yes: number; no: number } {
    const yesAmount = typeof market.totalYes === 'bigint' ? Number(market.totalYes) : parseFloat(market.totalYes as string) || 0;
    const noAmount = typeof market.totalNo === 'bigint' ? Number(market.totalNo) : parseFloat(market.totalNo as string) || 0;
    const total = yesAmount + noAmount;

    if (total === 0) {
      return { yes: 50, no: 50 };
    }

    return {
      yes: (yesAmount / total) * 100,
      no: (noAmount / total) * 100
    };
  }

  static calculateWinnings(position: UserPosition, market: Market): string {
    if (!market.resolved || market.winningOutcome !== position.outcome) {
      return '0';
    }

    const totalYes = typeof market.totalYes === 'bigint' ? Number(market.totalYes) / 1e18 : parseFloat(market.totalYes.toString());
    const totalNo = typeof market.totalNo === 'bigint' ? Number(market.totalNo) / 1e18 : parseFloat(market.totalNo.toString());
    const totalPool = totalYes + totalNo;
    const winningPool = position.outcome ? totalYes : totalNo;
    const positionAmount = parseFloat(position.amount);

    const winnings = (positionAmount / winningPool) * totalPool;
    return winnings.toFixed(6);
  }
}
