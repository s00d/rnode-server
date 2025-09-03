import { RNodeWebSocketClient } from './client';
import { Logger, LogLevel } from './logger';
import type { WebSocketOptions } from './types';
export declare function createWebSocketClient(options: WebSocketOptions): RNodeWebSocketClient;
export declare const WebSocketUtils: {
    /**
     * Проверка поддержки WebSocket в браузере
     */
    isSupported(): boolean;
    /**
     * Получение состояния подключения в текстовом виде
     */
    getStateString(state: number): string;
    /**
     * Создание уникального ID для клиента
     */
    generateClientId(): string;
    /**
     * Валидация URL WebSocket
     */
    isValidUrl(url: string): boolean;
};
export { RNodeWebSocketClient, Logger, LogLevel };
//# sourceMappingURL=index.d.ts.map