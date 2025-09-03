import { WebSocketOptions } from './types';
export declare class RNodeWebSocketClient {
    private ws;
    private options;
    private reconnectConfig;
    private pingPongConfig;
    private reconnectTimer;
    private pingTimer;
    private pongTimer;
    private isConnecting;
    private isReconnecting;
    private currentRoom;
    private eventListeners;
    constructor(options: WebSocketOptions);
    /**
     * Подписка на события
     */
    on(event: string, listener: Function): void;
    /**
     * Отписка от событий
     */
    off(event: string, listener: Function): void;
    /**
     * Генерация событий
     */
    private emit;
    /**
     * Подключение к WebSocket серверу
     */
    connect(): Promise<void>;
    /**
     * Настройка обработчиков событий WebSocket
     */
    private setupEventHandlers;
    /**
     * Отправка сообщения
     */
    send(data: any, roomId?: string): boolean;
    /**
     * Подключение к комнате
     */
    joinRoom(roomId: string): boolean;
    /**
     * Выход из комнаты
     */
    leaveRoom(roomId?: string): boolean;
    /**
     * Отключение от сервера
     */
    disconnect(): void;
    /**
     * Получение текущего состояния подключения
     */
    getState(): number;
    /**
     * Проверка подключения
     */
    isConnected(): boolean;
    /**
     * Получение текущей комнаты
     */
    getCurrentRoom(): string | null;
    /**
     * Запуск ping/pong механизма
     */
    private startPingPong;
    /**
     * Остановка ping/pong механизма
     */
    private stopPingPong;
    /**
     * Отправка ping
     */
    private sendPing;
    /**
     * Отправка pong в ответ на ping от сервера
     */
    private sendPong;
    /**
     * Обработка pong
     */
    private handlePong;
    /**
     * Планирование переподключения
     */
    private scheduleReconnect;
    /**
     * Отмена переподключения
     */
    private cancelReconnect;
    /**
     * Обновление конфигурации
     */
    updateOptions(newOptions: Partial<WebSocketOptions>): void;
    /**
     * Отправка сообщения в комнату
     */
    sendToRoom(roomId: string, message: any): boolean;
    /**
     * Отправка прямого сообщения клиенту по ID
     */
    sendDirectMessage(clientId: string, message: any): boolean;
}
//# sourceMappingURL=client.d.ts.map