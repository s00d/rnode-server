import { Router, Request, Response } from 'rnode-server';

export const corsRouter = Router();


// CORS middleware only for API routes
corsRouter.use('/api', (req, res, next) => {
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
  res.setContentType('application/json; charset=utf-8');

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

// Simple test route
corsRouter.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working!',
    timestamp: new Date().toISOString()
  });
});

// Test route for CORS verification
corsRouter.get('/api/cors-test', (req, res) => {
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
    res.setContentType('application/json; charset=utf-8');

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
    res.setContentType('application/json; charset=utf-8');
    res.json({
      success: false,
      message: 'Error: ' + (error as any).message,
      error: (error as any).stack
    });
  }
});



// Route for working with cookies
corsRouter.get('/api/cookies', (req, res) => {
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
    },
    // New methods for getting all data
    allCookies: allCookies,
    allHeaders: allHeaders
  });
});


// Route for deleting cookies
corsRouter.delete('/api/cookies/{name}', (req, res) => {
  console.log('=== DELETE /api/cookies/:name ===');
  console.log('Cookie name:', req.params.name);

  // Delete cookie
  res.setCookie(req.params.name, '', {
    maxAge: 0,
    path: '/'
  });

  res.json({
    success: true,
    message: `Cookie '${req.params.name}' deleted`
  });
});

// Route for getting cookie information
corsRouter.get('/api/cookies/info', (req, res) => {
  console.log('=== GET /api/cookies/info ===');
  const cookies = {};

  res.json({
    success: true,
    cookies: req.cookies,
    cookieCount: Object.keys(cookies).length,
    headers: req.headers
  });
});

// Route for demonstrating all helpers
corsRouter.get('/api/helpers', (req, res) => {
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