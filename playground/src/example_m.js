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

app.useRouter('/api/users', usersRouter);

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

// Запуск сервера
app.listen(port, () => {
  console.log(`🚀 Сервер запущен на порту ${port}`);
  console.log(`�� База данных SQLite: users.db`);
  console.log(`🔗 API endpoints:`);
  console.log(`   📝 Пользователи:`);
  console.log(`      POST   /api/users - создать пользователя`);
  console.log(`      GET    /api/users - получить всех пользователей`);
});
