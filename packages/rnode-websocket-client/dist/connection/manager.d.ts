import { WebSocketOptions, ConnectionState, ConnectionStatus } from '../core/types';
export declare class ConnectionManager {
    private ws;
    private options;
    private isConnecting;
    private currentRoom;
    private onDisconnectCallback?;
    constructor(options: WebSocketOptions);
    /**
     * Set disconnect handler
     */
    setDisconnectCallback(callback: () => void): void;
    /**
     * Connect to WebSocket server
     */
    connect(): Promise<void>;
    /**
     * Setup WebSocket event handlers
     */
    private setupEventHandlers;
    /**
     * Disconnect from server
     */
    disconnect(): void;
    /**
     * Get WebSocket connection
     */
    getWebSocket(): WebSocket | null;
    /**
     * Get current connection state
     */
    getState(): ConnectionState;
    /**
     * Check connection
     */
    isConnected(): boolean;
    /**
     * Get connection status
     */
    getConnectionStatus(): ConnectionStatus;
    /**
     * Set current room
     */
    setCurrentRoom(roomId: string | null): void;
    /**
     * Get current room
     */
    getCurrentRoom(): string | null;
}
//# sourceMappingURL=manager.d.ts.map