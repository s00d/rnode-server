import { WebSocketOptions, ConnectionState, ConnectionStatus } from './core/types';
import { EventEmitter } from './core/events';
export declare class RNodeWebSocketClient extends EventEmitter {
    private options;
    private connectionManager;
    private roomManager;
    private messageManager;
    private pingPongManager;
    private reconnectionManager;
    constructor(options: WebSocketOptions);
    /**
     * Setup event handlers from managers
     */
    private setupEventHandlers;
    /**
     * Connect to WebSocket server
     */
    connect(): Promise<void>;
    /**
     * Disconnect from server
     */
    disconnect(): void;
    /**
     * Send message
     */
    send(data: unknown, roomId?: string): boolean;
    /**
     * Send message to room
     */
    sendToRoom(roomId: string, message: unknown): boolean;
    /**
     * Send direct message to client by ID
     */
    sendDirectMessage(clientId: string, message: unknown): boolean;
    /**
     * Join room
     */
    joinRoom(roomId: string): boolean;
    /**
     * Leave room
     */
    leaveRoom(roomId?: string): boolean;
    /**
     * Get current connection state
     */
    getState(): ConnectionState;
    /**
     * Check connection
     */
    isConnected(): boolean;
    /**
     * Get current room
     */
    getCurrentRoom(): string | null;
    /**
     * Get connection status
     */
    getConnectionStatus(): ConnectionStatus;
    /**
     * Get ping/pong latency
     */
    getLatency(): number;
    /**
     * Update configuration
     */
    updateOptions(newOptions: Partial<WebSocketOptions>): void;
    /**
     * Get statistics
     */
    getStats(): {
        connection: ConnectionStatus;
        latency: number;
        reconnectionAttempts: number;
        maxReconnectionAttempts: number;
    };
}
//# sourceMappingURL=client.d.ts.map