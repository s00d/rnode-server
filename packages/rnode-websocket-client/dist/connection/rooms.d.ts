import { WebSocketOptions } from '../core/types';
import { ConnectionManager } from './manager';
export declare class RoomManager {
    private connectionManager;
    private options;
    constructor(connectionManager: ConnectionManager, options: WebSocketOptions);
    /**
     * Join room
     */
    joinRoom(roomId: string): boolean;
    /**
     * Leave room
     */
    leaveRoom(roomId?: string): boolean;
    /**
     * Get current room
     */
    getCurrentRoom(): string | null;
    /**
     * Check if in room
     */
    isInRoom(roomId?: string): boolean;
}
//# sourceMappingURL=rooms.d.ts.map