import { createApp, Router } from 'rnode-server';
import UserDatabase from './database.js';
import AuthDatabase from './auth-database.js';

const app = createApp();
const port = 4546;

// Инициализируем базы данных
const db = new UserDatabase();
const authDb = new AuthDatabase();

// Очищаем истекшие сессии при запуске
authDb.cleanupExpiredSessions();

// Загружаем статические файлы в память
app.static('./public');

// Глобальный middleware для логирования всех запросов и авторизации
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`📋 [${timestamp}] ${req.method} ${req.url} - Global middleware`);

  // Устанавливаем глобальные параметры для всех запросов
  req.setParam('requestId', Math.random().toString(36).substr(2, 9));
  req.setParam('timestamp', Date.now());
  req.setParam('globalMiddleware', true);

  // Получаем sessionId из куки
  const sessionId = req.getCookie('sessionId');
  if (sessionId) {
    console.log('🍪 Найдена сессия в куки:', sessionId);

    // Валидируем сессию и получаем пользователя
    const sessionResult = authDb.validateSession(sessionId);
    if (sessionResult.success) {
      req.setParam('userId', sessionResult.userId);
      req.setParam('user', sessionResult.user);
      req.setParam('isAuthenticated', true);
      console.log('✅ Пользователь авторизован:', sessionResult.user.username);
    } else {
      console.log('❌ Сессия недействительна:', sessionResult.message);
      // Очищаем недействительную куку
      res.setCookie('sessionId', '', { maxAge: 0 });
      req.setParam('isAuthenticated', false);
    }
  } else {
    req.setParam('isAuthenticated', false);
    console.log('🔒 Пользователь не авторизован');
  }

  console.log('🌐 Установлены глобальные параметры:', req.getParams());

  next();
});

// GET маршрут для демонстрации глобального middleware
app.get('/hello', (req, res) => {
  console.log('👋 Hello обработчик - параметры из глобального middleware:', req.getParams());

  // Добавляем свои параметры
  req.setParam('handlerName', 'hello');
  req.setParam('message', 'Hello World!');

  res.json({
    message: 'Hello World!',
    globalParams: req.getParams(),
    info: 'Этот ответ содержит параметры из глобального middleware',
    auth: {
      isAuthenticated: req.getParam('isAuthenticated'),
      user: req.getParam('user'),
      userId: req.getParam('userId')
    }
  });
});

// Простой тестовый маршрут
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API работает!',
    timestamp: new Date().toISOString()
  });
});

// Тестовый маршрут для проверки CORS
app.get('/api/cors-test', (req, res) => {
  try {
    console.log('=== GET /api/cors-test ===');

    // Проверяем что методы существуют
    if (typeof req.getHeader !== 'function') {
      throw new Error('req.getHeader не является функцией');
    }

    console.log('Origin header:', req.getHeader('origin'));
    console.log('User-Agent header:', req.getHeader('user-agent'));

    // Устанавливаем тестовые cookies и заголовки
    res.setCookie('testCookie', 'testValue', { maxAge: 3600000 });
    res.setCookie('sessionId', 'abc123', { httpOnly: true });
    res.setHeader('X-Custom-Header', 'test-value');
    res.setHeader('X-Response-Time', Date.now().toString());

    // Явно устанавливаем Content-Type
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    // Получаем установленные cookies и заголовки
    const setCookies = res.getCookies();
    const setHeaders = res.getHeaders();

    res.json({
      success: true,
      message: 'CORS работает!',
      origin: req.getHeader('origin'),
      userAgent: req.getHeader('user-agent'),
      timestamp: new Date().toISOString(),
      corsInfo: {
        message: 'CORS заголовки установлены middleware',
        allowOrigin: '*',
        allowMethods: 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        allowHeaders: 'Content-Type, Authorization, X-Requested-With, X-Custom-Header'
      },
      // Демонстрируем новые методы
      setCookies: setCookies,
      setHeaders: setHeaders
    });
  } catch (error) {
    console.error('Ошибка в /api/cors-test:', error);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json({
      success: false,
      message: 'Ошибка: ' + error.message,
      error: error.stack
    });
  }
});

// ===== СОЗДАНИЕ РОУТЕРА ДЛЯ ПОЛЬЗОВАТЕЛЕЙ =====

// Создаем роутер для пользователей
const usersRouter = Router();

// Middleware для роутера пользователей
usersRouter.use((req, res, next) => {
  console.log('👥 Users Router Middleware:', req.method, req.url);
  req.setParam('routerName', 'users');
  next();
});

// POST маршрут для создания пользователя
usersRouter.post('', (req, res) => {
  console.log('=== POST /api/users ===');
  console.log('Body:', req.body);

  try {
    // Парсим body если это JSON
    let userData = req.body;
    if (typeof req.body === 'string') {
      try {
        userData = JSON.parse(req.body);
      } catch (e) {
        userData = { name: req.body, email: '', age: null };
      }
    }

    // Проверяем обязательные поля
    if (!userData.name || !userData.email) {
      return res.json({
        success: false,
        message: 'Имя и email обязательны'
      });
    }

    // Создаем пользователя в базе
    const result = db.createUser(userData);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        userId: result.id,
        user: userData
      });
    } else {
      res.json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    res.json({
      success: false,
      message: `Ошибка: ${error.message}`
    });
  }
});

// GET маршрут для получения всех пользователей
usersRouter.get('', (req, res) => {
  console.log('=== GET /api/users ===');

  const result = db.getAllUsers();
  res.json(result);
});

// GET маршрут с параметрами для получения пользователя по ID
usersRouter.get('/{id}', (req, res) => {
  console.log('=== GET /api/users/:id ===');
  console.log('ID:', req.params.id);

  const userId = parseInt(req.params.id);
  if (isNaN(userId)) {
    return res.json({
      success: false,
      message: 'Неверный ID пользователя'
    });
  }

  const result = db.getUserById(userId);
  res.json(result);
});

// PUT маршрут для обновления пользователя
usersRouter.put('/{id}', (req, res) => {
  console.log('=== PUT /api/users/:id ===');
  console.log('ID:', req.params.id);
  console.log('Body:', req.body);

  const userId = parseInt(req.params.id);
  if (isNaN(userId)) {
    return res.json({
      success: false,
      message: 'Неверный ID пользователя'
    });
  }

  try {
    let userData = req.body;
    if (typeof req.body === 'string') {
      try {
        userData = JSON.parse(req.body);
      } catch (e) {
        userData = { name: req.body, email: '', age: null };
      }
    }

    if (!userData.name || !userData.email) {
      return res.json({
        success: false,
        message: 'Имя и email обязательны'
      });
    }

    const result = db.updateUser(userId, userData);
    res.json(result);
  } catch (error) {
    res.json({
      success: false,
      message: `Ошибка: ${error.message}`
    });
  }
});

// DELETE маршрут для удаления пользователя
usersRouter.delete('/{id}', (req, res) => {
  console.log('=== DELETE /api/users/:id ===');
  console.log('ID:', req.params.id);

  const userId = parseInt(req.params.id);
  if (isNaN(userId)) {
    return res.json({
      success: false,
      message: 'Неверный ID пользователя'
    });
  }

  const result = db.deleteUser(userId);
  res.json(result);
});

// GET маршрут для поиска пользователей
usersRouter.get('/search/{query}', (req, res) => {
  console.log('=== GET /api/users/search/:query ===');
  console.log('Query:', req.params.query);

  const result = db.searchUsers(req.params.query);
  res.json(result);
});

app.useRouter('/api/users', usersRouter);

// Маршрут для работы с cookies
app.get('/api/cookies', (req, res) => {
  console.log('=== GET /api/cookies ===');
  console.log('Cookies:', req.cookies);
  console.log('Headers:', req.headers);

  // Демонстрируем использование хелперов
  console.log('Session ID:', req.getCookie('sessionId'));
  console.log('Has theme cookie:', req.hasCookie('theme'));
  console.log('User-Agent header:', req.getHeader('user-agent'));
  console.log('Has Accept header:', req.hasHeader('accept'));

  // Получаем все cookies и заголовки в JSON
  const allCookies = req.getCookies();
  const allHeaders = req.getHeaders();
  console.log('All cookies (JSON):', allCookies);
  console.log('All headers (JSON):', allHeaders);

  // Устанавливаем несколько cookies используя setCookie
  res.setCookie('sessionId', 'abc123', {
    httpOnly: true,
    maxAge: 3600000, // 1 час
    path: '/'
  });

  res.setCookie('theme', 'dark', {
    maxAge: 86400000, // 24 часа
    path: '/'
  });

  res.setCookie('language', 'ru', {
    maxAge: 31536000000, // 1 год
    path: '/'
  });

  // Устанавливаем заголовки
  res.setHeader('X-Custom-Header', 'RNode-Server');
  res.setHeader('X-Response-Time', Date.now().toString());

  res.json({
    success: true,
    message: 'Cookies и заголовки установлены',
    receivedCookies: req.cookies,
    receivedHeaders: req.headers,
    // Демонстрируем работу хелперов
    cookieHelpers: {
      sessionId: req.getCookie('sessionId'),
      hasTheme: req.hasCookie('theme'),
      hasLanguage: req.hasCookie('language')
    },
    headerHelpers: {
      userAgent: req.getHeader('user-agent'),
      hasAccept: req.hasHeader('accept'),
      hasContentType: req.hasHeader('content-type')
    },
    // Новые методы для получения всех данных
    allCookies: allCookies,
    allHeaders: allHeaders
  });
});


// Маршрут для удаления cookies
app.delete('/api/cookies/{name}', (req, res) => {
  console.log('=== DELETE /api/cookies/:name ===');
  console.log('Cookie name:', req.params.name);

  // Удаляем cookie
  res.cookie(req.params.name, '', {
    maxAge: 0,
    path: '/'
  });

  res.json({
    success: true,
    message: `Cookie '${req.params.name}' удален`
  });
});

// Маршрут для получения информации о cookies
app.get('/api/cookies/info', (req, res) => {
  console.log('=== GET /api/cookies/info ===');

  // Парсим cookies строку
  const cookiesStr = req.cookies || '';
  const cookies = {};

  if (cookiesStr) {
    cookiesStr.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = value;
      }
    });
  }

  res.json({
    success: true,
    rawCookies: req.cookies,
    parsedCookies: cookies,
    cookieCount: Object.keys(cookies).length,
    headers: req.headers
  });
});

// Маршрут для демонстрации всех хелперов
app.get('/api/helpers', (req, res) => {
  console.log('=== GET /api/helpers ===');

  // Демонстрируем все хелперы
  const cookieHelpers = {
    rawCookies: req.cookies,
    sessionId: req.getCookie('sessionId'),
    theme: req.getCookie('theme'),
    language: req.getCookie('language'),
    hasSessionId: req.hasCookie('sessionId'),
    hasTheme: req.hasCookie('theme'),
    hasLanguage: req.hasCookie('language'),
    hasNonExistent: req.hasCookie('nonExistent'),
    allCookies: req.getCookies() // Новый метод
  };

  const headerHelpers = {
    rawHeaders: req.headers,
    userAgent: req.getHeader('user-agent'),
    accept: req.getHeader('accept'),
    contentType: req.getHeader('content-type'),
    hasUserAgent: req.hasHeader('user-agent'),
    hasAccept: req.hasHeader('accept'),
    hasContentType: req.hasHeader('content-type'),
    hasNonExistent: req.hasHeader('non-existent-header'),
    allHeaders: req.getHeaders() // Новый метод
  };

  // Устанавливаем тестовые cookies и заголовки
  res.setCookie('testCookie', 'testValue', { maxAge: 3600000 });
  res.setHeader('X-Test-Header', 'test-value');

  res.json({
    success: true,
    message: 'Демонстрация всех хелперов',
    cookieHelpers,
    headerHelpers,
    timestamp: new Date().toISOString()
  });
});

// CORS middleware только для API маршрутов
app.use('/api', (req, res, next) => {
  console.log('🌐 CORS middleware для API:', req.method, req.url);

  // Разрешаем все origins (можно ограничить для продакшена)
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Разрешаем все методы
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');

  // Разрешаем все заголовки
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Custom-Header');

  // Разрешаем credentials (cookies, authorization headers)
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Максимальное время кеширования preflight запроса
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 часа

  // Устанавливаем Content-Type с кодировкой для всех API ответов
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // Дополнительные заголовки для лучшей совместимости
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Обрабатываем preflight OPTIONS запросы
  if (req.method === 'OPTIONS') {
    // Отправляем пустой JSON ответ вместо res.end()
    res.json({ success: true, message: 'Preflight OK' });
    return;
  }

  // Продолжаем выполнение для других запросов
  next();
});

// Middleware для проверки авторизации на /api/auth/* (кроме login и register)
app.use('/api/auth', (req, res, next) => {
  console.log('🔐 Auth middleware для:', req.method, req.url);

  // Пропускаем регистрацию и логин
  if (req.url === '/register' || req.url === '/login') {
    console.log('✅ Пропускаем auth middleware для:', req.url);
    return next();
  }

  // Проверяем, что пользователь уже авторизован (установлен глобальным middleware)
  if (!req.getParam('isAuthenticated')) {
    console.log('❌ Пользователь не авторизован');
    return res.status(401).json({
      success: false,
      message: 'Требуется авторизация. Войдите в систему.',
      error: 'Unauthorized'
    });
  }

  console.log('✅ Auth middleware: пользователь уже авторизован через глобальный middleware');
  console.log('📝 Параметры пользователя:', req.getParams());

  next();
});

// Регистрируем роутер аутентификации

// ===== СОЗДАНИЕ РОУТЕРА ДЛЯ АВТОРИЗАЦИИ =====

// Создаем роутер для аутентификации
const authRouter = Router();

// Демонстрируем, что Router наследует все методы ExpressApp
console.log('🔧 Router методы:', Object.getOwnPropertyNames(Object.getPrototypeOf(authRouter)));

// Middleware для роутера аутентификации
authRouter.use((req, res, next) => {
  console.log('🔐 Auth Router Middleware:', req.method, req.url);
  req.setParam('routerName', 'auth');
  next();
});

// POST /api/auth/register - Регистрация пользователя
authRouter.post('/register', (req, res) => {
  console.log('=== POST /api/auth/register ===');
  console.log('Body:', req.body);

  try {
    let userData = req.body;
    if (typeof req.body === 'string') {
      try {
        userData = JSON.parse(req.body);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Неверный формат данных'
        });
      }
    }

    // Проверяем обязательные поля
    if (!userData.username || !userData.email || !userData.password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email и password обязательны'
      });
    }

    // Регистрируем пользователя через SQLite
    const registrationResult = authDb.registerUser(userData);

    if (!registrationResult.success) {
      return res.status(400).json(registrationResult);
    }

    // После успешной регистрации автоматически авторизуем пользователя
    const loginResult = authDb.loginUser(userData.email, userData.password);

    if (!loginResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Пользователь зарегистрирован, но не удалось авторизоваться'
      });
    }

    // Устанавливаем cookies для сессии
    res.setCookie('sessionId', loginResult.sessionId, {
      httpOnly: true,
      maxAge: 86400000, // 24 часа
      path: '/'
    });

    res.json({
      success: true,
      message: 'Пользователь успешно зарегистрирован и авторизован',
      userId: loginResult.userId,
      sessionId: loginResult.sessionId,
      user: loginResult.user
    });

  } catch (error) {
    console.error('Ошибка при регистрации:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при регистрации',
      error: error.message
    });
  }
});

// POST /api/auth/login - Авторизация пользователя
authRouter.post('/login', (req, res) => {
  console.log('=== POST /api/auth/login ===');
  console.log('Body:', req.body);

  try {
    let loginData = req.body;
    if (typeof req.body === 'string') {
      try {
        loginData = JSON.parse(req.body);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Неверный формат данных'
        });
      }
    }

    // Проверяем обязательные поля
    if (!loginData.email || !loginData.password) {
      return res.status(400).json({
        success: false,
        message: 'Email и password обязательны'
      });
    }

    // Авторизуем пользователя через SQLite
    const loginResult = authDb.loginUser(loginData.email, loginData.password);

    if (!loginResult.success) {
      return res.status(401).json(loginResult);
    }

    // Устанавливаем cookies для сессии
    res.setCookie('sessionId', loginResult.sessionId, {
      httpOnly: true,
      maxAge: 86400000, // 24 часа
      path: '/'
    });

    res.json({
      success: true,
      message: loginResult.message,
      userId: loginResult.userId,
      sessionId: loginResult.sessionId,
      user: loginResult.user
    });

  } catch (error) {
    console.error('Ошибка при авторизации:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при авторизации',
      error: error.message
    });
  }
});

// POST /api/auth/logout - Выход из системы
authRouter.post('/logout', (req, res) => {
  console.log('=== POST /api/auth/logout ===');

  const sessionId = req.getCookie('sessionId');

  if (sessionId) {
    // Деактивируем сессию в базе данных
    const logoutResult = authDb.logoutUser(sessionId);
    console.log('Результат выхода из системы:', logoutResult.message);
  }

  // Удаляем cookies сессии
  res.setCookie('sessionId', '', {
    maxAge: 0,
    path: '/'
  });

  res.json({
    success: true,
    message: 'Успешный выход из системы'
  });
});

// GET /api/auth/profile - Получение профиля пользователя (защищенный маршрут)
authRouter.get('/profile', (req, res) => {
  console.log('=== GET /api/auth/profile ===');

  // Демонстрируем использование новых методов
  console.log('📝 Все параметры из middleware:', req.getParams());
  console.log('🔍 Проверяем наличие параметров:');
  console.log('  - userId:', req.hasParam('userId') ? '✅' : '❌');
  console.log('  - user:', req.hasParam('user') ? '✅' : '❌');
  console.log('  - isAuthenticated:', req.hasParam('isAuthenticated') ? '✅' : '❌');
  console.log('  - nonExistent:', req.hasParam('nonExistent') ? '✅' : '❌');

  // Получаем параметры через новые методы
  const userId = req.getParam('userId');
  const user = req.getParam('user');
  const isAuthenticated = req.getParam('isAuthenticated');

  console.log('📊 Полученные параметры:');
  console.log('  - userId:', userId);
  console.log('  - user:', user);
  console.log('  - isAuthenticated:', isAuthenticated);

  // Получаем полный профиль пользователя из базы данных
  const profileResult = authDb.getUserProfile(userId);

  if (!profileResult.success) {
    return res.status(404).json(profileResult);
  }

  // Этот маршрут защищен middleware, поэтому параметры доступны
  res.json({
    success: true,
    message: 'Профиль пользователя',
    userId: userId,
    user: user,
    profile: profileResult.user,
    // Демонстрируем все установленные параметры
    allParams: req.getParams()
  });
});

// Тестовый маршрут для демонстрации работы с параметрами
authRouter.get('/test-params', (req, res) => {
  console.log('=== GET /api/auth/test-params ===');

  // Устанавливаем дополнительные параметры в обработчике
  req.setParam('handlerParam', 'value_from_handler');
  req.setParam('timestamp', Date.now());
  req.setParam('random', Math.random());

  console.log('📝 Параметры после установки в обработчике:', req.getParams());

  // Демонстрируем все возможности
  res.json({
    success: true,
    message: 'Тест параметров',
    // Параметры из глобального middleware
    globalParams: {
      isAuthenticated: req.getParam('isAuthenticated'),
      user: req.getParam('user'),
      userId: req.getParam('userId'),
      requestId: req.getParam('requestId'),
      timestamp: req.getParam('timestamp')
    },
    // Параметры из обработчика
    handlerParams: {
      handlerParam: req.getParam('handlerParam'),
      timestamp: req.getParam('timestamp'),
      random: req.getParam('random')
    },
    // Все параметры
    allParams: req.getParams(),
    // Проверки наличия
    checks: {
      hasUserId: req.hasParam('userId'),
      hasHandlerParam: req.hasParam('handlerParam'),
      hasNonExistent: req.hasParam('nonExistent'),
      hasIsAuthenticated: req.hasParam('isAuthenticated')
    }
  });
});


app.useRouter('/api/auth', authRouter);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🔄 Завершение работы сервера...');
  db.close();
  authDb.close();
  process.exit(0);
});

// Запуск сервера
app.listen(port, () => {
  console.log(`🚀 Сервер запущен на порту ${port}`);
  console.log(`�� База данных SQLite: users.db`);
  console.log(`🔗 API endpoints:`);
  console.log(`   📝 Пользователи:`);
  console.log(`      POST   /api/users - создать пользователя`);
  console.log(`      GET    /api/users - получить всех пользователей`);
  console.log(`      GET    /api/users/{id} - получить пользователя по ID`);
  console.log(`      PUT    /api/users/{id} - обновить пользователя`);
  console.log(`      DELETE /api/users/{id} - удалить пользователя`);
  console.log(`      GET    /api/users/search/{query} - поиск пользователей`);
  console.log(`   🔐 Авторизация:`);
  console.log(`      POST   /api/auth/register - регистрация`);
  console.log(`      POST   /api/auth/login - вход в систему`);
  console.log(`      POST   /api/auth/logout - выход из системы`);
  console.log(`      GET    /api/auth/profile - профиль пользователя`);
  console.log(`      GET    /api/auth/test-params - тест параметров`);
  console.log(`   🌐 Веб-интерфейс:`);
  console.log(`      GET    / - главная страница`);
  console.log(`      GET    /auth/ - страница авторизации`);
  console.log(`   🔧 Утилиты:`);
  console.log(`      GET    /api/test - тест API`);
  console.log(`      GET    /api/cors-test - тест CORS`);
  console.log(`      GET    /api/cookies - работа с cookies`);
  console.log(`      GET    /api/helpers - все хелперы`);
  console.log(`   📊 Middleware:`);
  console.log(`      Глобальный middleware для /*`);
  console.log(`      CORS для /api/*`);
  console.log(`      Auth для /api/auth/*`);
  console.log(`      Статические файлы для /*`);
  console.log(`   🚀 Роутеры:`);
  console.log(`      /api/auth/* - роутер аутентификации`);
  console.log(`      /api/users/* - роутер пользователей`);
});
