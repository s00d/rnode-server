const express = require('express');
const path = require('path');

const app = express();
const port = 4547; // Use different port to avoid conflicts

// Middleware for JSON parsing
app.use(express.json());

// Middleware for CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

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

// Start server
app.listen(port, () => {
    console.log(`Express app listening on port ${port}`);
    console.log(`Static files served from: ${path.join(__dirname, 'public')}`);
    console.log(`Available routes:`);
    console.log(`  GET /hello`);
    console.log(`  POST /api/users`);
    console.log(`  GET /api/users/:id`);
    console.log(`  GET / (static index.html)`);
    console.log(`  GET /style.css (static CSS)`);
});
