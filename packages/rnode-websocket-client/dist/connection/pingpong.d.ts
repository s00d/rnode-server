import { WebSocketOptions } from '../core/types';
import { ConnectionManager } from './manager';
import { EventEmitter } from '../core/events';
export declare class PingPongManager extends EventEmitter {
    private connectionManager;
    private options;
    private pongTimer;
    private lastPing;
    private lastPong;
    private pongTimeoutId;
    constructor(connectionManager: ConnectionManager, options: WebSocketOptions);
    /**
     * Start ping/pong mechanism (client only responds to server ping)
     */
    start(): void;
    /**
     * Stop ping/pong mechanism
     */
    stop(): void;
    /**
     * Handle ping from server (client only responds)
     */
    handlePingFromServer(): void;
    /**
     * Send pong in response to ping from server
     */
    private sendPong;
    /**
     * Handle pong from server (for confirmation)
     */
    handlePongFromServer(): void;
    /**
     * Get last ping
     */
    getLastPing(): number;
    /**
     * Get last pong
     */
    getLastPong(): number;
    /**
     * Get current latency
     */
    getLatency(): number;
    /**
     * Check ping/pong activity
     */
    isActive(): boolean;
}
//# sourceMappingURL=pingpong.d.ts.map