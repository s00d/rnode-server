import { createApp } from 'rnode-server';
import path from "path";

const app = createApp({ logLevel: "info", metrics: true });
const port = 4546;

// Load static files into memory
app.static('./public');

// Middleware for CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// GET route
app.get('/hello', (req, res) => {
  res.send('Hello World!');
});

// POST route
app.post('/api/users', (req, res) => {
  res.json({ message: 'User created successfully' });
});

// GET route with parameters
app.get('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  res.json({ userId, message: 'User found' });
});

// Slow request route for testing metrics
app.get('/api/slow', async (req, res) => {
  const delay = parseInt(req.query.delay as string) || 2000; // Default 2 seconds
  
  console.log(`🐌 Starting slow request with ${delay}ms delay...`);
  console.log(`📝 Request object:`, { method: req.method, url: req.url, params: req.params });
  
  try {
    // Simulate slow processing
    await new Promise(resolve => setTimeout(resolve, delay));
    
    console.log(`✅ Slow request completed after ${delay}ms`);
    res.json({
      message: 'Slow request completed', 
      delay: delay,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ Slow request failed:`, error);
    res.status(500).json({
      error: 'Slow request failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Very slow request route for testing "very_slow" metrics
app.get('/api/very-slow', async (req, res) => {
  const delay = parseInt(req.query.delay as string) || 8000; // Default 8 seconds
  
  console.log(`🐌🐌 Starting very slow request with ${delay}ms delay...`);
  
  try {
    // Simulate very slow processing
    await new Promise(resolve => setTimeout(resolve, delay));
    
    console.log(`✅ Very slow request completed after ${delay}ms`);
    res.json({ 
      message: 'Very slow request completed', 
      delay: delay,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ Very slow request failed:`, error);
    res.status(500).json({ 
      error: 'Very slow request failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Express app listening on port ${port}`);
  console.log(`Static files served from: ${path.join(__dirname, 'public')}`);
  console.log(`Available routes:`);
  console.log(`  GET /hello`);
  console.log(`  POST /api/users`);
  console.log(`  GET /api/users/:id`);
  console.log(`  GET /api/slow?delay=2000 (test slow requests)`);
  console.log(`  GET /api/very-slow?delay=8000 (test very slow requests)`);
  console.log(`  GET / (static index.html)`);
  console.log(`  GET /style.css (static CSS)`);
});
//
// const sslConfig = {
//   certPath: path.join(__dirname, '../ssl/server.crt'),
//   keyPath: path.join(__dirname, '../ssl/server.key')
// };
// let httpsApp = createApp({ ssl: sslConfig, logLevel: "info", metrics: true });
// httpsApp.get('/hello', (req, res) => {
//   res.send('Hello World!');
// });
//
// httpsApp.listen(4547, () => {
//   console.log(`Express app listening on port ${port}`);
//   console.log(`Static files served from: ${path.join(__dirname, 'public')}`);
//   console.log(`Available routes:`);
//   console.log(`  GET /hello`);
//   console.log(`  POST /api/users`);
//   console.log(`  GET /api/users/:id`);
//   console.log(`  GET / (static index.html)`);
//   console.log(`  GET /style.css (static CSS)`);
// });