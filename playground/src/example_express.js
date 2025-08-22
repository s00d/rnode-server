const express = require('express');
const path = require('path');

const app = express();
const port = 4547; // Используем другой порт чтобы не конфликтовать

// Middleware для парсинга JSON
app.use(express.json());

// Middleware для CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));

// GET маршрут
app.get('/hello', (req, res) => {
    res.send('Hello World!');
});

// POST маршрут
app.post('/api/users', (req, res) => {
    res.json({ message: 'User created successfully' });
});

// GET маршрут с параметрами
app.get('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    res.json({ userId, message: 'User found' });
});

// Запуск сервера
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
