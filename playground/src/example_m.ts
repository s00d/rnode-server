import { createApp, Router } from 'rnode-server';
import path from "path";
import {commonRouter} from "./routers/common";

const app = createApp({ logLevel: "debug", metrics: true, timeout: 3000, devMode: false });
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

app.get('/hello1', (req, res) => {
  res.status(500).send('Hello World!');
});

// POST route
app.post('/api/users', (req, res) => {
  res.json({ message: 'User created successfully' });
});

app.post('/api/sub_users/{id}', (req, res) => {
  res.json({ message: 'User created successfully' });
});

// GET route with parameters
app.any('/api/users/{id}', (req, res) => {
  const userId = req.params.id;
  const para = req.getParam('awfawfa')

  const formData = req.getBodyAsForm();
  if (formData) {
    console.log('Form data:', formData);
    const name = formData.name || '';
    console.log('Name:', name);
  } else {
    console.log('No form data found');
  }

  const jsonData = req.getBodyAsJson();
  if (jsonData) {
    console.log('JSON data:', jsonData);
    const name = jsonData.name || '';
    console.log('Name:', name);
  }

  res.json({ para, userId, message: 'User found' });
});

// Slow request route for testing metrics
app.get('/api/slow', async (req, res) => {
  const delay = parseInt(req.query.delay as string) || 2000; // Default 2 seconds
  const startTime = Date.now(); // Start timing
  
  console.log(`🐌 Starting slow request with ${delay}ms delay...`);
  console.log(`📝 Request object:`, { method: req.method, url: req.url, params: req.params });
  
  try {
    // Simulate slow processing
    await req.sleep(delay)
    
    const executionTime = Date.now() - startTime; // Calculate execution time
    console.log(`✅ Slow request completed after ${delay}ms (execution: ${executionTime}ms)`);
    res.json({
      message: 'Slow request completed', 
      delay: delay,
      executionTime: executionTime,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const executionTime = Date.now() - startTime; // Calculate execution time even on error
    console.error(`❌ Slow request failed after ${executionTime}ms:`, error);
    res.status(500).json({
      error: 'Slow request failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      executionTime: executionTime
    });
  }
});


const apiRouter = Router();

// GET route for retrieving data
apiRouter.get('/data', (req, res) => {
  res.json({
    success: true,
    message: 'Data retrieved successfully',
    timestamp: new Date().toISOString(),
    params: req.getParams()
  });
});

app.useRouter('/custom', apiRouter);

// Start server
app.listen(port, () => {
  console.log(`app listening on port ${port}`);
  console.log(`Static files served from: ${path.join(__dirname, 'public')}`);
  console.log(`Available routes:`);
  console.log(`  GET /hello`);
  console.log(`  POST /api/users`);
  console.log(`  GET /api/users/{id}`);
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
//   console.log(`  GET /api/users/{id}`);
//   console.log(`  GET / (static index.html)`);
//   console.log(`  GET /style.css (static CSS)`);
// });