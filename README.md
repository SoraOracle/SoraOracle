# Improved Oracle Smart Contract for BNB Chain

A decentralized oracle system where users can ask questions with BNB bounties, and an oracle provider answers them.

## Features

✅ **Security Enhancements**
- OpenZeppelin battle-tested contracts (Ownable, ReentrancyGuard, Pausable)
- Input validation for questions and answers
- Reentrancy protection on all state-changing functions
- Emergency pause functionality

✅ **Better User Experience**
- Minimum bounty requirement (configurable by owner)
- 7-day refund period for unanswered questions
- Detailed event logging for off-chain tracking
- View functions to query question details

✅ **Oracle Provider Features**
- Dedicated oracle provider address
- Balance tracking before withdrawal
- Clean withdrawal mechanism
- Provider address can be updated by owner

## Smart Contract Details

### Main Functions

**For Users:**
- `askOracle(string question)` - Ask a question with a BNB bounty (min 0.01 BNB)
- `getQuestion(uint256 questionId)` - View question details
- `refundUnansweredQuestion(uint256 questionId)` - Get refund after 7 days if unanswered

**For Oracle Provider:**
- `provideAnswer(uint256 questionId, string answer)` - Provide answer and earn bounty
- `withdraw()` - Withdraw earned bounties

**For Owner:**
- `setOracleProvider(address newProvider)` - Update oracle provider address
- `setMinimumBounty(uint256 newMinimum)` - Update minimum bounty requirement
- `pause()` / `unpause()` - Emergency controls

## Setup & Deployment

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create a `.env` file:
```env
PRIVATE_KEY=your_wallet_private_key
BSCSCAN_API_KEY=your_bscscan_api_key
ORACLE_PROVIDER_ADDRESS=your_oracle_provider_address
```

### 3. Get Testnet BNB
Visit: https://testnet.bnbchain.org/faucet-smart

### 4. Compile Contract
```bash
npx hardhat compile
```

### 5. Deploy to BSC Testnet
```bash
npx hardhat run scripts/deploy.js --network bscTestnet
```

### 6. Verify on BscScan (Optional)
```bash
npx hardhat verify --network bscTestnet <CONTRACT_ADDRESS> <ORACLE_PROVIDER_ADDRESS>
```

## Usage Examples

### Ask a Question
```bash
npx hardhat run scripts/interact.js <CONTRACT_ADDRESS> --network bscTestnet
```

### Provide an Answer (as Oracle Provider)
```bash
npx hardhat run scripts/answer.js <CONTRACT_ADDRESS> <QUESTION_ID> "Your answer" --network bscTestnet
```

### Withdraw Earnings (as Oracle Provider)
```bash
npx hardhat run scripts/withdraw.js <CONTRACT_ADDRESS> --network bscTestnet
```

## Network Information

**BSC Testnet:**
- RPC: https://data-seed-prebsc-1-s1.binance.org:8545
- Chain ID: 97
- Explorer: https://testnet.bscscan.com
- Faucet: https://testnet.bnbchain.org/faucet-smart

**BSC Mainnet:**
- RPC: https://bsc-dataseed.binance.org/
- Chain ID: 56
- Explorer: https://bscscan.com

## Security Features

1. **ReentrancyGuard** - Prevents reentrancy attacks on withdrawal functions
2. **Ownable** - Restricts admin functions to contract owner
3. **Pausable** - Allows emergency pause of contract operations
4. **Input Validation** - Validates question/answer length and bounty amounts
5. **Access Control** - Only oracle provider can answer questions
6. **Refund Mechanism** - Users can reclaim bounty after 7 days if unanswered

## Cost Estimation

**Deployment:** ~0.002-0.01 BNB (~$2-10 USD)
**Ask Question:** ~0.0001 BNB + bounty (~$0.10 + bounty)
**Provide Answer:** ~0.0002 BNB (~$0.20)
**Withdraw:** ~0.0001 BNB (~$0.10)

## Improvements Over Original Contract

1. ✅ Added proper access control with OpenZeppelin contracts
2. ✅ Implemented reentrancy protection
3. ✅ Added emergency pause functionality
4. ✅ Input validation for questions and answers
5. ✅ Refund mechanism for unanswered questions
6. ✅ Better event logging for transparency
7. ✅ Configurable minimum bounty
8. ✅ Clean separation of provider balance tracking
9. ✅ View functions for easy data retrieval
10. ✅ Comprehensive error messages

## License

MIT
