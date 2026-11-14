import app from './app.js';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`  🚀 LearnMate Backend Server Running!`);
  console.log(`  📡 Port:      http://localhost:${PORT}`);
  console.log(`  🩺 Health:    http://localhost:${PORT}/api/health`);
  console.log(`  ⚙️  Env:       ${process.env.NODE_ENV || 'development'}`);
  console.log(`===============================================`);
});

// Graceful shutdown listeners
process.on('SIGINT', () => {
  console.log('\nShutting down LearnMate backend gracefully...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, shutting down LearnMate backend...');
  server.close(() => {
    process.exit(0);
  });
});
