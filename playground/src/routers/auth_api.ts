import { Router, Request, Response } from 'rnode-server';
import AuthDatabase from '../auth-database';

const authDb = new AuthDatabase();

// Clean up expired sessions on startup
authDb.cleanupExpiredSessions();
export const authApiRouter = Router();

// Global middleware for logging all requests and authorization
authApiRouter.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`📋 [${timestamp}] ${req.method} ${req.url} - Global middleware`);

  // Set global parameters for all requests
  req.setParam('requestId', Math.random().toString(36).substr(2, 9));
  req.setParam('timestamp', Date.now());
  req.setParam('globalMiddleware', true);

  // Get sessionId from cookie
  const sessionId = req.getCookie('sessionId');
  if (sessionId) {
    console.log('🍪 Session found in cookie:', sessionId);

    // Validate session and get user
    const sessionResult = authDb.validateSession(sessionId);
    if (sessionResult.success) {
      req.setParam('userId', sessionResult.userId);
      req.setParam('user', sessionResult.user);
      req.setParam('isAuthenticated', true);
      console.log('✅ User authenticated:', sessionResult.user?.username);
    } else {
      console.log('❌ Session invalid:', sessionResult.message);
      // Clear invalid cookie
      res.setCookie('sessionId', '', {maxAge: 0});
      req.setParam('isAuthenticated', false);
    }
  } else {
    req.setParam('isAuthenticated', false);
    console.log('🔒 User not authenticated');
  }

  console.log('🌐 Global parameters set:', req.getParams());

  next();
});

authApiRouter.use((req, res, next) => {
  console.log('🔐 Auth Router Middleware:', req.method, req.url);
  req.setParam('routerName', 'auth');
  next();
});

// POST /api/auth/register - User registration
authApiRouter.post('/register', (req, res) => {
  console.log('=== POST /api/auth/register ===');
  console.log('Body:', req.body);

  try {
    let userData = req.body;
    if (typeof req.body === 'string') {
      try {
        userData = JSON.parse(req.body);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Invalid data format'
        });
      }
    }

    // Check required fields
    if (!userData.username || !userData.email || !userData.password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email and password are required'
      });
    }

    // Register user via SQLite
    const registrationResult = authDb.registerUser(userData);

    if (!registrationResult.success) {
      return res.status(400).json(registrationResult);
    }

    // After successful registration, automatically authenticate user
    const loginResult = authDb.loginUser(userData.email, userData.password);

    if (!loginResult.success) {
      return res.status(500).json({
        success: false,
        message: 'User registered but failed to authenticate'
      });
    }

    // Set cookies for session
    res.setCookie('sessionId', loginResult.sessionId!, {
      httpOnly: true,
      maxAge: 86400000, // 24 hours
      path: '/'
    });

    res.json({
      success: true,
      message: 'User successfully registered and authenticated',
      userId: loginResult.userId,
      sessionId: loginResult.sessionId,
      user: loginResult.user
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: (error as any).message
    });
  }
});

// POST /api/auth/login - User authentication
authApiRouter.post('/login', (req, res) => {
  console.log('=== POST /api/auth/login ===');
  console.log('Body:', req.body);

  try {
    let loginData = req.body;
    if (typeof req.body === 'string') {
      try {
        loginData = JSON.parse(req.body);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Invalid data format'
        });
      }
    }

    // Check required fields
    if (!loginData.email || !loginData.password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Authenticate user via SQLite
    const loginResult = authDb.loginUser(loginData.email, loginData.password);

    if (!loginResult.success) {
      return res.status(401).json(loginResult);
    }

    // Set cookies for session
    res.setCookie('sessionId', loginResult.sessionId!, {
      httpOnly: true,
      maxAge: 86400000, // 24 hours
      path: '/'
    });

    res.json({
      success: true,
      message: loginResult.message,
      userId: loginResult.userId,
      sessionId: loginResult.sessionId,
      user: loginResult.user
    });

  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication',
      error: (error as any).message
    });
  }
});

// POST /api/auth/logout - Logout from system
authApiRouter.post('/logout', (req, res) => {
  console.log('=== POST /api/auth/logout ===');

  const sessionId = req.getCookie('sessionId');

  if (sessionId) {
    // Deactivate session in database
    const logoutResult = authDb.logoutUser(sessionId);
    console.log('Logout result:', logoutResult.message);
  }

  // Remove session cookies
  res.setCookie('sessionId', '', {
    maxAge: 0,
    path: '/'
  });

  res.json({
    success: true,
    message: 'Successfully logged out'
  });
});

// GET /api/auth/profile - Get user profile (protected route)
authApiRouter.get('/profile', (req, res) => {
  console.log('=== GET /api/auth/profile ===');

  // Demonstrate usage of new methods
  console.log('📝 All parameters from middleware:', req.getParams());
  console.log('🔍 Checking parameter presence:');
  console.log('  - userId:', req.hasParam('userId') ? '✅' : '❌');
  console.log('  - user:', req.hasParam('user') ? '✅' : '❌');
  console.log('  - isAuthenticated:', req.hasParam('isAuthenticated') ? '✅' : '❌');
  console.log('  - nonExistent:', req.hasParam('nonExistent') ? '✅' : '❌');

  // Get parameters via new methods
  const userId = req.getParam('userId');
  const user = req.getParam('user');
  const isAuthenticated = req.getParam('isAuthenticated');

  console.log('📊 Retrieved parameters:');
  console.log('  - userId:', userId);
  console.log('  - user:', user);
  console.log('  - isAuthenticated:', isAuthenticated);

  // Get full user profile from database
  const profileResult = authDb.getUserProfile(userId);

  if (!profileResult.success) {
    return res.status(404).json(profileResult);
  }

  // This route is protected by middleware, so parameters are available
  res.json({
    success: true,
    message: 'User profile',
    userId: userId,
    user: user,
    profile: profileResult.user,
    // Demonstrate all set parameters
    allParams: req.getParams()
  });
});

// Test route for demonstrating parameter work
authApiRouter.get('/test-params', (req, res) => {
  console.log('=== GET /api/auth/test-params ===');

  // Set additional parameters in handler
  req.setParam('handlerParam', 'value_from_handler');
  req.setParam('timestamp', Date.now());
  req.setParam('random', Math.random());

  console.log('📝 Parameters after setting in handler:', req.getParams());

  // Demonstrate all capabilities
  res.json({
    success: true,
    message: 'Parameter test',
    // Parameters from global middleware
    globalParams: {
      isAuthenticated: req.getParam('isAuthenticated'),
      user: req.getParam('user'),
      userId: req.getParam('userId'),
      requestId: req.getParam('requestId'),
      timestamp: req.getParam('timestamp')
    },
    // Parameters from handler
    handlerParams: {
      handlerParam: req.getParam('handlerParam'),
      timestamp: req.getParam('timestamp'),
      random: req.getParam('random')
    },
    // All parameters
    allParams: req.getParams(),
    // Presence checks
    checks: {
      hasUserId: req.hasParam('userId'),
      hasHandlerParam: req.hasParam('handlerParam'),
      hasNonExistent: req.hasParam('nonExistent'),
      hasIsAuthenticated: req.hasParam('isAuthenticated')
    }
  });
});
