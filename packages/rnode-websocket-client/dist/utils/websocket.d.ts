import { ConnectionState } from '../core/types';
export declare class WebSocketUtils {
    /**
   * Check WebSocket support in browser
   */
    static isSupported(): boolean;
    /**
     * Get connection state as text
     */
    static getStateString(state: ConnectionState): string;
    /**
     * Create unique client ID
     */
    static generateClientId(): string;
    /**
     * Validate WebSocket URL
     */
    static isValidUrl(url: string): boolean;
    /**
     * Create URL with parameters
     */
    static buildUrl(baseUrl: string, params: Record<string, string>): string;
    /**
     * Format time
     */
    static formatTimestamp(timestamp: number): string;
    /**
     * Check JSON validity
     */
    static isValidJSON(str: string): boolean;
    /**
     * Safe JSON parsing
     */
    static safeJSONParse<T>(str: string, fallback: T): T;
    /**
     * Generate random ID
     */
    static generateId(): string;
    /**
     * Check message type
     */
    static isSystemMessage(type: string): boolean;
    /**
     * Check room type
     */
    static isRoomMessage(type: string): boolean;
    /**
     * Check direct message type
     */
    static isDirectMessage(type: string): boolean;
}
//# sourceMappingURL=websocket.d.ts.map