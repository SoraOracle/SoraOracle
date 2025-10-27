import { expect } from 'chai';
import { ethers } from 'hardhat';
import { TokenFactory as TokenFactorySDK } from '../src/sdk/TokenFactory';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';

describe('TokenFactory V5.0', function () {
  let tokenFactoryContract: any;
  let oracleContract: any;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let factoryAddress: string;
  let oracleAddress: string;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy mock oracle
    const MockOracle = await ethers.getContractFactory('SoraOracle');
    oracleContract = await MockOracle.deploy();
    await oracleContract.waitForDeployment();
    oracleAddress = await oracleContract.getAddress();

    // Deploy TokenFactory
    const TokenFactory = await ethers.getContractFactory('TokenFactory');
    tokenFactoryContract = await TokenFactory.deploy();
    await tokenFactoryContract.waitForDeployment();
    factoryAddress = await tokenFactoryContract.getAddress();
  });

  describe('Contract Deployment', function () {
    it('Should deploy TokenFactory successfully', async function () {
      expect(await tokenFactoryContract.getAddress()).to.be.properAddress;
    });

    it('Should have no deployed tokens initially', async function () {
      const tokens = await tokenFactoryContract.getDeployedTokens();
      expect(tokens.length).to.equal(0);
    });
  });

  describe('Token Creation', function () {
    it('Should create a token with valid parameters', async function () {
      const marketName = 'BTC-100K';
      const initialSupply = ethers.parseUnits('1000000000', 18);

      const tx = await tokenFactoryContract.createToken(
        marketName,
        initialSupply,
        oracleAddress
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find((log: any) => {
        try {
          return tokenFactoryContract.interface.parseLog(log)?.name === 'TokenCreated';
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;
    });

    it('Should generate correct symbol from market name', async function () {
      const marketName = 'BTC-100K';
      const initialSupply = ethers.parseUnits('1000000000', 18);

      const tx = await tokenFactoryContract.createToken(
        marketName,
        initialSupply,
        oracleAddress
      );

      const receipt = await tx.wait();
      const parsedEvent = receipt.logs
        .map((log: any) => {
          try {
            return tokenFactoryContract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed: any) => parsed?.name === 'TokenCreated');

      expect(parsedEvent?.args.symbol).to.equal('BTC100K');
    });

    it('Should fail with empty market name', async function () {
      await expect(
        tokenFactoryContract.createToken(
          '',
          ethers.parseUnits('1000000000', 18),
          oracleAddress
        )
      ).to.be.revertedWith('Market name required');
    });

    it('Should fail with zero initial supply', async function () {
      await expect(
        tokenFactoryContract.createToken(
          'BTC-100K',
          0,
          oracleAddress
        )
      ).to.be.revertedWith('Invalid supply');
    });

    it('Should fail with invalid oracle address', async function () {
      await expect(
        tokenFactoryContract.createToken(
          'BTC-100K',
          ethers.parseUnits('1000000000', 18),
          ethers.ZeroAddress
        )
      ).to.be.revertedWith('Invalid oracle feed');
    });

    it('Should prevent duplicate market names', async function () {
      const marketName = 'BTC-100K';
      const initialSupply = ethers.parseUnits('1000000000', 18);

      await tokenFactoryContract.createToken(
        marketName,
        initialSupply,
        oracleAddress
      );

      await expect(
        tokenFactoryContract.createToken(
          marketName,
          initialSupply,
          oracleAddress
        )
      ).to.be.revertedWith('Market already exists');
    });
  });

  describe('Token Registry', function () {
    it('Should track deployed tokens', async function () {
      await tokenFactoryContract.createToken(
        'BTC-100K',
        ethers.parseUnits('1000000000', 18),
        oracleAddress
      );

      await tokenFactoryContract.createToken(
        'ETH-10K',
        ethers.parseUnits('500000000', 18),
        oracleAddress
      );

      const tokens = await tokenFactoryContract.getDeployedTokens();
      expect(tokens.length).to.equal(2);
    });

    it('Should return token metadata', async function () {
      const tx = await tokenFactoryContract.createToken(
        'BTC-100K',
        ethers.parseUnits('1000000000', 18),
        oracleAddress
      );

      const receipt = await tx.wait();
      const parsedEvent = receipt.logs
        .map((log: any) => {
          try {
            return tokenFactoryContract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed: any) => parsed?.name === 'TokenCreated');

      const tokenAddress = parsedEvent?.args.tokenAddress;
      const metadata = await tokenFactoryContract.getTokenMetadata(tokenAddress);

      expect(metadata.name).to.equal('BTC-100K');
      expect(metadata.symbol).to.equal('BTC100K');
    });

    it('Should check if market exists', async function () {
      await tokenFactoryContract.createToken(
        'BTC-100K',
        ethers.parseUnits('1000000000', 18),
        oracleAddress
      );

      const exists = await tokenFactoryContract.marketExists('BTC-100K');
      const notExists = await tokenFactoryContract.marketExists('ETH-10K');

      expect(exists).to.be.true;
      expect(notExists).to.be.false;
    });
  });

  describe('SDK Integration', function () {
    it('Should deploy token via SDK', async function () {
      // This test would require a full setup with oracle mock
      // Skipping for now, but structure is here
      this.skip();
    });
  });

  describe('Gas Optimization', function () {
    it('Should use reasonable gas for token deployment', async function () {
      const tx = await tokenFactoryContract.createToken(
        'BTC-100K',
        ethers.parseUnits('1000000000', 18),
        oracleAddress
      );

      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed;

      // Should be under 500k gas for BNB Chain optimization
      expect(gasUsed).to.be.lessThan(500000);
    });
  });
});
