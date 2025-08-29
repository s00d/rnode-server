"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
class UserDatabase {
    db;
    constructor() {
        this.db = new better_sqlite3_1.default(path_1.default.join(process.cwd(), 'users.db'));
        this.init();
    }
    init() {
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
    createUser(userData) {
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
        }
        catch (error) {
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
    getAllUsers() {
        try {
            const stmt = this.db.prepare('SELECT * FROM users ORDER BY created_at DESC');
            const users = stmt.all();
            return {
                success: true,
                users: users,
                count: users.length
            };
        }
        catch (error) {
            return {
                success: false,
                message: `Error getting users: ${error.message}`,
                users: [],
                count: 0
            };
        }
    }
    // Get user by ID
    getUserById(id) {
        try {
            const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
            const user = stmt.get(id);
            if (user) {
                return {
                    success: true,
                    user: user
                };
            }
            else {
                return {
                    success: false,
                    message: 'User not found'
                };
            }
        }
        catch (error) {
            return {
                success: false,
                message: `Error getting user: ${error.message}`
            };
        }
    }
    // Update user
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
                    message: 'User updated successfully'
                };
            }
            else {
                return {
                    success: false,
                    message: 'User not found'
                };
            }
        }
        catch (error) {
            return {
                success: false,
                message: `Error updating user: ${error.message}`
            };
        }
    }
    // Delete user
    deleteUser(id) {
        try {
            const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
            const result = stmt.run(id);
            if (result.changes > 0) {
                return {
                    success: true,
                    message: 'User deleted successfully'
                };
            }
            else {
                return {
                    success: false,
                    message: 'User not found'
                };
            }
        }
        catch (error) {
            return {
                success: false,
                message: `Error deleting user: ${error.message}`
            };
        }
    }
    // Search users by name or email
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
        }
        catch (error) {
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
    close() {
        this.db.close();
        console.log('🔒 Database connection closed');
    }
}
exports.default = UserDatabase;
