import { logger } from './logger';
import { AppOptions } from '../types/app-router';
import { createRNodeApp, type RNodeApp } from './app';
import * as addon from '../load.cjs';

export function createApp(options?: AppOptions): RNodeApp {
  // Get log level from options or use default
  const logLevel = options?.logLevel || 'info';
  const level = logLevel.toLowerCase();
  
  // Create app with log level
  const appInfo = addon.createApp(level);
  logger.info(`🚀 Creating ${appInfo.name} v${appInfo.version} with log level: ${level}`, 'rnode_server::app');

  // Create RNodeApp instance
  const app = createRNodeApp();
  
  // Set log level using the method
  app.setLogLevel(level);
  app.setMetrics(options?.metrics ?? false);
  app.setTimeout(options?.timeout ?? 30000)
  app.setDevMode(options?.devMode ?? process.env.MODE === 'development')
  
  // Store SSL configuration if provided
  if (options?.ssl) {
    const { certPath, keyPath } = options.ssl;
    if (certPath && keyPath) {
      logger.info(`🔒 SSL configuration loaded:`, 'rnode_server::app');
      logger.info(`   Certificate: ${certPath}`, 'rnode_server::app');
      logger.info(`   Private Key: ${keyPath}`, 'rnode_server::app');
      app.setSslConfig(options.ssl)
    } else {
      logger.warn('⚠️ SSL certificate paths are not provided in options.', 'rnode_server::app');
    }
  }

  return app;
}

// Simple greeting function
export function greeting(name: string): { message: string } {
  const message = addon.hello(name);
  return { message };
}
