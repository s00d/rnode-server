import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class UserDatabase {
  constructor() {
    this.db = new Database(path.join(__dirname, 'users.db'));
    this.init();
  }

  init() {
    // Создаем таблицу пользователей
    const createTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        age INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    this.db.exec(createTable);
    console.log('✅ База данных инициализирована');
  }

  // Создать пользователя
  createUser(userData) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO users (name, email, age) 
        VALUES (?, ?, ?)
      `);
      
      const result = stmt.run(userData.name, userData.email, userData.age);
      
      return {
        success: true,
        id: result.lastInsertRowid,
        message: 'Пользователь создан успешно'
      };
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return {
          success: false,
          message: 'Пользователь с таким email уже существует'
        };
      }
      return {
        success: false,
        message: `Ошибка создания пользователя: ${error.message}`
      };
    }
  }

  // Получить всех пользователей
  getAllUsers() {
    try {
      const stmt = this.db.prepare('SELECT * FROM users ORDER BY created_at DESC');
      const users = stmt.all();
      
      return {
        success: true,
        users: users,
        count: users.length
      };
    } catch (error) {
      return {
        success: false,
        message: `Ошибка получения пользователей: ${error.message}`,
        users: [],
        count: 0
      };
    }
  }

  // Получить пользователя по ID
  getUserById(id) {
    try {
      const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
      const user = stmt.get(id);
      
      if (user) {
        return {
          success: true,
          user: user
        };
      } else {
        return {
          success: false,
          message: 'Пользователь не найден'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Ошибка получения пользователя: ${error.message}`
      };
    }
  }

  // Обновить пользователя
  updateUser(id, userData) {
    try {
      const stmt = this.db.prepare(`
        UPDATE users 
        SET name = ?, email = ?, age = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      const result = stmt.run(userData.name, userData.email, userData.age, id);
      
      if (result.changes > 0) {
        return {
          success: true,
          message: 'Пользователь обновлен успешно'
        };
      } else {
        return {
          success: false,
          message: 'Пользователь не найден'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Ошибка обновления пользователя: ${error.message}`
      };
    }
  }

  // Удалить пользователя
  deleteUser(id) {
    try {
      const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
      const result = stmt.run(id);
      
      if (result.changes > 0) {
        return {
          success: true,
          message: 'Пользователь удален успешно'
        };
      } else {
        return {
          success: false,
          message: 'Пользователь не найден'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Ошибка удаления пользователя: ${error.message}`
      };
    }
  }

  // Поиск пользователей по имени или email
  searchUsers(query) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM users 
        WHERE name LIKE ? OR email LIKE ?
        ORDER BY created_at DESC
      `);
      
      const searchPattern = `%${query}%`;
      const users = stmt.all(searchPattern, searchPattern);
      
      return {
        success: true,
        users: users,
        count: users.length,
        query: query
      };
    } catch (error) {
      return {
        success: false,
        message: `Ошибка поиска пользователей: ${error.message}`,
        users: [],
        count: 0,
        query: query
      };
    }
  }

  // Закрыть соединение с базой
  close() {
    this.db.close();
    console.log('🔒 Соединение с базой данных закрыто');
  }
}

export default UserDatabase;
