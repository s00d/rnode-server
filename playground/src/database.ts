import Database from 'better-sqlite3';
import path from 'path';

interface UserData {
  name: string;
  email: string;
  age?: number;
}

interface User {
  id: number;
  name: string;
  email: string;
  age: number | null;
  created_at: string;
  updated_at: string;
}

interface DatabaseResult<T = any> {
  success: boolean;
  message?: string;
  id?: number;
  users?: T[];
  count?: number;
  user?: T;
  query?: string;
}

class UserDatabase {
  private db: Database.Database;

  constructor() {
    this.db = new Database(path.join(process.cwd(), 'users.db'));
    this.init();
  }

  private init(): void {
    // Create users table
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
    console.log('✅ Database initialized');
  }

  // Create user
  createUser(userData: UserData): DatabaseResult {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO users (name, email, age) 
        VALUES (?, ?, ?)
      `);
      
      const result = stmt.run(userData.name, userData.email, userData.age);
      
      return {
        success: true,
        id: Number(result.lastInsertRowid),
        message: 'User created successfully'
      };
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return {
          success: false,
          message: 'User with this email already exists'
        };
      }
      return {
        success: false,
        message: `Error creating user: ${error.message}`
      };
    }
  }

  // Get all users
  getAllUsers(): DatabaseResult<User> {
    try {
      const stmt = this.db.prepare('SELECT * FROM users ORDER BY created_at DESC');
      const users = stmt.all() as User[];
      
      return {
        success: true,
        users: users,
        count: users.length
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Error getting users: ${error.message}`,
        users: [],
        count: 0
      };
    }
  }

  // Get user by ID
  getUserById(id: number): DatabaseResult<User> {
    try {
      const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
      const user = stmt.get(id) as User | undefined;
      
      if (user) {
        return {
          success: true,
          user: user
        };
      } else {
        return {
          success: false,
          message: 'User not found'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Error getting user: ${error.message}`
      };
    }
  }

  // Update user
  updateUser(id: number, userData: UserData): DatabaseResult {
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
          message: 'User updated successfully'
        };
      } else {
        return {
          success: false,
          message: 'User not found'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Error updating user: ${error.message}`
      };
    }
  }

  // Delete user
  deleteUser(id: number): DatabaseResult {
    try {
      const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
      const result = stmt.run(id);
      
      if (result.changes > 0) {
        return {
          success: true,
          message: 'User deleted successfully'
        };
      } else {
        return {
          success: false,
          message: 'User not found'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Error deleting user: ${error.message}`
      };
    }
  }

  // Search users by name or email
  searchUsers(query: string): DatabaseResult<User> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM users 
        WHERE name LIKE ? OR email LIKE ?
        ORDER BY created_at DESC
      `);
      
      const searchPattern = `%${query}%`;
      const users = stmt.all(searchPattern, searchPattern) as User[];
      
      return {
        success: true,
        users: users,
        count: users.length,
        query: query
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Error searching users: ${error.message}`,
        users: [],
        count: 0,
        query: query
      };
    }
  }

  // Close database connection
  close(): void {
    this.db.close();
    console.log('🔒 Database connection closed');
  }
}

export default UserDatabase;
export type { UserData, User, DatabaseResult };
