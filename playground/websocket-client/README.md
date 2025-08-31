# WebSocket Client Demo

Демонстрация WebSocket клиента для RNode Server с системой комнат.

## 🚀 Запуск

1. **Запустите WebSocket сервер:**
   ```bash
   cd playground
   npm run websocket-example
   ```

2. **Откройте клиент в браузере:**
   ```
   http://localhost:4547/websocket-client/
   ```

## 🔌 Возможности

### Подключение
- Подключение к WebSocket серверу
- Автоматическая генерация Client ID
- Статус подключения в реальном времени

### Комнаты
- Подключение к комнатам
- Выход из комнат
- Просмотр списка доступных комнат
- Отправка сообщений в конкретные комнаты

### Сообщения
- Отправка сообщений в текущую комнату
- Отправка сообщений в указанную комнату
- Логирование всех событий

### Метрики
- Ping/Pong задержка
- Количество отправленных сообщений
- Количество полученных сообщений
- Текущая комната

## 📁 Структура файлов

```
websocket-client/
├── index.html          # HTML интерфейс
├── websocket-client.js # JavaScript логика
└── README.md           # Этот файл
```

## 🌐 WebSocket Endpoints

Сервер предоставляет следующие WebSocket маршруты:

- `/chat` - Чат комната
- `/game` - Игровая комната  
- `/notifications` - Уведомления

## 📊 HTTP API

Для управления WebSocket через HTTP:

- `GET /websocket/rooms` - Список всех комнат
- `GET /websocket/rooms/:id` - Информация о комнате
- `POST /websocket/rooms` - Создание новой комнаты
- `POST /websocket/rooms/:id/message` - Отправка сообщения в комнату
- `POST /websocket/rooms/:id/join` - Подключение к комнате
- `POST /websocket/rooms/:id/leave` - Выход из комнаты
- `GET /websocket/clients/:id` - Информация о клиенте
- `GET /websocket/clients/:id/rooms` - Комнаты клиента

## 🎯 Примеры использования

### Подключение к чату
```javascript
// В браузере
const ws = new WebSocket('ws://localhost:4547/chat');

ws.onopen = () => {
    console.log('Подключен к чату');
    
    // Подключение к комнате
    ws.send(JSON.stringify({
        type: 'join_room',
        data: { roomId: 'general' },
        timestamp: Date.now()
    }));
};

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    console.log('Получено:', message);
};
```

### Отправка сообщения
```javascript
ws.send(JSON.stringify({
    type: 'message',
    data: {
        text: 'Привет всем!',
        clientId: 'user123',
        timestamp: Date.now()
    },
    timestamp: Date.now(),
    roomId: 'general'
}));
```

## 🔧 Настройка

### Изменение порта
В `websocket-example.ts` измените:
```typescript
const port = 4547; // Ваш порт
```

### Изменение WebSocket URL
В `index.html` измените:
```html
<input type="text" id="serverUrl" value="ws://localhost:4547/chat">
```

## 📱 Адаптивность

Интерфейс адаптирован для мобильных устройств и поддерживает:
- Touch события
- Responsive дизайн
- Оптимизированную навигацию

## 🐛 Отладка

### Лог событий
Все WebSocket события логируются в реальном времени в разделе "Лог событий".

### Консоль браузера
Дополнительная отладочная информация выводится в консоль браузера.

### Экспорт лога
Лог можно экспортировать в текстовый файл для анализа.

## 🎨 Кастомизация

### Стили
CSS стили находятся в `<style>` блоке `index.html` и легко настраиваются.

### Логика
JavaScript логика в `websocket-client.js` модульная и расширяемая.

### Темы
Можно легко добавить темную тему или другие цветовые схемы.

## 📚 Дополнительные ресурсы

- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [RNode Server Documentation](../README.md)
- [WebSocket Protocol](https://tools.ietf.org/html/rfc6455)
