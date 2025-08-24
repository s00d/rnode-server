import { createApp, Router } from 'rnode-server';
import UserDatabase from './database.js';
import AuthDatabase from './auth-database.js';

const app = createApp();
const port = 4546;

// Initialize databases
const db = new UserDatabase();
const authDb = new AuthDatabase();

// Clean up expired sessions on startup
authDb.cleanupExpiredSessions();

// Load static files into memory
app.static('./public');

// ===== CREATING USERS ROUTER =====

// Create users router
const usersRouter = Router();

// Middleware for users router
usersRouter.use((req, res, next) => {
  console.log('👥 Users Router Middleware:', req.method, req.url);
  req.setParam('routerName', 'users');
  next();
});

// POST route for creating user
usersRouter.post('', (req, res) => {
  console.log('=== POST /api/users ===');
  console.log('Body:', req.body);

  try {
    // Parse body if it's JSON
    let userData = req.body;
    if (typeof req.body === 'string') {
      try {
        userData = JSON.parse(req.body);
      } catch (e) {
        userData = { name: req.body, email: '', age: null };
      }
    }

    // Check required fields
    if (!userData.name || !userData.email) {
      return res.json({
        success: false,
        message: 'Name and email are required'
      });
    }

    // Create user in database
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
      message: `Error: ${(error as any).message}`
    });
  }
});

// GET route for getting all users
usersRouter.get('', (req, res) => {
  console.log('=== GET /api/users ===');

  const result = db.getAllUsers();
  res.json(result);
});

app.useRouter('/api/users', usersRouter);

app.get('/hello', (req, res) => {
  console.log('👋 Hello handler - parameters from global middleware:', req.getParams());

  // Add our own parameters
  req.setParam('handlerName', 'hello');
  req.setParam('message', 'Hello World!');

  res.json({
    message: 'Hello World!',
    globalParams: req.getParams(),
    info: 'This response contains parameters from global middleware',
    auth: {
      isAuthenticated: req.getParam('isAuthenticated'),
      user: req.getParam('user'),
      userId: req.getParam('userId')
    }
  });
});

app.get('/posts/{postId}/comments/{commentId}', (req, res) => {
  const { postId, commentId } = req.params;
  res.json({ postId, commentId, message: 'Comment details' });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server started on port ${port}`);
  console.log(`�� SQLite database: users.db`);
  console.log(`🔗 API endpoints:`);
  console.log(`   📝 Users:`);
  console.log(`      POST   /api/users - create user`);
  console.log(`      GET    /api/users - get all users`);
});
