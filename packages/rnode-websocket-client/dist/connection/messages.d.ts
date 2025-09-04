import { WebSocketOptions } from '../core/types';
import { ConnectionManager } from './manager';
import { PingPongManager } from './pingpong';
import { EventEmitter } from '../core/events';
export declare class MessageManager extends EventEmitter {
    private connectionManager;
    private options;
    private pingPongManager;
    constructor(connectionManager: ConnectionManager, options: WebSocketOptions, pingPongManager?: PingPongManager);
    /**
     * Setup message handler
     */
    private setupMessageHandler;
    /**
     * Public method to setup message handler after connection
     */
    setupMessageHandlerAfterConnect(): void;
    /**
     * Handle incoming messages
     */
    private handleMessage;
    /**
     * Handle welcome message
     */
    private handleWelcome;
    /**
     * Handle ping message
     */
    private handlePing;
    /**
     * Handle pong message
     */
    private handlePong;
    /**
     * Handle room joined message
     */
    private handleRoomJoined;
    /**
     * Handle room left message
     */
    private handleRoomLeft;
    /**
     * Handle room message
     */
    private handleRoomMessage;
    /**
     * Handle message acknowledgment
     */
    private handleMessageAck;
    /**
     * Handle direct message
     */
    private handleDirectMessage;
    /**
     * Handle server error
     */
    private handleServerError;
    /**
     * Handle generic message
     */
    private handleGenericMessage;
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
}
//# sourceMappingURL=messages.d.ts.map