import { logger } from './logger';

export function setupGracefulShutdown(): void {
  // Graceful shutdown handling
  process.on('SIGINT', (signal) => {
    logger.info(`🛑 Received ${signal}, shutting down gracefully...`, 'rnode_server::shutdown');
    
    // Force exit after a short delay if graceful shutdown fails
    setTimeout(() => {
      logger.warn('⚠️ Force exit after timeout', 'rnode_server::shutdown');
      process.exit(1);
    }, 5000);
    
    // Try to exit gracefully
    process.exit(0);
  });

  process.on('SIGTERM', (signal) => {
    logger.info(`🛑 Received ${signal}, shutting down gracefully...`, 'rnode_server::shutdown');
    process.exit(0);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error(`💥 Uncaught Exception: ${error.message}`, 'rnode_server::error');
    logger.error(`Stack trace: ${error.stack}`, 'rnode_server::error');
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error(`💥 Unhandled Rejection at: ${promise}`, 'rnode_server::error');
    logger.error(`Reason: ${reason}`, 'rnode_server::error');
    process.exit(1);
  });
}
