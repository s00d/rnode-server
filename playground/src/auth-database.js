import Database from 'better-sqlite3';
import crypto from 'crypto';

class AuthDatabase {
  constructor(dbPath = 'auth.db') {
    try {
      this.db = new Database(dbPath);
      this.init();
      console.log('✅ Auth database connected:', dbPath);
    } catch (error) {
      console.error('❌ Auth database connection failed:', error);
      throw error;
    }
  }

  init() {
    try {
      // Таблица пользователей
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          salt TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT 1
        )
      `);

      // Таблица сессий
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          session_id TEXT UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME NOT NULL,
          is_active BOOLEAN DEFAULT 1,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);

      // Индексы для производительности
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
        CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
        CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions (session_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
      `);

      console.log('✅ Auth database tables initialized');
    } catch (error) {
      console.error('❌ Failed to initialize auth database:', error);
      throw error;
    }
  }

  // Хеширование пароля
  hashPassword(password) {
    const salt = crypto.randomBytes(32).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return { hash, salt };
  }

  // Проверка пароля
  verifyPassword(password, hash, salt) {
    const hashToCheck = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === hashToCheck;
  }

  // Генерация session ID
  generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Регистрация пользователя
  registerUser(userData) {
    const { username, email, password } = userData;

    try {
      // Проверяем существование пользователя
      const existingUser = this.db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
      
      if (existingUser) {
        return {
          success: false,
          message: 'Пользователь с таким email или username уже существует'
        };
      }

      // Хешируем пароль
      const { hash, salt } = this.hashPassword(password);

      // Создаем пользователя
      const insertUser = this.db.prepare(`
        INSERT INTO users (username, email, password_hash, salt)
        VALUES (?, ?, ?, ?)
      `);

      const result = insertUser.run(username, email, hash, salt);

      return {
        success: true,
        message: 'Пользователь успешно зарегистрирован',
        userId: result.lastInsertRowid
      };

    } catch (error) {
      console.error('Ошибка при регистрации:', error);
      return {
        success: false,
        message: 'Ошибка сервера при регистрации'
      };
    }
  }

  // Авторизация пользователя
  loginUser(email, password) {
    try {
      // Находим пользователя
      const user = this.db.prepare(`
        SELECT id, username, email, password_hash, salt, is_active 
        FROM users 
        WHERE email = ?
      `).get(email);

      if (!user || !user.is_active) {
        return {
          success: false,
          message: 'Неверный email или password'
        };
      }

      // Проверяем пароль
      if (!this.verifyPassword(password, user.password_hash, user.salt)) {
        return {
          success: false,
          message: 'Неверный email или password'
        };
      }

      // Создаем новую сессию
      const sessionId = this.generateSessionId();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 часа

      const insertSession = this.db.prepare(`
        INSERT INTO sessions (user_id, session_id, expires_at)
        VALUES (?, ?, ?)
      `);

      insertSession.run(user.id, sessionId, expiresAt.toISOString());

      return {
        success: true,
        message: 'Успешная авторизация',
        userId: user.id,
        sessionId: sessionId,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      };

    } catch (error) {
      console.error('Ошибка при авторизации:', error);
      return {
        success: false,
        message: 'Ошибка сервера при авторизации'
      };
    }
  }

  // Проверка сессии
  validateSession(sessionId) {
    try {
      const session = this.db.prepare(`
        SELECT s.*, u.id as user_id, u.username, u.email, u.is_active
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.session_id = ? AND s.is_active = 1 AND u.is_active = 1
      `).get(sessionId);

      if (!session) {
        return {
          success: false,
          message: 'Сессия не найдена'
        };
      }

      // Проверяем срок действия
      const now = new Date();
      const expiresAt = new Date(session.expires_at);

      if (now > expiresAt) {
        // Деактивируем истекшую сессию
        this.db.prepare('UPDATE sessions SET is_active = 0 WHERE session_id = ?').run(sessionId);
        
        return {
          success: false,
          message: 'Сессия истекла'
        };
      }

      return {
        success: true,
        userId: session.user_id,
        user: {
          id: session.user_id,
          username: session.username,
          email: session.email
        }
      };

    } catch (error) {
      console.error('Ошибка при проверке сессии:', error);
      return {
        success: false,
        message: 'Ошибка сервера при проверке сессии'
      };
    }
  }

  // Получение профиля пользователя
  getUserProfile(userId) {
    try {
      const user = this.db.prepare(`
        SELECT id, username, email, created_at, updated_at
        FROM users 
        WHERE id = ? AND is_active = 1
      `).get(userId);

      if (!user) {
        return {
          success: false,
          message: 'Пользователь не найден'
        };
      }

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        }
      };

    } catch (error) {
      console.error('Ошибка при получении профиля:', error);
      return {
        success: false,
        message: 'Ошибка сервера при получении профиля'
      };
    }
  }

  // Выход из системы (деактивация сессии)
  logoutUser(sessionId) {
    try {
      const result = this.db.prepare(`
        UPDATE sessions SET is_active = 0 
        WHERE session_id = ?
      `).run(sessionId);

      return {
        success: true,
        message: 'Успешный выход из системы'
      };

    } catch (error) {
      console.error('Ошибка при выходе:', error);
      return {
        success: false,
        message: 'Ошибка сервера при выходе'
      };
    }
  }

  // Очистка истекших сессий
  cleanupExpiredSessions() {
    try {
      const result = this.db.prepare(`
        UPDATE sessions SET is_active = 0 
        WHERE expires_at < datetime('now') AND is_active = 1
      `).run();

      console.log(`🧹 Очищено истекших сессий: ${result.changes}`);
      return result.changes;

    } catch (error) {
      console.error('Ошибка при очистке сессий:', error);
      return 0;
    }
  }

  // Получение статистики
  getStats() {
    try {
      const totalUsers = this.db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').get().count;
      const activeSessions = this.db.prepare(`
        SELECT COUNT(*) as count FROM sessions 
        WHERE is_active = 1 AND expires_at > datetime('now')
      `).get().count;

      return {
        totalUsers,
        activeSessions
      };

    } catch (error) {
      console.error('Ошибка при получении статистики:', error);
      return {
        totalUsers: 0,
        activeSessions: 0
      };
    }
  }

  // Закрытие соединения
  close() {
    if (this.db) {
      this.db.close();
      console.log('✅ Auth database connection closed');
    }
  }
}

export default AuthDatabase;
