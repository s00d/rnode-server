import Database from 'better-sqlite3';
import crypto from 'crypto';
import path from 'path';

interface UserData {
  username: string;
  email: string;
  password: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  salt: string;
  created_at: string;
  updated_at: string;
  is_active: number;
}

interface Session {
  id: number;
  user_id: number;
  session_id: string;
  created_at: string;
  expires_at: string;
  is_active: number;
}

interface AuthResult<T = any> {
  success: boolean;
  message?: string;
  userId?: number;
  sessionId?: string;
  user?: T;
}

interface PasswordHash {
  hash: string;
  salt: string;
}

interface UserProfile {
  id: number;
  username: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  totalUsers: number;
  activeSessions: number;
}

class AuthDatabase {
  private db: Database.Database;

  constructor(dbPath: string = path.join(process.cwd(), 'auth.db')) {
    try {
      this.db = new Database(dbPath);
      this.init();
      console.log('✅ Auth database connected:', dbPath);
    } catch (error) {
      console.error('❌ Auth database connection failed:', error);
      throw error;
    }
  }

  private init(): void {
    try {
      // Users table
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

      // Sessions table
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

      // Indexes for performance
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

  // Password hashing
  private hashPassword(password: string): PasswordHash {
    const salt = crypto.randomBytes(32).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return { hash, salt };
  }

  // Password verification
  private verifyPassword(password: string, hash: string, salt: string): boolean {
    const hashToCheck = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === hashToCheck;
  }

  // Session ID generation
  private generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // User registration
  registerUser(userData: UserData): AuthResult {
    const { username, email, password } = userData;

    try {
      // Check if user exists
      const existingUser = this.db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username) as User | undefined;
      
      if (existingUser) {
        return {
          success: false,
          message: 'User with this email or username already exists'
        };
      }

      // Hash password
      const { hash, salt } = this.hashPassword(password);

      // Create user
      const insertUser = this.db.prepare(`
        INSERT INTO users (username, email, password_hash, salt)
        VALUES (?, ?, ?, ?)
      `);

      const result = insertUser.run(username, email, hash, salt);

      return {
        success: true,
        message: 'User registered successfully',
        userId: Number(result.lastInsertRowid)
      };

    } catch (error: any) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: 'Server error during registration'
      };
    }
  }

  // User authentication
  loginUser(email: string, password: string): AuthResult {
    try {
      // Find user
      const user = this.db.prepare(`
        SELECT id, username, email, password_hash, salt, is_active 
        FROM users 
        WHERE email = ?
      `).get(email) as User | undefined;

      if (!user || !user.is_active) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Verify password
      if (!this.verifyPassword(password, user.password_hash, user.salt)) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Create new session
      const sessionId = this.generateSessionId();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

      const insertSession = this.db.prepare(`
        INSERT INTO sessions (user_id, session_id, expires_at)
        VALUES (?, ?, ?)
      `);

      insertSession.run(user.id, sessionId, expiresAt.toISOString());

      return {
        success: true,
        message: 'Authentication successful',
        userId: user.id,
        sessionId: sessionId,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        }
      };

    } catch (error: any) {
      console.error('Authentication error:', error);
      return {
        success: false,
        message: 'Server error during authentication'
      };
    }
  }

  // Session validation
  validateSession(sessionId: string): AuthResult<UserProfile> {
    try {
      const session = this.db.prepare(`
        SELECT s.*, u.id as user_id, u.username, u.email, u.is_active, u.created_at, u.updated_at
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.session_id = ? AND s.is_active = 1 AND u.is_active = 1
      `).get(sessionId) as (Session & { user_id: number; username: string; email: string; is_active: number; created_at: string; updated_at: string }) | undefined;

      if (!session) {
        return {
          success: false,
          message: 'Session not found'
        };
      }

      // Check expiration
      const now = new Date();
      const expiresAt = new Date(session.expires_at);

      if (now > expiresAt) {
        // Deactivate expired session
        this.db.prepare('UPDATE sessions SET is_active = 0 WHERE session_id = ?').run(sessionId);
        
        return {
          success: false,
          message: 'Session expired'
        };
      }

      return {
        success: true,
        userId: session.user_id,
        user: {
          id: session.user_id,
          username: session.username,
          email: session.email,
          createdAt: session.created_at,
          updatedAt: session.updated_at
        }
      };

    } catch (error: any) {
      console.error('Session validation error:', error);
      return {
        success: false,
        message: 'Server error during session validation'
      };
    }
  }

  // Get user profile
  getUserProfile(userId: number): AuthResult<UserProfile> {
    try {
      const user = this.db.prepare(`
        SELECT id, username, email, created_at, updated_at
        FROM users 
        WHERE id = ? AND is_active = 1
      `).get(userId) as User | undefined;

      if (!user) {
        return {
          success: false,
          message: 'User not found'
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

    } catch (error: any) {
      console.error('Error getting profile:', error);
      return {
        success: false,
        message: 'Server error getting profile'
      };
    }
  }

  // Logout (deactivate session)
  logoutUser(sessionId: string): AuthResult {
    try {
      const result = this.db.prepare(`
        UPDATE sessions SET is_active = 0 
        WHERE session_id = ?
      `).run(sessionId);

      return {
        success: true,
        message: 'Logout successful'
      };

    } catch (error: any) {
      console.error('Logout error:', error);
      return {
        success: false,
        message: 'Server error during logout'
      };
    }
  }

  // Cleanup expired sessions
  cleanupExpiredSessions(): number {
    try {
      const result = this.db.prepare(`
        UPDATE sessions SET is_active = 0 
        WHERE expires_at < datetime('now') AND is_active = 1
      `).run();

      console.log(`🧹 Expired sessions cleaned: ${result.changes}`);
      return result.changes;

    } catch (error: any) {
      console.error('Error cleaning sessions:', error);
      return 0;
    }
  }

  // Get statistics
  getStats(): Stats {
    try {
      const totalUsers = this.db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').get() as { count: number };
      const activeSessions = this.db.prepare(`
        SELECT COUNT(*) as count FROM sessions 
        WHERE is_active = 1 AND expires_at > datetime('now')
      `).get() as { count: number };

      return {
        totalUsers: totalUsers.count,
        activeSessions: activeSessions.count
      };

    } catch (error: any) {
      console.error('Error getting statistics:', error);
      return {
        totalUsers: 0,
        activeSessions: 0
      };
    }
  }

  // Close connection
  close(): void {
    if (this.db) {
      this.db.close();
      console.log('✅ Auth database connection closed');
    }
  }
}

export default AuthDatabase;
export type { UserData, User, Session, AuthResult, UserProfile, Stats };
