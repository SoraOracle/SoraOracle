# Sora Oracle SDK

TypeScript SDK for interacting with Sora Oracle smart contracts on BNB Chain.

## Installation

```bash
npm install @sora-oracle/sdk ethers@^6
```

## Quick Start

### Basic Usage

```typescript
import { SoraOracleClient, AnswerType } from '@sora-oracle/sdk';
import { BrowserProvider } from 'ethers';

const config = {
  soraOracleAddress: '0x5058AC254e560E54BfcabBe1bde4375E7C914d35',
  pancakeTWAPOracleAddress: '0x...',
  rpcUrl: 'https://bsc-dataseed.binance.org/',
  chainId: 56
};

const provider = new BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

const oracle = new SoraOracleClient(config, signer);

// Ask a question
const questionId = await oracle.askGeneralQuestion('What is the price of BTC?');

// Get question details
const question = await oracle.getQuestion(questionId);
```

### React Hooks

```typescript
import { useSoraOracle, useOracleQuestion, usePredictionMarket } from '@sora-oracle/sdk/hooks';
import { useWallet } from '@sora-oracle/sdk/hooks';

function MyComponent() {
  const { connect, address, provider } = useWallet();
  const { oracleClient, marketClient } = useSoraOracle(config, provider);
  const { question, askQuestion } = useOracleQuestion(oracleClient);
  const { market, bet } = usePredictionMarket(marketClient, marketId, address);

  return (
    <div>
      <button onClick={connect}>Connect Wallet</button>
      <button onClick={() => askQuestion('Will BTC hit $100k?', AnswerType.YES_NO)}>
        Ask Question
      </button>
      <button onClick={() => bet(true, parseEther('0.1'))}>
        Bet Yes
      </button>
    </div>
  );
}
```

## Features

- ✅ Full TypeScript support with type definitions
- ✅ React hooks for easy integration
- ✅ Automatic event listening and parsing
- ✅ Batch operations support
- ✅ Prediction market integration
- ✅ Wallet management utilities
- ✅ Error handling with retries

## API Reference

### SoraOracleClient

- `askGeneralQuestion(question: string): Promise<string>`
- `askYesNoQuestion(question: string): Promise<string>`
- `getQuestion(questionId: string): Promise<QuestionWithAnswer>`
- `provideAnswer(...): Promise<void>`
- `withdraw(): Promise<void>`
- `onQuestionAsked(callback): void`
- `onAnswerProvided(callback): void`

### BatchOperationsClient

- `batchAskQuestions(requests: BatchQuestionRequest[]): Promise<string[]>`
- `batchProvideAnswers(answers: BatchAnswerRequest[]): Promise<void>`
- `batchCheckStatus(questionIds: string[]): Promise<boolean[]>`

### PredictionMarketClient

- `createMarket(questionId, question, deadline): Promise<string>`
- `takePosition(marketId, isYes, amount): Promise<void>`
- `claimWinnings(marketId): Promise<void>`
- `getMarket(marketId, userAddress?): Promise<PredictionMarket>`

## License

MIT
