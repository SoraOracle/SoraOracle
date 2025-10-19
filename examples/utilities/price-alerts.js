/**
 * Price Alerts Bot - Monitor any token and get notified
 * 
 * Uses Sora Oracle to monitor ANY PancakeSwap pair and trigger alerts
 * when price targets are hit.
 * 
 * Perfect for: Trading bots, notifications, automated strategies
 */

const { ethers } = require("hardhat");

class PriceAlertBot {
    constructor(oracleAddress) {
        this.oracleAddress = oracleAddress;
        this.alerts = new Map();
        this.checkInterval = 60000; // Check every 1 minute
    }
    
    async initialize() {
        this.oracle = await ethers.getContractAt("SoraOracle", this.oracleAddress);
        console.log("🤖 Price Alert Bot initialized");
        console.log(`📍 Oracle: ${this.oracleAddress}\n`);
    }
    
    /**
     * Add price alert for any token (permissionless!)
     */
    async addAlert(config) {
        const {
            name,
            pairAddress,
            tokenAddress,
            targetPrice,
            condition, // 'above' or 'below'
            callback
        } = config;
        
        // Verify pair exists and get current price
        try {
            const currentPrice = await this.oracle.getTWAPPrice(
                pairAddress,
                tokenAddress,
                ethers.parseEther("1")
            );
            
            const alertId = `${pairAddress}-${tokenAddress}-${targetPrice}`;
            this.alerts.set(alertId, {
                ...config,
                currentPrice: ethers.formatEther(currentPrice),
                triggered: false
            });
            
            console.log(`✅ Alert added: ${name}`);
            console.log(`   Current: ${ethers.formatEther(currentPrice)}`);
            console.log(`   Target: ${condition} ${targetPrice}\n`);
            
        } catch (error) {
            console.error(`❌ Failed to add alert: ${error.message}`);
        }
    }
    
    /**
     * Start monitoring prices
     */
    async start() {
        console.log("🚀 Starting price monitoring...\n");
        
        setInterval(async () => {
            await this.checkAlerts();
        }, this.checkInterval);
    }
    
    /**
     * Check all alerts
     */
    async checkAlerts() {
        for (const [alertId, alert] of this.alerts.entries()) {
            if (alert.triggered) continue;
            
            try {
                // Get TWAP oracle
                const twap = await this.oracle.twapOracles(alert.pairAddress);
                const isReady = await twap.canConsult();
                
                // Get price (TWAP if ready, spot if bootstrap)
                const price = await this.oracle.getTWAPPrice(
                    alert.pairAddress,
                    alert.tokenAddress,
                    ethers.parseEther("1")
                );
                
                const priceNum = parseFloat(ethers.formatEther(price));
                const targetNum = parseFloat(alert.targetPrice);
                
                // Check if alert triggered
                let triggered = false;
                if (alert.condition === 'above' && priceNum >= targetNum) {
                    triggered = true;
                } else if (alert.condition === 'below' && priceNum <= targetNum) {
                    triggered = true;
                }
                
                if (triggered) {
                    alert.triggered = true;
                    alert.finalPrice = priceNum;
                    
                    console.log(`\n🔔 ALERT TRIGGERED: ${alert.name}`);
                    console.log(`   Price: ${priceNum}`);
                    console.log(`   Target: ${alert.condition} ${targetNum}`);
                    console.log(`   TWAP Ready: ${isReady ? 'Yes ✅' : 'No (Bootstrap) ⚠️'}\n`);
                    
                    // Execute callback
                    if (alert.callback) {
                        await alert.callback(priceNum, alert);
                    }
                }
                
            } catch (error) {
                console.error(`Error checking ${alert.name}: ${error.message}`);
            }
        }
    }
}

// Example usage
async function main() {
    const ORACLE_ADDRESS = process.env.SORA_ORACLE_ADDRESS;
    
    const bot = new PriceAlertBot(ORACLE_ADDRESS);
    await bot.initialize();
    
    // Add alerts for any tokens
    await bot.addAlert({
        name: "CAKE Price Alert",
        pairAddress: "0x0eD7e52944161450477ee417DE9Cd3a859b14fD0", // CAKE/WBNB
        tokenAddress: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", // CAKE
        targetPrice: "5.0",
        condition: "above",
        callback: async (price, alert) => {
            console.log(`🎯 CAKE hit target! Execute your strategy here...`);
            // Your logic: buy, sell, notify, etc.
        }
    });
    
    await bot.addAlert({
        name: "WBNB Support Level",
        pairAddress: "0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16", // WBNB/BUSD
        tokenAddress: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB
        targetPrice: "600",
        condition: "below",
        callback: async (price, alert) => {
            console.log(`📉 WBNB below support! Time to buy?`);
        }
    });
    
    // Add YOUR custom token alert
    await bot.addAlert({
        name: "My Token Alert",
        pairAddress: "0xYourPairAddress",
        tokenAddress: "0xYourTokenAddress",
        targetPrice: "1.0",
        condition: "above",
        callback: async (price) => {
            console.log(`🚀 Your token hit $1!`);
        }
    });
    
    // Start monitoring
    await bot.start();
}

// Run if executed directly
if (require.main === module) {
    main()
        .then(() => {
            console.log("Bot running... Press Ctrl+C to stop");
        })
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { PriceAlertBot };
