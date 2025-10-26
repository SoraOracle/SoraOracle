# Sora Oracle - Disclaimer & Legal Notice

**Last Updated:** October 26, 2025

---

## 🎯 **Purpose & Scope**

**Sora Oracle** is a permissionless oracle SDK for prediction markets on BNB Chain. It provides:
- Manipulation-resistant TWAP oracles
- AI-powered market settlement
- x402 micropayment infrastructure
- Self-expanding research capabilities

This project is **open source** (MIT License) and built for educational, research, and production use.

---

## 🔬 **x402 Protocol Implementation**

### **BNB Chain Compatibility**

Sora Oracle implements the x402 protocol on BNB Chain using **EIP-2612 Permit** signatures.

The x402 protocol enables **gasless micropayments** through cryptographic signatures,
eliminating the need for users to hold BNB for transaction fees when interacting with
oracle services.

### **Protocol Benefits**

- **Gasless Payments:** No BNB needed for oracle data access
- **Cryptographic Security:** All payments verified via EIP-2612 Permit signatures
- **Transparent Settlement:** On-chain USDC transfers tracked on BSCScan
- **Permissionless:** Anyone can deploy markets and oracles

### **Security & Trust**

All payments are cryptographically verified using EIP-2612 Permit signatures. The facilitator
contract handles settlement securely and transparently on-chain. Users maintain full custody
of their funds until signatures are submitted.

---

## ⚠️ **Smart Contract Risk Disclaimer**

### **Use at Your Own Risk**

Smart contracts involve inherent risks:

- **Smart Contract Bugs:** Contracts may contain vulnerabilities
- **Network Risk:** BNB Chain network issues may affect operations  
- **Oracle Risk:** Oracle data may be delayed, incorrect, or manipulated
- **Market Risk:** Prediction markets are highly speculative
- **Loss Risk:** You may lose some or all of your funds

### **No Warranties**

Sora Oracle is provided **"as is"** without warranties of any kind, express or implied.
The developers make no guarantees about:

- Accuracy of oracle data
- Availability of services
- Profitability of markets
- Security of smart contracts
- Correctness of AI-powered settlements

### **Audit Status**

**⚠️ Important:** These smart contracts have **not been audited** by a third-party security firm.
Use in production at your own risk. We recommend:

- Start with small amounts
- Test thoroughly on testnet
- Review all contract code
- Understand the risks before deploying

---

## 💰 **Financial & Investment Disclaimer**

### **Not Financial Advice**

Nothing in this documentation constitutes:
- Financial advice
- Investment recommendations  
- Legal or tax advice
- Professional consultation

### **Cryptocurrency Risks**

Cryptocurrency and prediction markets involve significant risks:

- **Volatility:** Crypto prices are extremely volatile
- **Regulatory Risk:** Regulations may change without notice
- **Jurisdictional Risk:** May be illegal in your jurisdiction
- **Market Risk:** Prediction markets are speculative
- **Total Loss:** You may lose your entire investment

**Only invest what you can afford to lose.**

### **Prediction Market Regulations**

Prediction markets may be subject to gambling, securities, or commodities regulations
depending on your jurisdiction. **You are responsible** for ensuring your use complies
with local laws.

Consult legal counsel before:
- Creating prediction markets
- Trading on markets
- Deploying to production
- Accepting payments from users

---

## 🤖 **AI Oracle Disclaimer**

### **AI-Powered Settlement**

Sora Oracle uses **GPT-4** for automated market settlement through:
- Multi-source data aggregation
- Statistical consensus algorithms
- Confidence-based decision making

### **AI Limitations**

AI models have limitations:
- **Not Perfect:** May make incorrect determinations
- **Data Dependent:** Quality depends on data source reliability
- **Confidence Thresholds:** Low-confidence results require manual review
- **Bias Risk:** May inherit biases from training data or data sources

**Important:** Markets with AI confidence below 85% should be manually reviewed
before settlement to ensure accuracy.

### **Statistical Consensus**

The permissionless oracle uses statistical outlier detection (Median Absolute Deviation)
to achieve consensus across multiple data sources. While mathematically robust, it is
**not foolproof** and may fail if:

- Majority of data sources are compromised
- Market manipulation exceeds statistical thresholds
- Data sources have systematic biases
- Black swan events occur

---

## 📜 **Open Source License**

Sora Oracle is licensed under the **MIT License**:

```
Copyright (c) 2025 Sora Oracle

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🔒 **Privacy & Data**

### **On-Chain Data**

All transactions are permanently recorded on BNB Chain:
- Market creation
- Bet placements
- Oracle answers
- x402 payments
- Settlement results

**This data is public and immutable.**

### **Off-Chain Data**

The gateway and AI agents may process:
- API requests
- External API responses
- AI model queries
- Payment metadata

This data is **not stored permanently** but may be logged for debugging and analytics.

### **Third-Party APIs**

External data sources (CoinGecko, OpenWeather, NewsAPI, etc.) have their own privacy
policies and terms of service. By using Sora Oracle, you acknowledge that data may be
sent to these third parties.

---

## 🌐 **Jurisdiction & Compliance**

### **Your Responsibility**

**You are solely responsible** for:
- Complying with local laws and regulations
- Obtaining necessary licenses or permits
- Paying applicable taxes
- Understanding legal risks in your jurisdiction

### **Restricted Jurisdictions**

Prediction markets may be restricted or illegal in certain jurisdictions. It is **your
responsibility** to ensure compliance with local laws before using Sora Oracle.

Consult local legal counsel if uncertain.

---

## 🛠️ **Technical Implementation Disclaimer**

### **Development Status**

Sora Oracle is under active development:
- **Features may change** without notice
- **APIs may break** between versions
- **Documentation may lag** behind code
- **Breaking changes** may occur

### **Production Use**

Before deploying to production:

1. ✅ **Audit contracts** (or hire third-party auditors)
2. ✅ **Test extensively** on testnet
3. ✅ **Review all code** for security issues
4. ✅ **Understand risks** fully
5. ✅ **Start small** and scale gradually
6. ✅ **Monitor continuously** for issues

### **Bug Reporting**

Found a bug or security vulnerability?

- **Critical bugs:** Contact soraoracle@proton.me immediately
- **Non-critical bugs:** Open GitHub issue
- **Feature requests:** Open GitHub discussion

**Security Disclosure:** Please report security vulnerabilities privately first
to allow time for fixes before public disclosure.

---

## 📞 **Contact & Support**

**Email:** soraoracle@proton.me  
**GitHub:** [Sora Oracle SDK](https://github.com/soraoracle/sdk)  
**License:** MIT  
**Network:** BNB Chain (Mainnet & Testnet)

---

## ✅ **Acknowledgments**

Sora Oracle builds upon:
- **x402 Protocol** (Coinbase) - Gasless payment infrastructure
- **OpenZeppelin** - Battle-tested smart contract libraries
- **OpenAI GPT-4** - AI-powered oracle settlement
- **BNB Chain** - Fast, low-cost blockchain infrastructure

---

## 📋 **Summary**

By using Sora Oracle, you acknowledge:

- ✅ You understand the risks involved
- ✅ You accept full responsibility for your use
- ✅ You will comply with local laws
- ✅ You will not hold developers liable for losses
- ✅ You understand this is experimental software
- ✅ You will conduct your own research (DYOR)

**Use responsibly. Build permissionlessly. Trade carefully.**

---

**Sora Oracle - Permissionless Oracle Infrastructure for BNB Chain** 🚀
