import { ConnectionState } from '../core/types';

export class WebSocketUtils {
  /**
 * Check WebSocket support in browser
 */
  static isSupported(): boolean {
    return typeof WebSocket !== 'undefined';
  }

  /**
   * Get connection state as text
   */
  static getStateString(state: ConnectionState): string {
    switch (state) {
      case ConnectionState.CONNECTING:
        return 'CONNECTING';
      case ConnectionState.OPEN:
        return 'OPEN';
      case ConnectionState.CLOSING:
        return 'CLOSING';
      case ConnectionState.CLOSED:
        return 'CLOSED';
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * Create unique client ID
   */
  static generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate WebSocket URL
   */
  static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'ws:' || urlObj.protocol === 'wss:';
    } catch {
      return false;
    }
  }

  /**
   * Create URL with parameters
   */
  static buildUrl(baseUrl: string, params: Record<string, string>): string {
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
    return url.toString();
  }

  /**
   * Format time
   */
  static formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toISOString();
  }

  /**
   * Check JSON validity
   */
  static isValidJSON(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Safe JSON parsing
   */
  static safeJSONParse<T>(str: string, fallback: T): T {
    try {
      return JSON.parse(str) as T;
    } catch {
      return fallback;
    }
  }

  /**
   * Generate random ID
   */
  static generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Check message type
   */
  static isSystemMessage(type: string): boolean {
    const systemTypes = ['ping', 'pong', 'welcome', 'room_joined', 'room_left', 'message_ack'];
    return systemTypes.includes(type);
  }

  /**
   * Check room type
   */
  static isRoomMessage(type: string): boolean {
    return type === 'room_message' || type === 'join_room' || type === 'leave_room';
  }

  /**
   * Check direct message type
   */
  static isDirectMessage(type: string): boolean {
    return type === 'direct_message';
  }
}
