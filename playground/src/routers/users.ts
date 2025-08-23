import { Router, Request, Response } from 'rnode-server';
import UserDatabase from '../database';
export const usersRouter = Router();

const db = new UserDatabase();

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
        userData = {name: req.body, email: '', age: null};
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

// GET route with parameters for getting user by ID
usersRouter.get('/{id}', (req, res) => {
  console.log('=== GET /api/users/:id ===');
  console.log('ID:', req.params.id);

  const userId = parseInt(req.params.id);
  if (isNaN(userId)) {
    return res.json({
      success: false,
      message: 'Invalid user ID'
    });
  }

  const result = db.getUserById(userId);
  res.json(result);
});

// PUT route for updating user
usersRouter.put('/{id}', (req, res) => {
  console.log('=== PUT /api/users/:id ===');
  console.log('ID:', req.params.id);
  console.log('Body:', req.body);

  const userId = parseInt(req.params.id);
  if (isNaN(userId)) {
    return res.json({
      success: false,
      message: 'Invalid user ID'
    });
  }

  try {
    let userData = req.body;
    if (typeof req.body === 'string') {
      try {
        userData = JSON.parse(req.body);
      } catch (e) {
        userData = {name: req.body, email: '', age: null};
      }
    }

    if (!userData.name || !userData.email) {
      return res.json({
        success: false,
        message: 'Name and email are required'
      });
    }

    const result = db.updateUser(userId, userData);
    res.json(result);
  } catch (error) {
    res.json({
      success: false,
      message: `Error: ${(error as any).message}`
    });
  }
});

// DELETE route for deleting user
usersRouter.delete('/{id}', (req, res) => {
  console.log('=== DELETE /api/users/:id ===');
  console.log('ID:', req.params.id);

  const userId = parseInt(req.params.id);
  if (isNaN(userId)) {
    return res.json({
      success: false,
      message: 'Invalid user ID'
    });
  }

  const result = db.deleteUser(userId);
  res.json(result);
});

// GET route for searching users
usersRouter.get('/search/{query}', (req, res) => {
  console.log('=== GET /api/users/search/:query ===');
  console.log('Query:', req.params.query);

  const result = db.searchUsers(req.params.query);
  res.json(result);
});

process.on('SIGINT', () => {
  console.log('\n🔄 db shutdown...');
  db.close();
});