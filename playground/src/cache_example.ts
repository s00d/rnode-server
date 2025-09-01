import { createApp } from 'rnode-server';

// Создаем приложение
const app = createApp({ logLevel: 'debug', metrics: true, timeout: 3000, devMode: true });

// Загружаем статические файлы
app.static('./cache-test');

// Middleware для CORS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// Инициализируем кэш систему
const cache = app.cache({
    defaultTtl: 3600, // 1 час по умолчанию
    maxMemory: 100 * 1024 * 1024, // 100MB
    redisUrl: 'redis://localhost:6379',
    fileCachePath: './cache'
});

// API endpoints для тестирования кэша

// GET /api/cache/get/:key - Получить значение из кэша
app.get('/api/cache/get/{*key}', (req, res) => {
    const key = req.params.key;
    const value = cache.get(key);
    
    if (value !== null) {
        res.json({ success: true, value });
    } else {
        res.json({ success: false, message: 'Key not found' });
    }
});

// POST /api/cache/set - Установить значение в кэш
app.post('/api/cache/set', (req, res) => {
    const jsonData = req.getBodyAsJson();
    
    if (!jsonData) {
        return res.status(400).json({ success: false, message: 'Invalid JSON body' });
    }
    
    const { key, value, ttl } = jsonData;
    
    if (!key || value === undefined) {
        return res.status(400).json({ success: false, message: 'Key and value are required' });
    }
    
    const success = cache.set(key, value, { ttl: ttl || 3600 });
    res.json({ success, message: success ? 'Value cached successfully' : 'Failed to cache value' });
});

// DELETE /api/cache/delete/:key - Удалить значение из кэша
app.delete('/api/cache/delete/{*key}', (req, res) => {
    const key = req.params.key;
    const deleted = cache.delete(key);
    
    res.json({ success: deleted, message: deleted ? 'Key deleted' : 'Key not found' });
});

// GET /api/cache/exists/:key - Проверить существование ключа
app.get('/api/cache/exists/{*key}', (req, res) => {
    const key = req.params.key;
    const exists = cache.exists(key);
    
    res.json({ success: true, exists });
});

// POST /api/cache/clear - Очистить весь кэш
app.post('/api/cache/clear', (req, res) => {
    const success = cache.clear();
    res.json({ success, message: success ? 'Cache cleared' : 'Failed to clear cache' });
});

// Запускаем сервер
const PORT = parseInt(process.env.PORT || '4544');
app.listen(PORT, () => {
    console.log(`🚀 Cache test server running on port ${PORT}`);
    console.log(`📊 Cache system initialized`);
    console.log(`🔗 Test interface available at: http://localhost:${PORT}/cache-test/`);
});
