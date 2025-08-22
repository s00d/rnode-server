"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rnode_server_1 = require("rnode-server");
const app = (0, rnode_server_1.createApp)();
const port = 4546;
// Создаем роутер для API
const apiRouter = (0, rnode_server_1.Router)();
// GET маршрут для получения данных
apiRouter.get('/data', (req, res) => {
    res.json({
        success: true,
        message: 'Данные получены успешно',
        timestamp: new Date().toISOString(),
        params: req.getParams()
    });
});
// POST маршрут для создания данных
apiRouter.post('/data', (req, res) => {
    res.json({
        success: true,
        message: 'Данные созданы успешно',
        receivedData: req.body,
        timestamp: new Date().toISOString()
    });
});
// PUT маршрут для обновления данных
apiRouter.put('/data/{id}', (req, res) => {
    res.json({
        success: true,
        message: 'Данные обновлены успешно',
        id: req.params.id,
        updatedData: req.body,
        timestamp: new Date().toISOString()
    });
});
// DELETE маршрут для удаления данных
apiRouter.delete('/data/{id}', (req, res) => {
    res.json({
        success: true,
        message: 'Данные удалены успешно',
        id: req.params.id,
        timestamp: new Date().toISOString()
    });
});
// Простой маршрут для тестирования
app.get('/hello', (req, res) => {
    res.json({
        message: 'Привет от RNode сервера!',
        timestamp: new Date().toISOString()
    });
});
// Регистрируем API роутер
app.useRouter('/api', apiRouter);
// Загружаем статические файлы
app.static('./public');
// Запускаем сервер
app.listen(port, () => {
    console.log(`🚀 RNode сервер запущен на порту ${port}`);
    console.log(`📝 Доступные маршруты:`);
    console.log(`   GET  /hello - приветствие`);
    console.log(`   GET  /api/data - получение данных`);
    console.log(`   POST /api/data - создание данных`);
    console.log(`   PUT  /api/data/:id - обновление данных`);
    console.log(`   DELETE /api/data/:id - удаление данных`);
    console.log(`🌐 Откройте http://localhost:${port}/hello для тестирования`);
});
