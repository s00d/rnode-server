# Система плагинов для RNode Server 🔌

## Обзор

Интеграция мощной системы плагинов в RNode Server для расширения функциональности, создания экосистемы и обеспечения модульности приложений с поддержкой hot-reload и версионирования.

## Цели

- ✅ Реализовать модульную систему плагинов
- ✅ Поддержать hot-reload плагинов
- ✅ Обеспечить версионирование и совместимость
- ✅ Интегрировать с существующей системой middleware
- ✅ Создать экосистему плагинов для RNode Server

## Архитектура

### Система плагинов
```
Application Layer
       ↓
   Plugin Manager
       ↓
┌─────────────┬─────────────┬─────────────┐
│ Core        │ Official    │ Community   │
│ Plugins     │ Plugins     │ Plugins     │
│ (Built-in)  │ (Verified)  │ (Custom)    │
└─────────────┴─────────────┴─────────────┘
       ↓
   Plugin Registry
       ↓
   Plugin Loader
       ↓
   Plugin Runtime
```

### Интеграция с существующей архитектурой
```
Client → Rust Backend → Node.js → JavaScript Handlers
                           ↓
                    Plugin Middleware
                           ↓
                    Plugin Manager
                           ↓
                    Plugin System
```

## Техническая реализация

### 1. Rust Backend (Plugin Manager)

#### Зависимости в Cargo.toml
```toml
[dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1.0", features = ["full"] }
notify = "6.1"
walkdir = "2.4"
semver = "1.0"
uuid = { version = "1.0", features = ["v4"] }
```

#### Структуры данных
```rust
// crates/rnode-server/src/plugins/mod.rs
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use serde::{Serialize, Deserialize};
use semver::Version;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginManifest {
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: String,
    pub license: String,
    pub dependencies: Vec<PluginDependency>,
    pub entry_point: String,
    pub hooks: Vec<PluginHook>,
    pub permissions: Vec<PluginPermission>,
    pub config_schema: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginDependency {
    pub name: String,
    pub version: String,
    pub optional: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginHook {
    pub name: String,
    pub event: String,
    pub priority: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginPermission {
    pub resource: String,
    pub actions: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct Plugin {
    pub id: Uuid,
    pub manifest: PluginManifest,
    pub path: String,
    pub status: PluginStatus,
    pub instance: Option<PluginInstance>,
    pub config: serde_json::Value,
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum PluginStatus {
    Disabled,
    Enabled,
    Loading,
    Error(String),
}

#[derive(Debug)]
pub struct PluginInstance {
    pub handler_id: String, // JavaScript handler ID
    pub hooks: Vec<PluginHook>,
    pub permissions: Vec<PluginPermission>,
}

#[derive(Debug)]
pub struct PluginManager {
    plugins: Arc<RwLock<HashMap<String, Plugin>>>,
    registry: Arc<RwLock<PluginRegistry>>,
    watcher: Option<notify::Watcher>,
    hooks: Arc<RwLock<HashMap<String, Vec<PluginHook>>>>,
}

#[derive(Debug)]
pub struct PluginRegistry {
    core_plugins: HashMap<String, PluginManifest>,
    official_plugins: HashMap<String, PluginManifest>,
    community_plugins: HashMap<String, PluginManifest>,
}
```

#### Загрузчик плагинов
```rust
// crates/rnode-server/src/plugins/loader.rs
use std::path::Path;
use walkdir::WalkDir;

pub struct PluginLoader {
    plugin_dir: String,
    manager: Arc<PluginManager>,
}

impl PluginLoader {
    pub async fn load_plugins(&self) -> Result<Vec<Plugin>, String> {
        let mut plugins = Vec::new();
        
        for entry in WalkDir::new(&self.plugin_dir)
            .max_depth(2)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if entry.file_name() == "plugin.json" {
                if let Ok(plugin) = self.load_plugin_from_path(entry.path()).await {
                    plugins.push(plugin);
                }
            }
        }
        
        Ok(plugins)
    }
    
    async fn load_plugin_from_path(&self, path: &Path) -> Result<Plugin, String> {
        let manifest_content = std::fs::read_to_string(path)?;
        let manifest: PluginManifest = serde_json::from_str(&manifest_content)?;
        
        // Валидация манифеста
        self.validate_manifest(&manifest)?;
        
        // Проверка зависимостей
        self.check_dependencies(&manifest).await?;
        
        let plugin = Plugin {
            id: Uuid::new_v4(),
            manifest,
            path: path.parent().unwrap().to_string_lossy().to_string(),
            status: PluginStatus::Disabled,
            instance: None,
            config: serde_json::Value::Null,
            metadata: HashMap::new(),
        };
        
        Ok(plugin)
    }
    
    fn validate_manifest(&self, manifest: &PluginManifest) -> Result<(), String> {
        // Проверка обязательных полей
        if manifest.name.is_empty() {
            return Err("Plugin name cannot be empty".to_string());
        }
        
        if manifest.version.is_empty() {
            return Err("Plugin version cannot be empty".to_string());
        }
        
        // Валидация версии
        if Version::parse(&manifest.version).is_err() {
            return Err("Invalid plugin version format".to_string());
        }
        
        Ok(())
    }
    
    async fn check_dependencies(&self, manifest: &PluginManifest) -> Result<(), String> {
        for dependency in &manifest.dependencies {
            if !self.plugin_exists(&dependency.name).await {
                if !dependency.optional {
                    return Err(format!("Required dependency not found: {}", dependency.name));
                }
            }
        }
        Ok(())
    }
}
```

#### Система хуков
```rust
// crates/rnode-server/src/plugins/hooks.rs
use std::collections::HashMap;
use tokio::sync::RwLock;

pub struct HookManager {
    hooks: Arc<RwLock<HashMap<String, Vec<HookHandler>>>>,
}

#[derive(Debug, Clone)]
pub struct HookHandler {
    pub plugin_id: String,
    pub handler_id: String,
    pub priority: i32,
}

impl HookManager {
    pub async fn register_hook(&self, event: &str, handler: HookHandler) {
        let mut hooks = self.hooks.write().await;
        let event_hooks = hooks.entry(event.to_string()).or_insert_with(Vec::new);
        event_hooks.push(handler);
        
        // Сортировка по приоритету
        event_hooks.sort_by(|a, b| b.priority.cmp(&a.priority));
    }
    
    pub async fn trigger_hook(&self, event: &str, data: &serde_json::Value) -> Result<serde_json::Value, String> {
        let hooks = self.hooks.read().await;
        
        if let Some(event_hooks) = hooks.get(event) {
            let mut result = data.clone();
            
            for handler in event_hooks {
                // Вызов JavaScript handler
                if let Ok(response) = self.call_plugin_handler(&handler.handler_id, &result).await {
                    result = response;
                }
            }
            
            Ok(result)
        } else {
            Ok(data.clone())
        }
    }
    
    async fn call_plugin_handler(&self, handler_id: &str, data: &serde_json::Value) -> Result<serde_json::Value, String> {
        // Вызов JavaScript handler через Neon FFI
        // ...
        Ok(data.clone())
    }
}
```

### 2. JavaScript API

#### Основные интерфейсы
```typescript
// src/types/plugin.d.ts
export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  dependencies: PluginDependency[];
  entryPoint: string;
  hooks: PluginHook[];
  permissions: PluginPermission[];
  configSchema?: any;
}

export interface PluginDependency {
  name: string;
  version: string;
  optional: boolean;
}

export interface PluginHook {
  name: string;
  event: string;
  priority: number;
}

export interface PluginPermission {
  resource: string;
  actions: string[];
}

export interface Plugin {
  id: string;
  manifest: PluginManifest;
  path: string;
  status: 'disabled' | 'enabled' | 'loading' | 'error';
  config: any;
  metadata: Record<string, string>;
}

export interface PluginManager {
  // Управление плагинами
  loadPlugin(path: string): Promise<Plugin>;
  unloadPlugin(name: string): Promise<void>;
  enablePlugin(name: string): Promise<void>;
  disablePlugin(name: string): Promise<void>;
  reloadPlugin(name: string): Promise<void>;
  
  // Информация о плагинах
  getPlugin(name: string): Plugin | undefined;
  getAllPlugins(): Plugin[];
  getEnabledPlugins(): Plugin[];
  
  // Система хуков
  on(event: string, handler: Function, priority?: number): void;
  off(event: string, handler: Function): void;
  emit(event: string, data: any): Promise<any>;
  
  // Конфигурация
  getPluginConfig(name: string): any;
  setPluginConfig(name: string, config: any): Promise<void>;
  
  // Управление
  installPlugin(packageName: string): Promise<void>;
  uninstallPlugin(name: string): Promise<void>;
  updatePlugin(name: string): Promise<void>;
}

export interface PluginContext {
  app: any;
  config: any;
  logger: any;
  hooks: {
    on(event: string, handler: Function, priority?: number): void;
    emit(event: string, data: any): Promise<any>;
  };
  permissions: {
    check(resource: string, action: string): boolean;
    grant(resource: string, action: string): void;
    revoke(resource: string, action: string): void;
  };
}
```

#### Интеграция с App
```typescript
// src/utils/app.ts
export class RNodeApp {
  // ... существующий код ...
  
  plugin(name: string): PluginManager {
    return this.addon.getPluginManager(name);
  }
  
  // Middleware для плагинов
  pluginMiddleware(pluginName: string): Middleware {
    return async (req, res, next) => {
      const plugin = this.plugin(pluginName);
      
      // Проверка разрешений плагина
      if (!plugin.hasPermission(req.path, req.method)) {
        return res.status(403).json({ error: 'Plugin permission denied' });
      }
      
      // Вызов хуков плагина
      const modifiedReq = await plugin.emit('request:before', req);
      req = modifiedReq;
      
      next();
      
      // Вызов хуков после обработки
      await plugin.emit('request:after', { req, res });
    };
  }
}
```

### 3. Примеры использования

#### Создание плагина
```typescript
// plugins/auth-plugin/plugin.json
{
  "name": "auth-plugin",
  "version": "1.0.0",
  "description": "Authentication plugin for RNode Server",
  "author": "Your Name",
  "license": "MIT",
  "dependencies": [],
  "entryPoint": "index.js",
  "hooks": [
    {
      "name": "auth:before",
      "event": "request:before",
      "priority": 100
    }
  ],
  "permissions": [
    {
      "resource": "auth",
      "actions": ["login", "logout", "verify"]
    }
  ],
  "configSchema": {
    "type": "object",
    "properties": {
      "secret": { "type": "string" },
      "expiresIn": { "type": "string", "default": "24h" }
    },
    "required": ["secret"]
  }
}

// plugins/auth-plugin/index.js
export default function(Api, context) {
  const { app, config, hooks, permissions } = context;
  
  // Регистрация хуков
  hooks.on('request:before', async (req) => {
    if (req.path.startsWith('/api/protected')) {
      const token = req.headers.authorization;
      if (!token) {
        throw new Error('No authorization token');
      }
      
      try {
        const user = await verifyToken(token, config.secret);
        req.setParam('user', user);
      } catch (error) {
        throw new Error('Invalid token');
      }
    }
    
    return req;
  }, 100);
  
  // Регистрация роутов
  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
      const user = await authenticateUser(username, password);
      const token = generateToken(user, config.secret, config.expiresIn);
      
      res.json({ token, user });
    } catch (error) {
      res.status(401).json({ error: 'Authentication failed' });
    }
  });
  
  app.post('/api/auth/logout', async (req, res) => {
    // Логика выхода
    res.json({ message: 'Logged out successfully' });
  });
  
  // Middleware для защищенных роутов
  app.use('/api/protected', (req, res, next) => {
    if (!req.getParam('user')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  });
  
  // Возвращаем информацию о плагине
  return {
    name: 'auth-plugin',
    version: '1.0.0',
    hooks: ['request:before'],
    routes: ['/api/auth/login', '/api/auth/logout']
  };
}
```

#### Использование плагина
```typescript
import { createApp } from 'rnode-server';

const app = createApp();

// Загрузка плагина
const authPlugin = await app.plugin('auth-plugin').loadPlugin('./plugins/auth-plugin');

// Включение плагина
await app.plugin('auth-plugin').enablePlugin('auth-plugin');

// Использование функциональности плагина
app.get('/api/protected/profile', (req, res) => {
  const user = req.getParam('user');
  res.json({ 
    message: 'Protected route accessed successfully',
    user: { id: user.id, username: user.username }
  });
});

// Применение middleware плагина
app.use('/api/protected', app.pluginMiddleware('auth-plugin'));
```

#### Плагин для мониторинга
```typescript
// plugins/monitoring-plugin/plugin.json
{
  "name": "monitoring-plugin",
  "version": "1.0.0",
  "description": "Advanced monitoring and metrics plugin",
  "author": "Monitoring Team",
  "license": "MIT",
  "dependencies": [],
  "entryPoint": "index.js",
  "hooks": [
    {
      "name": "metrics:collect",
      "event": "request:after",
      "priority": 50
    }
  ],
  "permissions": [
    {
      "resource": "metrics",
      "actions": ["read", "write"]
    }
  ]
}

// plugins/monitoring-plugin/index.js
export default function(Api, context) {
  const { app, hooks, config } = context;
  
  let requestCount = 0;
  let responseTimeSum = 0;
  
  // Сбор метрик
  hooks.on('request:after', async (data) => {
    const { req, res } = data;
    
    requestCount++;
    
    if (res.startTime) {
      const responseTime = Date.now() - res.startTime;
      responseTimeSum += responseTime;
    }
  }, 50);
  
  // API для получения метрик
  app.get('/api/metrics/requests', (req, res) => {
    res.json({
      totalRequests: requestCount,
      averageResponseTime: requestCount > 0 ? responseTimeSum / requestCount : 0
    });
  });
  
  // Периодическая отправка метрик
  setInterval(() => {
    if (requestCount > 0) {
      console.log(`Requests: ${requestCount}, Avg Response Time: ${responseTimeSum / requestCount}ms`);
    }
  }, 60000); // каждую минуту
  
  return {
    name: 'monitoring-plugin',
    version: '1.0.0',
    hooks: ['request:after'],
    routes: ['/api/metrics/requests']
  };
}
```

#### Плагин для кэширования
```typescript
// plugins/cache-plugin/plugin.json
{
  "name": "cache-plugin",
  "version": "1.0.0",
  "description": "Redis caching plugin",
  "author": "Cache Team",
  "license": "MIT",
  "dependencies": [],
  "entryPoint": "index.js",
  "hooks": [
    {
      "name": "cache:before",
      "event": "request:before",
      "priority": 200
    },
    {
      "name": "cache:after",
      "event": "request:after",
      "priority": 200
    }
  ]
}

// plugins/cache-plugin/index.js
export default function(Api, context) {
  const { app, hooks, config } = context;
  
  const redis = require('redis');
  const client = redis.createClient(config.redisUrl);
  
  // Кэширование GET запросов
  hooks.on('request:before', async (req) => {
    if (req.method === 'GET' && req.path.startsWith('/api/cacheable')) {
      const cacheKey = `cache:${req.method}:${req.path}:${JSON.stringify(req.query)}`;
      const cached = await client.get(cacheKey);
      
      if (cached) {
        req.setParam('cached', true);
        req.setParam('cachedData', JSON.parse(cached));
      }
    }
    
    return req;
  }, 200);
  
  hooks.on('request:after', async (data) => {
    const { req, res } = data;
    
    if (req.method === 'GET' && req.path.startsWith('/api/cacheable') && !req.getParam('cached')) {
      const cacheKey = `cache:${req.method}:${req.path}:${JSON.stringify(req.query)}`;
      const responseData = res.locals.responseData;
      
      if (responseData) {
        await client.setex(cacheKey, 300, JSON.stringify(responseData)); // 5 минут
      }
    }
  }, 200);
  
  // Middleware для кэшируемых роутов
  app.use('/api/cacheable', (req, res, next) => {
    if (req.getParam('cached')) {
      return res.json(req.getParam('cachedData'));
    }
    
    // Перехват ответа для кэширования
    const originalJson = res.json;
    res.json = function(data) {
      res.locals.responseData = data;
      return originalJson.call(this, data);
    };
    
    next();
  });
  
  return {
    name: 'cache-plugin',
    version: '1.0.0',
    hooks: ['request:before', 'request:after'],
    routes: ['/api/cacheable/*']
  };
}
```

## План разработки

### Этап 1: Базовая инфраструктура (1-2 недели)
- [ ] Добавить зависимости плагинов в Cargo.toml
- [ ] Создать базовые структуры данных Plugin
- [ ] Реализовать Plugin Manager
- [ ] Создать систему загрузки плагинов

### Этап 2: Система хуков (1 неделя)
- [ ] Реализовать Hook Manager
- [ ] Добавить поддержку событий
- [ ] Реализовать приоритеты хуков
- [ ] Интегрировать с JavaScript API

### Этап 3: JavaScript API (1 неделя)
- [ ] Создать TypeScript интерфейсы
- [ ] Реализовать методы в RNodeApp
- [ ] Добавить Plugin Manager методы
- [ ] Реализовать контекст плагинов

### Этап 4: Расширенная функциональность (1-2 недели)
- [ ] Hot-reload плагинов
- [ ] Система разрешений
- [ ] Конфигурация плагинов
- [ ] Управление зависимостями

### Этап 5: Тестирование и документация (1 неделя)
- [ ] Написать unit тесты
- [ ] Создать примеры плагинов
- [ ] Написать документацию
- [ ] Создать руководство разработчика

## Тестирование

### Unit тесты
```typescript
// tests/plugin.test.ts
import { createApp } from 'rnode-server';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Plugin System', () => {
  let app: any;
  let pluginManager: any;
  
  beforeAll(async () => {
    app = createApp();
    pluginManager = app.plugin('test');
  });
  
  afterAll(async () => {
    // cleanup
  });
  
  it('should load plugin from directory', async () => {
    const plugin = await pluginManager.loadPlugin('./test-plugins/simple');
    
    expect(plugin.manifest.name).toBe('simple-plugin');
    expect(plugin.status).toBe('disabled');
  });
  
  it('should enable and disable plugin', async () => {
    const plugin = await pluginManager.loadPlugin('./test-plugins/simple');
    
    await pluginManager.enablePlugin('simple-plugin');
    expect(plugin.status).toBe('enabled');
    
    await pluginManager.disablePlugin('simple-plugin');
    expect(plugin.status).toBe('disabled');
  });
});
```

### Интеграционные тесты
```typescript
// tests/plugin-integration.test.ts
import { createApp } from 'rnode-server';

describe('Plugin Integration', () => {
  it('should execute plugin hooks', async () => {
    // Тест выполнения хуков плагина
  });
  
  it('should handle plugin errors gracefully', async () => {
    // Тест обработки ошибок плагинов
  });
});
```

## Производительность

### Цели
- **Загрузка**: < 100ms для простых плагинов
- **Хуки**: < 1ms для выполнения хука
- **Память**: Минимальное потребление для неактивных плагинов
- **Hot-reload**: < 500ms для перезагрузки плагина

### Оптимизации
- Ленивая загрузка плагинов
- Кэширование манифестов
- Эффективная система хуков
- Изоляция плагинов

## Безопасность

### Меры защиты
- Валидация манифестов плагинов
- Система разрешений
- Изоляция выполнения
- Проверка зависимостей

## Мониторинг

### Метрики
- `plugins_loaded_total` - загруженные плагины
- `plugins_active_total` - активные плагины
- `plugin_hooks_executed_total` - выполненные хуки
- `plugin_errors_total` - ошибки плагинов

### Grafana дашборд
- Статус плагинов
- Выполнение хуков
- Ошибки и предупреждения
- Производительность плагинов

## Конфигурация

### Environment variables
```bash
# Плагины
PLUGIN_DIR=./plugins
PLUGIN_AUTO_RELOAD=true
PLUGIN_STRICT_MODE=false
PLUGIN_LOG_LEVEL=info
```

### Конфигурация приложения
```typescript
const app = createApp({
  plugins: {
    directory: process.env.PLUGIN_DIR || './plugins',
    autoReload: process.env.PLUGIN_AUTO_RELOAD === 'true',
    strictMode: process.env.PLUGIN_STRICT_MODE === 'true',
    logLevel: process.env.PLUGIN_LOG_LEVEL || 'info'
  }
});
```

## Экосистема плагинов

### Официальные плагины
- **auth-plugin** - Аутентификация и авторизация
- **cache-plugin** - Кэширование с Redis
- **monitoring-plugin** - Мониторинг и метрики
- **database-plugin** - Поддержка различных БД
- **email-plugin** - Отправка email

### Сообщество плагинов
- **payment-plugin** - Интеграция с платежными системами
- **social-plugin** - Социальные сети интеграция
- **analytics-plugin** - Аналитика и отчеты
- **backup-plugin** - Резервное копирование
- **cdn-plugin** - CDN интеграция

## Заключение

Система плагинов для RNode Server обеспечит:
- **Модульность** и расширяемость приложений
- **Переиспользование** кода между проектами
- **Экосистему** плагинов для различных задач
- **Гибкость** в настройке и конфигурации
- **Производительность** с минимальными накладными расходами

Это позволит RNode Server стать не просто высокопроизводительным сервером, а полноценной платформой с богатой экосистемой плагинов для различных сценариев использования.
