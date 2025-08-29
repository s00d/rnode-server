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
declare class AuthDatabase {
    private db;
    constructor(dbPath?: string);
    private init;
    private hashPassword;
    private verifyPassword;
    private generateSessionId;
    registerUser(userData: UserData): AuthResult;
    loginUser(email: string, password: string): AuthResult;
    validateSession(sessionId: string): AuthResult<UserProfile>;
    getUserProfile(userId: number): AuthResult<UserProfile>;
    logoutUser(sessionId: string): AuthResult;
    cleanupExpiredSessions(): number;
    getStats(): Stats;
    close(): void;
}
export default AuthDatabase;
export type { UserData, User, Session, AuthResult, UserProfile, Stats };
