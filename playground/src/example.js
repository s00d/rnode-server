import {createApp, Router} from 'rnode-server';
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

// Global middleware for logging all requests and authorization
app.use((req, res, next) => {
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
            console.log('✅ User authenticated:', sessionResult.user.username);
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

// GET route for demonstrating global middleware
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

// Simple test route
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'API is working!',
        timestamp: new Date().toISOString()
    });
});

// Test route for CORS verification
app.get('/api/cors-test', (req, res) => {
    try {
        console.log('=== GET /api/cors-test ===');

        // Check that methods exist
        if (typeof req.getHeader !== 'function') {
            throw new Error('req.getHeader is not a function');
        }

        console.log('Origin header:', req.getHeader('origin'));
        console.log('User-Agent header:', req.getHeader('user-agent'));

        // Set test cookies and headers
        res.setCookie('testCookie', 'testValue', {maxAge: 3600000});
        res.setCookie('sessionId', 'abc123', {httpOnly: true});
        res.setHeader('X-Custom-Header', 'test-value');
        res.setHeader('X-Response-Time', Date.now().toString());

        // Explicitly set Content-Type
        res.setHeader('Content-Type', 'application/json; charset=utf-8');

        // Get set cookies and headers
        const setCookies = res.getCookies();
        const setHeaders = res.getHeaders();

        res.json({
            success: true,
            message: 'CORS is working!',
            origin: req.getHeader('origin'),
            userAgent: req.getHeader('user-agent'),
            timestamp: new Date().toISOString(),
            corsInfo: {
                message: 'CORS headers set by middleware',
                allowOrigin: '*',
                allowMethods: 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
                allowHeaders: 'Content-Type, Authorization, X-Requested-With, X-Custom-Header'
            },
            // Demonstrate new methods
            setCookies: setCookies,
            setHeaders: setHeaders
        });
    } catch (error) {
        console.error('Error in /api/cors-test:', error);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json({
            success: false,
            message: 'Error: ' + error.message,
            error: error.stack
        });
    }
});

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
            message: `Error: ${error.message}`
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
            message: `Error: ${error.message}`
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

app.useRouter('/api/users', usersRouter);

// Route for working with cookies
app.get('/api/cookies', (req, res) => {
    console.log('=== GET /api/cookies ===');
    console.log('Cookies:', req.cookies);
    console.log('Headers:', req.headers);

    // Demonstrate helper usage
    console.log('Session ID:', req.getCookie('sessionId'));
    console.log('Has theme cookie:', req.hasCookie('theme'));
    console.log('User-Agent header:', req.getHeader('user-agent'));
    console.log('Has Accept header:', req.hasHeader('accept'));

    // Get all cookies and headers in JSON
    const allCookies = req.getCookies();
    const allHeaders = req.getHeaders();
    console.log('All cookies (JSON):', allCookies);
    console.log('All headers (JSON):', allHeaders);

    // Set multiple cookies using setCookie
    res.setCookie('sessionId', 'abc123', {
        httpOnly: true,
        maxAge: 3600000, // 1 hour
        path: '/'
    });

    res.setCookie('theme', 'dark', {
        maxAge: 86400000, // 24 hours
        path: '/'
    });

    res.setCookie('language', 'ru', {
        maxAge: 31536000000, // 1 year
        path: '/'
    });

    // Set headers
    res.setHeader('X-Custom-Header', 'RNode-Server');
    res.setHeader('X-Response-Time', Date.now().toString());

    res.json({
        success: true,
        message: 'Cookies and headers set',
        receivedCookies: req.cookies,
        receivedHeaders: req.headers,
        // Demonstrate helper work
        cookieHelpers: {
            sessionId: req.getCookie('sessionId'),
            hasTheme: req.hasCookie('theme'),
            hasLanguage: req.hasCookie('language')
        },
        headerHelpers: {
            userAgent: req.getCookie('user-agent'),
            hasAccept: req.hasHeader('accept'),
            hasContentType: req.hasHeader('content-type')
        },
        // New methods for getting all data
        allCookies: allCookies,
        allHeaders: allHeaders
    });
});


// Route for deleting cookies
app.delete('/api/cookies/{name}', (req, res) => {
    console.log('=== DELETE /api/cookies/:name ===');
    console.log('Cookie name:', req.params.name);

    // Delete cookie
    res.cookie(req.params.name, '', {
        maxAge: 0,
        path: '/'
    });

    res.json({
        success: true,
        message: `Cookie '${req.params.name}' deleted`
    });
});

// Route for getting cookie information
app.get('/api/cookies/info', (req, res) => {
    console.log('=== GET /api/cookies/info ===');

    // Parse cookies string
    const cookiesStr = req.cookies || '';
    const cookies = {};

    if (cookiesStr) {
        cookiesStr.split(';').forEach(cookie => {
            const [name, value] = cookie.trim().split('=');
            if (name && value) {
                cookies[name] = value;
            }
        });
    }

    res.json({
        success: true,
        rawCookies: req.cookies,
        parsedCookies: cookies,
        cookieCount: Object.keys(cookies).length,
        headers: req.headers
    });
});

// Route for demonstrating all helpers
app.get('/api/helpers', (req, res) => {
    console.log('=== GET /api/helpers ===');

    // Demonstrate all helpers
    const cookieHelpers = {
        rawCookies: req.cookies,
        sessionId: req.getCookie('sessionId'),
        theme: req.getCookie('theme'),
        language: req.getCookie('language'),
        hasSessionId: req.hasCookie('sessionId'),
        hasTheme: req.hasCookie('theme'),
        hasLanguage: req.hasCookie('language'),
        hasNonExistent: req.hasCookie('nonExistent'),
        allCookies: req.getCookies() // New method
    };

    const headerHelpers = {
        rawHeaders: req.headers,
        userAgent: req.getHeader('user-agent'),
        accept: req.getHeader('accept'),
        contentType: req.getHeader('content-type'),
        hasUserAgent: req.hasHeader('user-agent'),
        hasAccept: req.hasHeader('accept'),
        hasContentType: req.hasHeader('content-type'),
        hasNonExistent: req.hasHeader('non-existent-header'),
        allHeaders: req.getHeaders() // New method
    };

    // Set test cookies and headers
    res.setCookie('testCookie', 'testValue', {maxAge: 3600000});
    res.setHeader('X-Test-Header', 'test-value');

    res.json({
        success: true,
        message: 'Demonstration of all helpers',
        cookieHelpers,
        headerHelpers,
        timestamp: new Date().toISOString()
    });
});

// CORS middleware only for API routes
app.use('/api', (req, res, next) => {
    console.log('🌐 CORS middleware for API:', req.method, req.url);

    // Allow all origins (can be limited for production)
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Allow all methods
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');

    // Allow all headers
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Custom-Header');

    // Allow credentials (cookies, authorization headers)
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Maximum caching time for preflight request
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

    // Set Content-Type with encoding for all API responses
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    // Additional headers for better compatibility
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Handle preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
        // Send empty JSON response instead of res.end()
        res.json({success: true, message: 'Preflight OK'});
        return;
    }

    // Continue execution for other requests
    next();
});

// Middleware for checking authorization on /api/auth/* (except login and register)
app.use('/api/auth', (req, res, next) => {
    console.log('🔐 Auth middleware for:', req.method, req.url);

    // Skip registration and login
    if (req.url === '/register' || req.url === '/login') {
        console.log('✅ Skipping auth middleware for:', req.url);
        return next();
    }

    // Check that user is already authenticated (set by global middleware)
    if (!req.getParam('isAuthenticated')) {
        console.log('❌ User not authenticated');
        return res.status(401).json({
            success: false,
            message: 'Authorization required. Please log in.',
            error: 'Unauthorized'
        });
    }

    console.log('✅ Auth middleware: user already authenticated via global middleware');
    console.log('📝 User parameters:', req.getParams());

    next();
});

// Register authentication router

// ===== CREATING AUTHENTICATION ROUTER =====

// Create authentication router
const authRouter = Router();

// Demonstrate that Router inherits all ExpressApp methods
console.log('🔧 Router methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(authRouter)));

// Middleware for authentication router
authRouter.use((req, res, next) => {
    console.log('🔐 Auth Router Middleware:', req.method, req.url);
    req.setParam('routerName', 'auth');
    next();
});

// POST /api/auth/register - User registration
authRouter.post('/register', (req, res) => {
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
        res.setCookie('sessionId', loginResult.sessionId, {
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
            error: error.message
        });
    }
});

// POST /api/auth/login - User authentication
authRouter.post('/login', (req, res) => {
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
        res.setCookie('sessionId', loginResult.sessionId, {
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
            error: error.message
        });
    }
});

// POST /api/auth/logout - Logout from system
authRouter.post('/logout', (req, res) => {
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
authRouter.get('/profile', (req, res) => {
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
authRouter.get('/test-params', (req, res) => {
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


app.useRouter('/api/auth', authRouter);

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🔄 Server shutdown...');
    db.close();
    authDb.close();
    process.exit(0);
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Server started on port ${port}`);
    console.log(`📊 SQLite database: users.db`);
    console.log(`🔗 API endpoints:`);
    console.log(`   📝 Users:`);
    console.log(`      POST   /api/users - create user`);
    console.log(`      GET    /api/users - get all users`);
    console.log(`      GET    /api/users/{id} - get user by ID`);
    console.log(`      PUT    /api/users/{id} - update user`);
    console.log(`      DELETE /api/users/{id} - delete user`);
    console.log(`      GET    /api/users/search/{query} - search users`);
    console.log(`   🔐 Authentication:`);
    console.log(`      POST   /api/auth/register - registration`);
    console.log(`      POST   /api/auth/login - login`);
    console.log(`      POST   /api/auth/logout - logout`);
    console.log(`      GET    /api/auth/profile - user profile`);
    console.log(`      GET    /api/auth/test-params - parameter test`);
    console.log(`   🌐 Web Interface:`);
    console.log(`      GET    / - main page`);
    console.log(`      GET    /auth/ - authentication page`);
    console.log(`   🔧 Utilities:`);
    console.log(`      GET    /api/test - API test`);
    console.log(`      GET    /api/cors-test - CORS test`);
    console.log(`      GET    /api/cookies - cookies work`);
    console.log(`      GET    /api/helpers - all helpers`);
    console.log(`   📊 Middleware:`);
    console.log(`      Global middleware for /*`);
    console.log(`      CORS for /api/*`);
    console.log(`      Auth for /api/auth/*`);
    console.log(`      Static files for /*`);
    console.log(`   🚀 Routers:`);
    console.log(`      /api/auth/* - authentication router`);
    console.log(`      /api/users/* - users router`);
});
