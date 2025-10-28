const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("S402Facilitator", function () {
  let facilitator, usdc;
  let owner, user1, user2, recipient, attacker;
  
  const USDC_AMOUNT = ethers.parseUnits("100", 6); // 100 USDC (6 decimals)
  const PAYMENT_AMOUNT = ethers.parseUnits("10", 6); // 10 USDC
  const PLATFORM_FEE_BPS = 100; // 1%
  
  beforeEach(async function () {
    [owner, user1, user2, recipient, attacker] = await ethers.getSigners();
    
    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    
    // Deploy S402Facilitator
    const S402Facilitator = await ethers.getContractFactory("S402Facilitator");
    facilitator = await S402Facilitator.deploy(await usdc.getAddress());
    await facilitator.waitForDeployment();
    
    // Mint USDC to test users
    await usdc.mint(user1.address, USDC_AMOUNT);
    await usdc.mint(user2.address, USDC_AMOUNT);
  });
  
  // Helper function to get current timestamp + offset
  function getDeadline(offset = 3600) {
    return Math.floor(Date.now() / 1000) + offset;
  }
  
  // Helper function to generate random nonce
  function generateNonce() {
    return ethers.hexlify(ethers.randomBytes(32));
  }
  
  // Helper to create EIP-2612 permit signature
  async function createPermitSignature(
    token,
    owner,
    spender,
    value,
    deadline
  ) {
    const nonce = await token.nonces(owner.address);
    const domain = {
      name: "Mock USDC",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await token.getAddress()
    };
    
    const types = {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" }
      ]
    };
    
    const message = {
      owner: owner.address,
      spender: spender,
      value: value,
      nonce: nonce,
      deadline: deadline
    };
    
    const signature = await owner.signTypedData(domain, types, message);
    return ethers.Signature.from(signature);
  }
  
  // Helper to create payment authorization signature
  async function createAuthSignature(
    facilitatorAddress,
    signer,
    owner,
    value,
    deadline,
    recipientAddr,
    nonce
  ) {
    const domain = {
      name: "S402Facilitator",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: facilitatorAddress
    };
    
    const types = {
      PaymentAuthorization: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "deadline", type: "uint256" },
        { name: "recipient", type: "address" },
        { name: "nonce", type: "bytes32" }
      ]
    };
    
    const message = {
      owner: owner,
      spender: facilitatorAddress,
      value: value,
      deadline: deadline,
      recipient: recipientAddr,
      nonce: nonce
    };
    
    const signature = await signer.signTypedData(domain, types, message);
    return ethers.Signature.from(signature);
  }
  
  describe("Deployment", function () {
    it("Should set the correct USDC address", async function () {
      expect(await facilitator.usdc()).to.equal(await usdc.getAddress());
    });
    
    it("Should set the correct platform fee", async function () {
      expect(await facilitator.platformFeeBps()).to.equal(PLATFORM_FEE_BPS);
    });
    
    it("Should set owner correctly", async function () {
      expect(await facilitator.owner()).to.equal(owner.address);
    });
    
    it("Should initialize with zero accumulated fees", async function () {
      expect(await facilitator.accumulatedFees()).to.equal(0);
    });
    
    it("Should reject zero address for USDC", async function () {
      const S402Facilitator = await ethers.getContractFactory("S402Facilitator");
      await expect(
        S402Facilitator.deploy(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid USDC address");
    });
  });
  
  describe("Payment Settlement", function () {
    it("Should settle payment with valid permit and auth signatures", async function () {
      const deadline = getDeadline();
      const nonce = generateNonce();
      const facilitatorAddr = await facilitator.getAddress();
      
      // Create permit signature for USDC approval
      const permitSig = await createPermitSignature(
        usdc,
        user1,
        facilitatorAddr,
        PAYMENT_AMOUNT,
        deadline
      );
      
      // Create authorization signature
      const authSig = await createAuthSignature(
        facilitatorAddr,
        user1,
        user1.address,
        PAYMENT_AMOUNT,
        deadline,
        recipient.address,
        nonce
      );
      
      const payment = {
        owner: user1.address,
        value: PAYMENT_AMOUNT,
        deadline: deadline,
        recipient: recipient.address,
        nonce: nonce
      };
      
      const permitSigStruct = {
        v: permitSig.v,
        r: permitSig.r,
        s: permitSig.s
      };
      
      const authSigStruct = {
        v: authSig.v,
        r: authSig.r,
        s: authSig.s
      };
      
      // Check initial balances
      const initialRecipientBalance = await usdc.balanceOf(recipient.address);
      
      // Settle payment
      await expect(
        facilitator.settlePaymentWithPermit(payment, permitSigStruct, authSigStruct)
      ).to.emit(facilitator, "PaymentSettled");
      
      // Calculate expected amounts
      const expectedFee = (PAYMENT_AMOUNT * BigInt(PLATFORM_FEE_BPS)) / BigInt(10000);
      const expectedRecipientAmount = PAYMENT_AMOUNT - expectedFee;
      
      // Check balances
      expect(await usdc.balanceOf(recipient.address)).to.equal(
        initialRecipientBalance + expectedRecipientAmount
      );
      expect(await facilitator.accumulatedFees()).to.equal(expectedFee);
      
      // Check stats
      expect(await facilitator.totalPaid(user1.address)).to.equal(PAYMENT_AMOUNT);
      expect(await facilitator.totalReceived(recipient.address)).to.equal(expectedRecipientAmount);
    });
    
    it("Should reject payment with expired deadline", async function () {
      const deadline = Math.floor(Date.now() / 1000) - 1000; // Past deadline
      const nonce = generateNonce();
      const facilitatorAddr = await facilitator.getAddress();
      
      const payment = {
        owner: user1.address,
        value: PAYMENT_AMOUNT,
        deadline: deadline,
        recipient: recipient.address,
        nonce: nonce
      };
      
      const emptySig = { v: 27, r: ethers.ZeroHash, s: ethers.ZeroHash };
      
      await expect(
        facilitator.settlePaymentWithPermit(payment, emptySig, emptySig)
      ).to.be.revertedWith("Invalid params");
    });
    
    it("Should reject payment with zero value", async function () {
      const deadline = getDeadline();
      const nonce = generateNonce();
      
      const payment = {
        owner: user1.address,
        value: 0,
        deadline: deadline,
        recipient: recipient.address,
        nonce: nonce
      };
      
      const emptySig = { v: 27, r: ethers.ZeroHash, s: ethers.ZeroHash };
      
      await expect(
        facilitator.settlePaymentWithPermit(payment, emptySig, emptySig)
      ).to.be.revertedWith("Invalid params");
    });
    
    it("Should reject payment with zero address owner", async function () {
      const deadline = getDeadline();
      const nonce = generateNonce();
      
      const payment = {
        owner: ethers.ZeroAddress,
        value: PAYMENT_AMOUNT,
        deadline: deadline,
        recipient: recipient.address,
        nonce: nonce
      };
      
      const emptySig = { v: 27, r: ethers.ZeroHash, s: ethers.ZeroHash };
      
      await expect(
        facilitator.settlePaymentWithPermit(payment, emptySig, emptySig)
      ).to.be.revertedWith("Invalid address");
    });
    
    it("Should reject payment with zero address recipient", async function () {
      const deadline = getDeadline();
      const nonce = generateNonce();
      
      const payment = {
        owner: user1.address,
        value: PAYMENT_AMOUNT,
        deadline: deadline,
        recipient: ethers.ZeroAddress,
        nonce: nonce
      };
      
      const emptySig = { v: 27, r: ethers.ZeroHash, s: ethers.ZeroHash };
      
      await expect(
        facilitator.settlePaymentWithPermit(payment, emptySig, emptySig)
      ).to.be.revertedWith("Invalid address");
    });
  });
  
  describe("Authorization Verification", function () {
    it("Should reject payment with invalid authorization signature", async function () {
      const deadline = getDeadline();
      const nonce = generateNonce();
      const facilitatorAddr = await facilitator.getAddress();
      
      const permitSig = await createPermitSignature(
        usdc,
        user1,
        facilitatorAddr,
        PAYMENT_AMOUNT,
        deadline
      );
      
      // Create auth signature from wrong signer (attacker instead of user1)
      const wrongAuthSig = await createAuthSignature(
        facilitatorAddr,
        attacker, // Wrong signer!
        user1.address,
        PAYMENT_AMOUNT,
        deadline,
        recipient.address,
        nonce
      );
      
      const payment = {
        owner: user1.address,
        value: PAYMENT_AMOUNT,
        deadline: deadline,
        recipient: recipient.address,
        nonce: nonce
      };
      
      await expect(
        facilitator.settlePaymentWithPermit(
          payment,
          { v: permitSig.v, r: permitSig.r, s: permitSig.s },
          { v: wrongAuthSig.v, r: wrongAuthSig.r, s: wrongAuthSig.s }
        )
      ).to.be.revertedWith("Bad sig");
    });
    
    it("Should prevent recipient front-running attack", async function () {
      const deadline = getDeadline();
      const nonce = generateNonce();
      const facilitatorAddr = await facilitator.getAddress();
      
      const permitSig = await createPermitSignature(
        usdc,
        user1,
        facilitatorAddr,
        PAYMENT_AMOUNT,
        deadline
      );
      
      // User1 signs for legitimate recipient
      const authSig = await createAuthSignature(
        facilitatorAddr,
        user1,
        user1.address,
        PAYMENT_AMOUNT,
        deadline,
        recipient.address, // Legitimate recipient
        nonce
      );
      
      // Attacker tries to change recipient
      const payment = {
        owner: user1.address,
        value: PAYMENT_AMOUNT,
        deadline: deadline,
        recipient: attacker.address, // Changed to attacker!
        nonce: nonce
      };
      
      await expect(
        facilitator.settlePaymentWithPermit(
          payment,
          { v: permitSig.v, r: permitSig.r, s: permitSig.s },
          { v: authSig.v, r: authSig.r, s: authSig.s }
        )
      ).to.be.revertedWith("Bad sig");
    });
  });
  
  describe("Replay Attack Prevention", function () {
    it("Should prevent replay of same payment", async function () {
      const deadline = getDeadline();
      const nonce = generateNonce();
      const facilitatorAddr = await facilitator.getAddress();
      
      const permitSig = await createPermitSignature(
        usdc,
        user1,
        facilitatorAddr,
        PAYMENT_AMOUNT,
        deadline
      );
      
      const authSig = await createAuthSignature(
        facilitatorAddr,
        user1,
        user1.address,
        PAYMENT_AMOUNT,
        deadline,
        recipient.address,
        nonce
      );
      
      const payment = {
        owner: user1.address,
        value: PAYMENT_AMOUNT,
        deadline: deadline,
        recipient: recipient.address,
        nonce: nonce
      };
      
      const sigStructs = {
        permit: { v: permitSig.v, r: permitSig.r, s: permitSig.s },
        auth: { v: authSig.v, r: authSig.r, s: authSig.s }
      };
      
      // First payment should succeed
      await facilitator.settlePaymentWithPermit(payment, sigStructs.permit, sigStructs.auth);
      
      // Second payment with same nonce should fail
      await expect(
        facilitator.settlePaymentWithPermit(payment, sigStructs.permit, sigStructs.auth)
      ).to.be.revertedWith("Payment used");
    });
    
    it("Should track payment usage correctly", async function () {
      const deadline = getDeadline();
      const nonce = generateNonce();
      
      // Check payment is not used initially
      expect(
        await facilitator.isPaymentUsed(
          user1.address,
          recipient.address,
          PAYMENT_AMOUNT,
          deadline,
          nonce
        )
      ).to.be.false;
      
      const facilitatorAddr = await facilitator.getAddress();
      const permitSig = await createPermitSignature(usdc, user1, facilitatorAddr, PAYMENT_AMOUNT, deadline);
      const authSig = await createAuthSignature(facilitatorAddr, user1, user1.address, PAYMENT_AMOUNT, deadline, recipient.address, nonce);
      
      const payment = {
        owner: user1.address,
        value: PAYMENT_AMOUNT,
        deadline: deadline,
        recipient: recipient.address,
        nonce: nonce
      };
      
      await facilitator.settlePaymentWithPermit(
        payment,
        { v: permitSig.v, r: permitSig.r, s: permitSig.s },
        { v: authSig.v, r: authSig.r, s: authSig.s }
      );
      
      // Check payment is now used
      expect(
        await facilitator.isPaymentUsed(
          user1.address,
          recipient.address,
          PAYMENT_AMOUNT,
          deadline,
          nonce
        )
      ).to.be.true;
    });
  });
  
  describe("Batch Payments", function () {
    it("Should process multiple payments in batch", async function () {
      const deadline = getDeadline();
      const facilitatorAddr = await facilitator.getAddress();
      
      // Use 2 different payers to avoid nonce conflicts (EIP-2612 uses sequential nonces)
      const payers = [user1, user2];
      
      const payments = [];
      const permitSigs = [];
      const authSigs = [];
      
      // Create 2 payments from different users
      for (let i = 0; i < 2; i++) {
        const payer = payers[i];
        const nonce = generateNonce();
        const amount = ethers.parseUnits("5", 6); // 5 USDC each
        
        const permitSig = await createPermitSignature(usdc, payer, facilitatorAddr, amount, deadline);
        const authSig = await createAuthSignature(facilitatorAddr, payer, payer.address, amount, deadline, recipient.address, nonce);
        
        payments.push({
          owner: payer.address,
          value: amount,
          deadline: deadline,
          recipient: recipient.address,
          nonce: nonce
        });
        
        permitSigs.push({ v: permitSig.v, r: permitSig.r, s: permitSig.s });
        authSigs.push({ v: authSig.v, r: authSig.r, s: authSig.s });
      }
      
      const initialBalance = await usdc.balanceOf(recipient.address);
      
      await facilitator.batchSettlePayments(payments, permitSigs, authSigs);
      
      // Total should be 5 + 5 = 10 USDC minus fees
      const totalPaid = ethers.parseUnits("10", 6);
      const totalFee = (totalPaid * BigInt(PLATFORM_FEE_BPS)) / BigInt(10000);
      const expectedRecipientAmount = totalPaid - totalFee;
      
      expect(await usdc.balanceOf(recipient.address)).to.equal(
        initialBalance + expectedRecipientAmount
      );
    });
    
    it("Should reject batch with mismatched array lengths", async function () {
      const deadline = getDeadline();
      const nonce = generateNonce();
      
      const payment = {
        owner: user1.address,
        value: PAYMENT_AMOUNT,
        deadline: deadline,
        recipient: recipient.address,
        nonce: nonce
      };
      
      const emptySig = { v: 27, r: ethers.ZeroHash, s: ethers.ZeroHash };
      
      await expect(
        facilitator.batchSettlePayments(
          [payment],
          [emptySig, emptySig], // Wrong length
          [emptySig]
        )
      ).to.be.revertedWith("Length mismatch");
    });
  });
  
  describe("Platform Fee Management", function () {
    it("Should calculate fees correctly", async function () {
      const deadline = getDeadline();
      const nonce = generateNonce();
      const facilitatorAddr = await facilitator.getAddress();
      
      const permitSig = await createPermitSignature(usdc, user1, facilitatorAddr, PAYMENT_AMOUNT, deadline);
      const authSig = await createAuthSignature(facilitatorAddr, user1, user1.address, PAYMENT_AMOUNT, deadline, recipient.address, nonce);
      
      const payment = {
        owner: user1.address,
        value: PAYMENT_AMOUNT,
        deadline: deadline,
        recipient: recipient.address,
        nonce: nonce
      };
      
      await facilitator.settlePaymentWithPermit(
        payment,
        { v: permitSig.v, r: permitSig.r, s: permitSig.s },
        { v: authSig.v, r: authSig.r, s: authSig.s }
      );
      
      const expectedFee = (PAYMENT_AMOUNT * BigInt(PLATFORM_FEE_BPS)) / BigInt(10000);
      expect(await facilitator.accumulatedFees()).to.equal(expectedFee);
    });
    
    it("Should allow owner to update platform fee", async function () {
      const newFee = 200; // 2%
      
      await expect(facilitator.updatePlatformFee(newFee))
        .to.emit(facilitator, "PlatformFeeUpdated")
        .withArgs(PLATFORM_FEE_BPS, newFee);
      
      expect(await facilitator.platformFeeBps()).to.equal(newFee);
    });
    
    it("Should reject fee update exceeding maximum", async function () {
      const tooHighFee = 1001; // 10.01% (max is 10%)
      
      await expect(
        facilitator.updatePlatformFee(tooHighFee)
      ).to.be.revertedWith("Fee too high");
    });
    
    it("Should reject fee update from non-owner", async function () {
      await expect(
        facilitator.connect(user1).updatePlatformFee(200)
      ).to.be.revertedWithCustomError(facilitator, "OwnableUnauthorizedAccount");
    });
    
    it("Should allow owner to withdraw accumulated fees", async function () {
      // First, make a payment to accumulate fees
      const deadline = getDeadline();
      const nonce = generateNonce();
      const facilitatorAddr = await facilitator.getAddress();
      
      const permitSig = await createPermitSignature(usdc, user1, facilitatorAddr, PAYMENT_AMOUNT, deadline);
      const authSig = await createAuthSignature(facilitatorAddr, user1, user1.address, PAYMENT_AMOUNT, deadline, recipient.address, nonce);
      
      const payment = {
        owner: user1.address,
        value: PAYMENT_AMOUNT,
        deadline: deadline,
        recipient: recipient.address,
        nonce: nonce
      };
      
      await facilitator.settlePaymentWithPermit(
        payment,
        { v: permitSig.v, r: permitSig.r, s: permitSig.s },
        { v: authSig.v, r: authSig.r, s: authSig.s }
      );
      
      const accumulatedFees = await facilitator.accumulatedFees();
      const initialOwnerBalance = await usdc.balanceOf(owner.address);
      
      await expect(facilitator.withdrawFees(owner.address))
        .to.emit(facilitator, "FeesWithdrawn")
        .withArgs(owner.address, accumulatedFees);
      
      expect(await usdc.balanceOf(owner.address)).to.equal(
        initialOwnerBalance + accumulatedFees
      );
      expect(await facilitator.accumulatedFees()).to.equal(0);
    });
    
    it("Should reject fee withdrawal to zero address", async function () {
      await expect(
        facilitator.withdrawFees(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid recipient");
    });
    
    it("Should reject fee withdrawal when no fees accumulated", async function () {
      await expect(
        facilitator.withdrawFees(owner.address)
      ).to.be.revertedWith("No fees to withdraw");
    });
  });
  
  describe("Pause Functionality", function () {
    it("Should allow owner to pause contract", async function () {
      await expect(facilitator.pause())
        .to.emit(facilitator, "EmergencyPause")
        .withArgs(owner.address);
      
      expect(await facilitator.paused()).to.be.true;
    });
    
    it("Should allow owner to unpause contract", async function () {
      await facilitator.pause();
      
      await expect(facilitator.unpause())
        .to.emit(facilitator, "EmergencyUnpause")
        .withArgs(owner.address);
      
      expect(await facilitator.paused()).to.be.false;
    });
    
    it("Should reject payments when paused", async function () {
      await facilitator.pause();
      
      const deadline = getDeadline();
      const nonce = generateNonce();
      
      const payment = {
        owner: user1.address,
        value: PAYMENT_AMOUNT,
        deadline: deadline,
        recipient: recipient.address,
        nonce: nonce
      };
      
      const emptySig = { v: 27, r: ethers.ZeroHash, s: ethers.ZeroHash };
      
      await expect(
        facilitator.settlePaymentWithPermit(payment, emptySig, emptySig)
      ).to.be.revertedWithCustomError(facilitator, "EnforcedPause");
    });
    
    it("Should reject pause from non-owner", async function () {
      await expect(
        facilitator.connect(user1).pause()
      ).to.be.revertedWithCustomError(facilitator, "OwnableUnauthorizedAccount");
    });
  });
  
  describe("View Functions", function () {
    it("Should return correct user stats", async function () {
      const deadline = getDeadline();
      const nonce = generateNonce();
      const facilitatorAddr = await facilitator.getAddress();
      
      const permitSig = await createPermitSignature(usdc, user1, facilitatorAddr, PAYMENT_AMOUNT, deadline);
      const authSig = await createAuthSignature(facilitatorAddr, user1, user1.address, PAYMENT_AMOUNT, deadline, recipient.address, nonce);
      
      const payment = {
        owner: user1.address,
        value: PAYMENT_AMOUNT,
        deadline: deadline,
        recipient: recipient.address,
        nonce: nonce
      };
      
      await facilitator.settlePaymentWithPermit(
        payment,
        { v: permitSig.v, r: permitSig.r, s: permitSig.s },
        { v: authSig.v, r: authSig.r, s: authSig.s }
      );
      
      const stats = await facilitator.getStats(user1.address);
      expect(stats.paid).to.equal(PAYMENT_AMOUNT);
      expect(stats.received).to.equal(0);
    });
    
    it("Should return correct payment hash", async function () {
      const deadline = getDeadline();
      const nonce = generateNonce();
      
      const hash = await facilitator.getPaymentHash(
        user1.address,
        recipient.address,
        PAYMENT_AMOUNT,
        deadline,
        nonce
      );
      
      const expectedHash = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "address", "uint256", "uint256", "bytes32"],
          [user1.address, recipient.address, PAYMENT_AMOUNT, deadline, nonce]
        )
      );
      
      expect(hash).to.equal(expectedHash);
    });
  });
});
