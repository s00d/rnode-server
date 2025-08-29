# @rnode/websocket-client

WebSocket клиент для RNode Server с поддержкой комнат, автоматического переподключения и ping/pong механизма.

## Установка

```bash
npm install @rnode/websocket-client
```

## Быстрый старт

```typescript
import { createWebSocketClient, WebSocketEvent } from '@rnode/websocket-client';

// Создание клиента
const client = createWebSocketClient({
  url: 'ws://localhost:3000/chat',
  clientId: 'user123',
  autoReconnect: true,
  onConnect: (event: WebSocketEvent) => {
    console.log('Подключен к серверу!');
  },
  onMessage: (event: WebSocketEvent) => {
    console.log('Получено сообщение:', event.data);
  }
});

// Подключение
await client.connect();

// Отправка сообщения
client.send('Привет, мир!');

// Подключение к комнате
client.joinRoom('general');

// Отправка сообщения в комнату
client.send('Сообщение в комнату', 'general');
```

## Основные возможности

### 🔌 Автоматическое переподключение
- Экспоненциальная задержка между попытками
- Настраиваемое количество попыток
- Настраиваемый интервал переподключения

### 🏠 Система комнат
- Подключение к комнатам
- Отправка сообщений в конкретные комнаты
- Автоматическое отслеживание текущей комнаты

### 🏓 Ping/Pong механизм
- Автоматическая проверка состояния соединения
- Настраиваемые интервалы
- Таймауты для обнаружения "мертвых" соединений

### 📱 События
- `onConnect` - подключение установлено
- `onDisconnect` - соединение разорвано
- `onMessage` - получено сообщение
- `onError` - произошла ошибка
- `onJoinRoom` - подключение к комнате
- `onLeaveRoom` - выход из комнаты
- `onPing` - отправлен ping
- `onPong` - получен pong

## API

### RNodeWebSocketClient

#### Конструктор
```typescript
new RNodeWebSocketClient(options: WebSocketOptions)
```

#### Методы

##### `connect(): Promise<void>`
Подключение к WebSocket серверу.

##### `disconnect(): void`
Отключение от сервера.

##### `send(data: any, roomId?: string): boolean`
Отправка сообщения. Если `roomId` не указан, сообщение отправляется в текущую комнату.

##### `joinRoom(roomId: string): boolean`
Подключение к комнате.

##### `leaveRoom(roomId?: string): boolean`
Выход из комнаты. Если `roomId` не указан, выход из текущей комнаты.

##### `isConnected(): boolean`
Проверка состояния подключения.

##### `getState(): number`
Получение текущего состояния WebSocket.

##### `getCurrentRoom(): string | null`
Получение ID текущей комнаты.

##### `updateOptions(newOptions: Partial<WebSocketOptions>): void`
Обновление конфигурации клиента.

### WebSocketOptions

```typescript
interface WebSocketOptions {
  url: string;                           // URL WebSocket сервера
  protocols?: string | string[];         // Протоколы WebSocket
  clientId?: string;                     // ID клиента
  autoReconnect?: boolean;               // Автоматическое переподключение
  reconnectInterval?: number;            // Интервал переподключения (мс)
  maxReconnectAttempts?: number;         // Максимальное количество попыток
  pingInterval?: number;                 // Интервал ping (мс)
  pongTimeout?: number;                  // Таймаут pong (мс)
  onConnect?: (event: WebSocketEvent) => void;
  onDisconnect?: (event: WebSocketEvent) => void;
  onMessage?: (event: WebSocketEvent) => void;
  onError?: (event: WebSocketEvent) => void;
  onJoinRoom?: (event: WebSocketEvent) => void;
  onLeaveRoom?: (event: WebSocketEvent) => void;
  onPing?: (event: WebSocketEvent) => void;
  onPong?: (event: WebSocketEvent) => void;
}
```

### WebSocketEvent

```typescript
interface WebSocketEvent {
  type: 'connect' | 'disconnect' | 'message' | 'error' | 'join_room' | 'leave_room' | 'ping' | 'pong';
  data: any;
  timestamp: number;
}
```

## Примеры использования

### Чат приложение

```typescript
import { createWebSocketClient } from '@rnode/websocket-client';

const chatClient = createWebSocketClient({
  url: 'ws://localhost:3000/chat',
  clientId: 'user_' + Date.now(),
  autoReconnect: true,
  
  onConnect: () => {
    console.log('Подключен к чату');
    chatClient.joinRoom('general');
  },
  
  onMessage: (event) => {
    const message = event.data;
    if (message.type === 'chat') {
      displayMessage(message.data);
    }
  },
  
  onJoinRoom: (event) => {
    console.log(`Подключился к комнате: ${event.data.roomId}`);
  }
});

// Подключение
await chatClient.connect();

// Отправка сообщения в чат
function sendMessage(text: string) {
  chatClient.send({
    type: 'chat',
    text,
    timestamp: Date.now()
  }, 'general');
}
```

### Игровое приложение

```typescript
import { createWebSocketClient } from '@rnode/websocket-client';

const gameClient = createWebSocketClient({
  url: 'ws://localhost:3000/game',
  clientId: 'player_' + Math.random().toString(36).substr(2, 9),
  autoReconnect: true,
  pingInterval: 1000, // Частые ping для игр
  
  onConnect: () => {
    console.log('Подключен к игровому серверу');
  },
  
  onMessage: (event) => {
    const gameEvent = event.data;
    switch (gameEvent.type) {
      case 'player_move':
        updatePlayerPosition(gameEvent.playerId, gameEvent.position);
        break;
      case 'game_state':
        updateGameState(gameEvent.state);
        break;
    }
  }
});

// Подключение к игровой комнате
await gameClient.connect();
gameClient.joinRoom('game_room_1');

// Отправка движения игрока
function sendPlayerMove(position: { x: number, y: number }) {
  gameClient.send({
    type: 'player_move',
    position,
    timestamp: Date.now()
  }, 'game_room_1');
}
```

## Сборка

```bash
npm run build
```

## Разработка

```bash
npm run dev
```

## Лицензия

MIT
