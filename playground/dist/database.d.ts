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
declare class UserDatabase {
    private db;
    constructor();
    private init;
    createUser(userData: UserData): DatabaseResult;
    getAllUsers(): DatabaseResult<User>;
    getUserById(id: number): DatabaseResult<User>;
    updateUser(id: number, userData: UserData): DatabaseResult;
    deleteUser(id: number): DatabaseResult;
    searchUsers(query: string): DatabaseResult<User>;
    close(): void;
}
export default UserDatabase;
export type { UserData, User, DatabaseResult };
