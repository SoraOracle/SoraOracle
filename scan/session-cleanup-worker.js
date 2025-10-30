/**
 * S402 Session Cleanup Worker
 * Automatically refunds expired sessions every hour
 */

const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
const CLEANUP_URL = 'http://localhost:5000/api/sessions/cleanup';

async function runCleanup() {
  try {
    console.log('🔄 Running session cleanup...');
    
    const response = await fetch(CLEANUP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();
    console.log(`✅ Cleanup complete: ${result.processed} sessions processed`);
    
    if (result.results && result.results.length > 0) {
      result.results.forEach((r) => {
        if (r.error) {
          console.log(`  ❌ Session ${r.sessionId}: ${r.error}`);
        } else {
          console.log(`  ✅ Session ${r.sessionId}: Refunded $${r.refundedUSD1} USD1, ${r.refundedBNB} BNB`);
        }
      });
    }
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
}

async function start() {
  console.log('🚀 Session Cleanup Worker started');
  console.log(`⏰ Running cleanup every ${CLEANUP_INTERVAL / 1000 / 60} minutes`);
  
  // Run immediately on start
  await runCleanup();
  
  // Then run periodically
  setInterval(runCleanup, CLEANUP_INTERVAL);
}

start().catch(console.error);
