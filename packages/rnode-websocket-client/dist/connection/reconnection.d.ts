import { WebSocketOptions } from '../core/types';
import { ConnectionManager } from './manager';
import { RoomManager } from './rooms';
import { EventEmitter } from '../core/events';
export declare class ReconnectionManager extends EventEmitter {
    private connectionManager;
    private roomManager;
    private options;
    private reconnectTimer;
    private isReconnecting;
    private currentAttempt;
    private previousRooms;
    constructor(connectionManager: ConnectionManager, options: WebSocketOptions, roomManager?: RoomManager);
    /**
     * Save current rooms before reconnection
     */
    private saveCurrentRooms;
    /**
     * Restore rooms after reconnection
     */
    private restoreRooms;
    /**
     * Schedule reconnection
     */
    scheduleReconnect(): void;
    /**
     * Execute reconnection
     */
    private performReconnect;
    /**
     * Reset reconnection state
     */
    resetReconnection(): void;
    /**
     * Cancel reconnection
     */
    cancelReconnect(): void;
    /**
     * Check reconnection state
     */
    getIsReconnecting(): boolean;
    /**
     * Get current attempt
     */
    getCurrentAttempt(): number;
    /**
     * Get maximum attempts
     */
    getMaxAttempts(): number;
    /**
     * Update reconnection configuration
     */
    updateConfig(newOptions: Partial<WebSocketOptions>): void;
}
//# sourceMappingURL=reconnection.d.ts.map