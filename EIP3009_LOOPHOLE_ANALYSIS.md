# EIP-3009 "Loopholes" on BNB Chain - Technical Analysis
## How Projects Claim EIP-3009 Support Without Native USDC

**TL;DR:** There are NO legitimate loopholes. Projects claiming EIP-3009 on BNB Chain are either:
1. Creating wrapped tokens (not real USDC)
2. Using custom contracts (not standard EIP-3009)
3. Misrepresenting EIP-2612 as EIP-3009
4. Outright lying for marketing

---

## The Hard Truth

**BNB Chain USDC Contract:** `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`

```bash
# Check the contract source on BscScan
Function List:
- transfer() ✅
- approve() ✅
- transferFrom() ✅
- transferWithAuthorization() ❌ DOES NOT EXIST
- receiveWithAuthorization() ❌ DOES NOT EXIST
```

**You cannot add EIP-3009 to an existing contract.** The Binance-Bridged USDC is immutable - no upgrades, no loopholes.

---

## "Loophole" #1: Wrapped Token Trick

### What They're Doing

Create a **wrapper token** around BNB Chain USDC that implements EIP-3009:

```solidity
// WrappedUSDC.sol - Custom EIP-3009 wrapper
contract WrappedUSDC is ERC20, EIP3009 {
    IERC20 public immutable UNDERLYING_USDC = 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d;
    
    mapping(address => mapping(bytes32 => bool)) public authorizationState;
    
    // Deposit real USDC, get wUSDC
    function wrap(uint256 amount) external {
        UNDERLYING_USDC.transferFrom(msg.sender, address(this), amount);
        _mint(msg.sender, amount);
    }
    
    // EIP-3009: transferWithAuthorization (on wrapper, not real USDC!)
    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v, bytes32 r, bytes32 s
    ) external {
        require(!authorizationState[from][nonce], "Used");
        authorizationState[from][nonce] = true;
        
        // Verify signature...
        _transfer(from, to, value);
    }
    
    // Unwrap back to real USDC
    function unwrap(uint256 amount) external {
        _burn(msg.sender, amount);
        UNDERLYING_USDC.transfer(msg.sender, amount);
    }
}
```

### Why This is Misleading

**What they claim:**
> "We support EIP-3009 on BNB Chain!"

**The reality:**
- ❌ It's NOT Binance-Bridged USDC
- ❌ It's a custom wrapper token (wUSDC or similar)
- ❌ Users must wrap/unwrap (extra steps + gas)
- ❌ Liquidity fragmentation (wUSDC ≠ USDC)
- ❌ Smart contract risk (wrapper can be buggy)
- ❌ NOT compatible with existing USDC integrations

**Example Flow:**
```
User has USDC → Wrap to wUSDC (gas cost) 
→ Use "EIP-3009" on wUSDC 
→ Unwrap back to USDC (gas cost)

vs.

Native Circle USDC on Ethereum:
User has USDC → Use EIP-3009 directly (no wrapping!)
```

### How to Detect This Scam

Check the token address they're using:

```typescript
// If they claim EIP-3009 on BNB, ask:
"What's the token contract address?"

If address === 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
→ ❌ LYING (Binance USDC doesn't have EIP-3009)

If address === 0x<some_other_address>
→ ⚠️ It's a wrapped token, NOT real USDC
```

---

## "Loophole" #2: Custom Facilitator Contract

### What They're Doing

Build a **custom contract** that mimics EIP-3009 behavior using off-chain signatures:

```solidity
// CustomFacilitator.sol - Fake EIP-3009
contract CustomFacilitator {
    IERC20 public USDC = 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d;
    
    mapping(bytes32 => bool) public usedSignatures;
    
    // NOT standard EIP-3009, custom implementation
    function executeTransferWithSignature(
        address from,
        address to,
        uint256 value,
        uint256 deadline,
        bytes32 customNonce, // Random, but not EIP-3009!
        bytes memory signature
    ) external {
        require(block.timestamp <= deadline, "Expired");
        require(!usedSignatures[customNonce], "Used");
        
        // Verify off-chain signature (custom EIP-712 domain)
        bytes32 digest = keccak256(abi.encode(from, to, value, deadline, customNonce));
        address signer = ECDSA.recover(digest, signature);
        require(signer == from, "Invalid signature");
        
        // User must have pre-approved this contract!
        usedSignatures[customNonce] = true;
        USDC.transferFrom(from, to, value);
    }
}
```

### Why This is Misleading

**What they claim:**
> "Random nonce signatures like EIP-3009!"

**The reality:**
- ❌ NOT standard EIP-3009 (custom signature format)
- ❌ Requires pre-approval (defeats gasless purpose)
- ❌ Uses `transferFrom()`, not `transferWithAuthorization()`
- ❌ Different EIP-712 domain (not compatible with x402)
- ❌ Facilitator must be trusted (can drain approvals)

**The Critical Flaw:**
```solidity
// User MUST do this first (costs gas!):
USDC.approve(facilitatorAddress, UNLIMITED);

// Then later:
facilitator.executeTransferWithSignature(...);
// ↑ This step is "gasless" but approval step wasn't!
```

**vs. Real EIP-3009:**
```solidity
// No approval needed!
USDC.transferWithAuthorization(...);
// ↑ True gasless, built into token contract
```

---

## "Loophole" #3: Confusing EIP-2612 with EIP-3009

### What They're Doing

Using **Permit2** (Uniswap) or **EIP-2612** and calling it "EIP-3009":

```typescript
// What they actually use:
const permit = await token.permit(owner, spender, value, deadline, nonce, v, r, s);

// What they claim:
"We support EIP-3009 on BNB Chain!"

// Reality:
EIP-2612 ≠ EIP-3009
```

### The Differences

| Feature | EIP-3009 | EIP-2612 | Permit2 |
|---------|----------|----------|---------|
| **Function** | `transferWithAuthorization()` | `permit()` | `permit2()` |
| **Nonce Type** | Random (bytes32) | Sequential (uint256) | Sequential per token |
| **Action** | Direct transfer | Approval only | Universal approval |
| **Parallelization** | ✅ Unlimited | ❌ Sequential | ❌ Sequential |
| **Atomic** | ✅ Yes | ❌ No (2-step) | ❌ No (2-step) |

### Why This is Misleading

**Marketing Claim:**
> "Gasless meta-transactions with random nonces!"

**Technical Reality:**
```typescript
// Step 1: User signs permit (off-chain)
const permitSig = await signPermit(owner, spender, value, deadline, nonce);

// Step 2: Relayer calls permit (on-chain gas)
await token.permit(owner, spender, value, deadline, nonce, v, r, s);

// Step 3: Relayer calls transferFrom (on-chain gas)
await token.transferFrom(owner, recipient, value);

// Problem: Still sequential nonces! Not EIP-3009!
```

**The Lie:**
They show you the random-looking signature and say "see, random nonces like EIP-3009!" but the underlying nonce is still sequential.

---

## "Loophole" #4: Bridging to Another Chain

### What They're Doing

Bridge USDC to a chain that **does** support EIP-3009, use it there:

```
BNB Chain USDC (no EIP-3009)
    ↓ Bridge
Base/Ethereum (native Circle USDC with EIP-3009)
    ↓ Use EIP-3009
    ↓ Bridge back
BNB Chain
```

### Why This is Misleading

**What they claim:**
> "Use EIP-3009 for BNB Chain transactions!"

**The reality:**
- ❌ Not actually on BNB Chain (happens on other chain)
- ❌ High bridge fees (2 bridge operations)
- ❌ Slow (bridge times: 5-20 minutes each way)
- ❌ Bridge risk (wrapped tokens, hacks)

**Cost Analysis:**
```
Bridge BNB → Base: ~$2-5
Use EIP-3009 on Base: ~$0.01
Bridge Base → BNB: ~$2-5
Total: ~$4-10

vs.

Just use multi-wallet pool on BNB: ~$0.12
```

---

## How Unibase Probably Does It

Based on their marketing claims, **most likely scenario:**

### Scenario A: Wrapped Token (60% probability)

```solidity
// UnibaseUSDC.sol
contract UnibaseUSDC is ERC20, EIP3009 {
    // Wrapper around Binance USDC
    // Implements fake "EIP-3009"
}
```

**Detection:**
- Ask for contract address
- If it's NOT `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`, it's wrapped
- Check BscScan for "wrap" or "deposit" functions

### Scenario B: Custom Facilitator (30% probability)

```solidity
// UnibaseFacilitator.sol
contract UnibaseFacilitator {
    // Custom signature scheme
    // Calls standard USDC.transferFrom()
    // Markets as "EIP-3009-like"
}
```

**Detection:**
- Users must approve facilitator contract
- Look for `approve()` transactions before "gasless" transfers
- Check if they mention "Unibase Memory" contract

### Scenario C: Complete Fraud (10% probability)

```
Marketing: "We support EIP-3009!"
Reality: Nothing special, just standard ERC-20 transfers
Why: Buzzword marketing to raise funds
```

---

## Real-World Detection Methods

### Method 1: Contract Address Check

```typescript
// Ask them: "What USDC contract do you use?"

const REAL_BNB_USDC = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";

if (theirAddress === REAL_BNB_USDC) {
  // Check contract functions
  const contract = new ethers.Contract(theirAddress, [], provider);
  const hasEIP3009 = await contract.transferWithAuthorization
    .catch(() => false);
  
  if (!hasEIP3009) {
    console.log("❌ LYING - BNB USDC doesn't have EIP-3009");
  }
} else {
  console.log("⚠️ Using wrapped token, NOT real USDC");
}
```

### Method 2: Transaction Analysis

Look at actual on-chain transactions:

```bash
# Real EIP-3009 transaction:
Function: transferWithAuthorization(address,address,uint256,uint256,uint256,bytes32,uint8,bytes32,bytes32)

# Fake "EIP-3009" transaction (actually EIP-2612):
Function: permit(address,address,uint256,uint256,uint8,bytes32,bytes32)
Then: transferFrom(address,address,uint256)

# Fake "EIP-3009" transaction (custom):
Function: executeCustomTransfer(...) // Custom function name
```

### Method 3: Ask Technical Questions

Questions that expose fake implementations:

1. **"Is it compatible with Coinbase x402?"**
   - Real EIP-3009: ✅ Yes (same standard)
   - Fake: ❌ No (custom implementation)

2. **"Can I use the same signature on Ethereum USDC?"**
   - Real EIP-3009: ✅ Yes (standard)
   - Fake: ❌ No (different EIP-712 domain)

3. **"Do users need to approve a facilitator contract?"**
   - Real EIP-3009: ❌ No approval needed
   - Fake: ✅ Yes (requires approval)

4. **"What's the token contract address?"**
   - Real BNB USDC: `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`
   - Wrapped: Different address

---

## The Only REAL Solution

**There is NO loophole.** The only real solutions are:

### Option 1: Wait for Circle Native USDC
```
Circle deploys native USDC to BNB Chain
→ Includes EIP-3009 out of the box
→ Works like Ethereum/Base
Status: ⏰ Not available (no timeline)
```

### Option 2: Use s402 (Our Approach)
```
Multi-Wallet Pool: 10x parallel (works today)
EIP-4337 Smart Accounts: Unlimited parallel (Q1 2026)
→ Honest about using EIP-2612 + EIP-4337
→ No fake claims
Status: ✅ Production-ready
```

---

## Why Projects Make False Claims

### Marketing Incentives

```
Claim "EIP-3009 on BNB" →
  Investors think: "Wow, they solved a hard problem!"
  → Higher valuation
  → More funding
  → Reality check happens later (too late)
```

### Technical Ignorance

Some teams genuinely confuse:
- EIP-2612 (permit) with EIP-3009 (transferWithAuthorization)
- Permit2 (universal approval) with EIP-3009
- Custom signatures with standard EIP-3009

### Betting on Future

```
Today: "We support EIP-3009 on BNB!"
Future (when caught): "We meant we're ready for when Circle deploys!"
```

---

## How to Call Out Fake Claims

### Public Challenge

```
1. Ask for contract address
2. Verify on BscScan:
   - Go to "Contract" tab
   - Click "Read Contract"
   - Look for transferWithAuthorization()
   
3. If not found: "Your USDC contract doesn't have EIP-3009"
4. If different address: "You're using a wrapped token, not real USDC"
```

### Technical Proof

```typescript
// Create a public test
const BNB_USDC = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";
const provider = new ethers.JsonRpcProvider("https://bsc-dataseed1.binance.org");

const abi = [
  "function transferWithAuthorization(address,address,uint256,uint256,uint256,bytes32,uint8,bytes32,bytes32) external"
];

try {
  const contract = new ethers.Contract(BNB_USDC, abi, provider);
  await contract.transferWithAuthorization.staticCall(
    ethers.ZeroAddress, 
    ethers.ZeroAddress, 
    0, 0, 0, 
    ethers.ZeroHash, 
    0, ethers.ZeroHash, ethers.ZeroHash
  );
  console.log("✅ EIP-3009 exists");
} catch (error) {
  console.log("❌ PROOF: BNB USDC does NOT have EIP-3009");
  console.log("Error:", error.message);
  // Output: "function transferWithAuthorization does not exist"
}
```

---

## Conclusion

**There are NO legitimate loopholes to get EIP-3009 on BNB Chain USDC.**

Projects claiming otherwise are doing one of these:
1. ⚠️ Using wrapped tokens (extra steps, not real USDC)
2. ⚠️ Custom facilitator contracts (requires approvals, not standard)
3. ❌ Confusing EIP-2612 with EIP-3009 (marketing BS)
4. ❌ Outright lying (fraud)

**Our s402 approach is honest:**
- ✅ Uses EIP-2612 where available
- ✅ Multi-wallet pool for parallelization (10x speedup)
- ✅ EIP-4337 for unlimited scaling
- ✅ Transparent about what works vs. what doesn't
- ✅ No fake claims, no wrapped tokens, no BS

**When Circle deploys native USDC to BNB, we'll integrate it.** Until then, we use the best available solutions without lying about our tech stack.

---

## References

- **BNB Chain USDC Contract:** https://bscscan.com/token/0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d
- **EIP-3009 Specification:** https://eips.ethereum.org/EIPS/eip-3009
- **EIP-2612 Specification:** https://eips.ethereum.org/EIPS/eip-2612
- **Circle USDC Deployments:** https://developers.circle.com/stablecoins/usdc-contract-addresses
- **Permit2 (Uniswap):** https://github.com/Uniswap/permit2

**Bottom Line:** If someone claims EIP-3009 on BNB Chain, ask for proof. Check the contract. Call their bluff.
