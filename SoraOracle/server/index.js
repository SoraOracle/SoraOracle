const BlockchainIndexer = require('./indexer');
const app = require('./api');

const PORT = process.env.PORT || 3001;

async function main() {
  console.log('🚀 Starting Sora Oracle Indexer & API Server...\n');

  const indexer = new BlockchainIndexer();
  await indexer.initialize();
  await indexer.startIndexing();

  app.listen(PORT, () => {
    console.log(`\n✅ API Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`📈 Analytics: http://localhost:${PORT}/api/analytics/overview`);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await indexer.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await indexer.stop();
    process.exit(0);
  });
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
