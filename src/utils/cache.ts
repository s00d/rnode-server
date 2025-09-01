import * as addon from '../load.cjs';
import { CacheManager, CacheInitConfig, CacheOptions } from '../types/cache';
import { logger } from './logger';

/**
 * Утилиты для работы с упрощенной системой кэширования RNode Server
 */

// Глобальный экземпляр кэш менеджера
let globalCacheManager: CacheManager | null = null;

/**
 * Инициализация системы кэширования
 */
export function initCacheSystem(config: CacheInitConfig = {}): boolean {
  try {
    const defaultConfig = {
      defaultTtl: 3600, // 1 час по умолчанию
      maxMemory: 100 * 1024 * 1024, // 100MB по умолчанию
      redisUrl: '',
      fileCachePath: './cache',
      ...config
    };

    logger.info('🚀 Initializing cache system...', 'rnode_server::cache');
    
    addon.initCacheSystem(defaultConfig);
    
    logger.info('✅ Cache system initialized successfully', 'rnode_server::cache');
    return true;
  } catch (error) {
    logger.error(`❌ Cache initialization error: ${error}`, 'rnode_server::cache');
    return false;
  }
}

/**
 * Получение глобального кэш менеджера
 */
export function getCacheManager(): CacheManager | null {
  if (!globalCacheManager) {
    logger.warn('⚠️ Cache system not initialized. Call initCacheSystem() first.', 'rnode_server::cache');
    return null;
  }
  return globalCacheManager;
}

/**
 * Создание экземпляра кэш менеджера
 */
export function createCacheManager(): CacheManager {
  return new RNodeCacheManager();
}

/**
 * Реализация упрощенного кэш менеджера для RNode Server
 */
class RNodeCacheManager implements CacheManager {
  
  get<T = string>(key: string, tags?: string[]): T | null {
    try {
      const value = addon.cacheGet(key, tags || []);
      if (value === null) {
        logger.debug(`❌ Cache miss: ${key}`, 'rnode_server::cache');
        return null;
      }
      
      logger.debug(`✅ Cache hit: ${key}`, 'rnode_server::cache');
      
      // Пытаемся парсить JSON если это не строка
      if (typeof value === 'string') {
        try {
          return JSON.parse(value) as T;
        } catch {
          return value as T;
        }
      }
      
      return value as T;
    } catch (error) {
      logger.error(`❌ Cache get error for key ${key}: ${error}`, 'rnode_server::cache');
      return null;
    }
  }

  set<T = string>(key: string, value: T, options?: CacheOptions): boolean {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      const success = addon.cacheSet(key, stringValue, options?.tags || [], options?.ttl || 0);
      
      if (success) {
        logger.debug(`✅ Cache set: ${key}`, 'rnode_server::cache');
      } else {
        logger.error(`❌ Cache set failed: ${key}`, 'rnode_server::cache');
      }
      
      return success;
    } catch (error) {
      logger.error(`❌ Cache set error for key ${key}: ${error}`, 'rnode_server::cache');
      return false;
    }
  }

  delete(key: string, tags?: string[]): boolean {
    try {
      const deleted = addon.cacheDelete(key, tags || []);
      
      if (deleted) {
        logger.debug(`✅ Cache delete: ${key}`, 'rnode_server::cache');
      } else {
        logger.debug(`⚠️ Cache delete - key not found: ${key}`, 'rnode_server::cache');
      }
      
      return deleted;
    } catch (error) {
      logger.error(`❌ Cache delete error for key ${key}: ${error}`, 'rnode_server::cache');
      return false;
    }
  }

  exists(key: string, tags?: string[]): boolean {
    try {
      const exists = addon.cacheExists(key, tags || []);
      logger.debug(`🔍 Cache exists check for key ${key}: ${exists}`, 'rnode_server::cache');
      return exists;
    } catch (error) {
      logger.error(`❌ Cache exists error for key ${key}: ${error}`, 'rnode_server::cache');
      return false;
    }
  }

  clear(): boolean {
    try {
      const success = addon.cacheClear();
      
      if (success) {
        logger.info('✅ Cache cleared successfully', 'rnode_server::cache');
      } else {
        logger.error('❌ Cache clear failed', 'rnode_server::cache');
      }
      
      return success;
    } catch (error) {
      logger.error(`❌ Cache clear error: ${error}`, 'rnode_server::cache');
      return false;
    }
  }

  flushByTags(tags: string[]): number {
    try {
      const count = addon.cacheFlushByTags(tags);
      logger.info(`🏷️ Flushed ${count} items by tags: ${tags.join(', ')}`, 'rnode_server::cache');
      return count;
    } catch (error) {
      logger.error(`❌ Cache flush by tags error: ${error}`, 'rnode_server::cache');
      return 0;
    }
  }
}
