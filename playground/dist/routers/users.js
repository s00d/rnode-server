"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = void 0;
const rnode_server_1 = require("rnode-server");
const database_1 = __importDefault(require("../database"));
exports.usersRouter = (0, rnode_server_1.Router)();
const db = new database_1.default();
// Middleware for users router
exports.usersRouter.use((req, res, next) => {
    console.log('👥 Users Router Middleware:', req.method, req.url);
    req.setParam('routerName', 'users');
    next();
});
// POST route for creating user
exports.usersRouter.post('', (req, res) => {
    console.log('=== POST /api/users ===');
    console.log('Body:', req.body);
    try {
        const userData = req.getBodyAsJson();
        console.log(11111, userData);
        if (!userData || !userData.name || !userData.email) {
            res.status(400).json({
                success: false,
                message: 'Username, email are required'
            });
            return;
        }
        const { name, email, age } = userData;
        // Check required fields
        if (!name || !email) {
            res.json({
                success: false,
                message: 'Name and email are required'
            });
            return;
        }
        // Create user in database
        const result = db.createUser({ name, email, age });
        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                userId: result.id,
                user: userData
            });
        }
        else {
            res.json({
                success: false,
                message: result.message
            });
        }
    }
    catch (error) {
        res.json({
            success: false,
            message: `Error: ${error.message}`
        });
    }
});
// GET route for getting all users
exports.usersRouter.get('', (req, res) => {
    console.log('=== GET /api/users ===');
    const result = db.getAllUsers();
    res.json(result);
});
// GET route with parameters for getting user by ID
exports.usersRouter.get('/{id}', (req, res) => {
    console.log('=== GET /api/users/:id ===');
    console.log('ID:', req.params.id);
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
        res.json({
            success: false,
            message: 'Invalid user ID'
        });
        return;
    }
    const result = db.getUserById(userId);
    res.json(result);
});
// PUT route for updating user
exports.usersRouter.put('/{id}', (req, res) => {
    console.log('=== PUT /api/users/:id ===');
    console.log('ID:', req.params.id);
    console.log('Body:', req.body);
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
        res.json({
            success: false,
            message: 'Invalid user ID'
        });
        return;
    }
    try {
        const userData = req.getBodyAsJson();
        if (!userData || !userData.name || !userData.email) {
            res.status(400).json({
                success: false,
                message: 'name, email are required'
            });
            return;
        }
        const { name, email, age } = userData;
        const result = db.updateUser(userId, { name, email, age });
        res.json(result);
    }
    catch (error) {
        res.json({
            success: false,
            message: `Error: ${error.message}`
        });
    }
});
// DELETE route for deleting user
exports.usersRouter.delete('/{id}', (req, res) => {
    console.log('=== DELETE /api/users/:id ===');
    console.log('ID:', req.params.id);
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
        res.json({
            success: false,
            message: 'Invalid user ID'
        });
        return;
    }
    const result = db.deleteUser(userId);
    res.json(result);
});
// GET route for searching users
exports.usersRouter.get('/search/{query}', (req, res) => {
    console.log('=== GET /api/users/search/{query} ===');
    console.log('Query:', req.params.query);
    const result = db.searchUsers(req.params.query);
    res.json(result);
});
process.on('SIGINT', () => {
    console.log('\n🔄 db shutdown...');
    db.close();
});
