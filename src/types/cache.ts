// Типы для упрощенной системы кэширования RNode Server

export interface CacheConfig {
  defaultTtl?: number; // время жизни по умолчанию в секундах
  maxMemory?: number; // максимальный размер памяти в байтах
  redisUrl?: string; // URL для Redis
  fileCachePath?: string; // путь к файловому кэшу
}

export interface CacheOptions {
  ttl?: number; // время жизни в секундах
  tags?: string[]; // теги для группировки
}

export interface CacheManager {
  // Основные операции
  get<T = string>(key: string, tags?: string[]): T | null;
  set<T = string>(key: string, value: T, options?: CacheOptions): boolean;
  delete(key: string, tags?: string[]): boolean;
  exists(key: string, tags?: string[]): boolean;
  clear(): boolean;
  
  // Операции с тегами
  flushByTags(tags: string[]): number;
}

// Конфигурация для инициализации кэша
export interface CacheInitConfig {
  defaultTtl?: number;
  maxMemory?: number;
  redisUrl?: string;
  fileCachePath?: string;
}
