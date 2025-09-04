export interface WebSocketOptions {
    url: string;
    protocols?: string | string[];
    clientId?: string;
    autoReconnect?: boolean;
    reconnectAttempts?: number;
    reconnectDelay?: number;
    pingInterval?: number;
    pongTimeout?: number;
    onConnect?: (event: WebSocketEvent) => void;
    onMessage?: (event: WebSocketEvent) => void;
    onBinaryMessage?: (event: WebSocketEvent) => void;
    onDisconnect?: (event: WebSocketEvent) => void;
    onError?: (event: WebSocketEvent) => void;
    onWelcome?: (message: WelcomeMessage) => void;
    onReconnect?: (data: ReconnectEvent) => void;
    onJoinRoom?: (data: RoomEvent) => void;
    onLeaveRoom?: (data: RoomEvent) => void;
    onPing?: (data: PingEvent) => void;
    onPong?: (data: PongEvent) => void;
    onMessageAck?: (data: MessageAckEvent) => void;
    onRoomMessage?: (data: RoomMessageEvent) => void;
    onDirectMessage?: (data: DirectMessageEvent) => void;
    onServerError?: (data: ServerErrorEvent) => void;
    onMessageBlocked?: (data: MessageBlockedEvent) => void;
}
export interface WebSocketEvent {
    type: string;
    data?: unknown;
    timestamp: number;
}
export interface WebSocketMessage {
    type: string;
    connection_id?: string;
    client_id?: string;
    path?: string;
    data?: unknown;
    timestamp?: string;
    room_id?: string | null;
    target_client_id?: string;
    [key: string]: unknown;
}
export interface WelcomeMessage {
    type: 'welcome';
    connection_id: string;
    client_id: string;
    path: string;
    timestamp: string;
}
export interface RoomInfo {
    id: string;
    name: string;
    description?: string;
    maxConnections?: number;
    connections: string[];
    metadata: Record<string, string>;
    createdAt: string;
}
export interface ConnectionInfo {
    id: string;
    clientId: string;
    path: string;
    roomId?: string;
    handlerId: string;
    metadata: Record<string, string>;
    createdAt: string;
    lastPing: string;
}
export interface ReconnectConfig {
    enabled: boolean;
    interval: number;
    maxAttempts: number;
    currentAttempt: number;
}
export interface PingPongConfig {
    enabled: boolean;
    interval: number;
    timeout: number;
    lastPing: number;
    lastPong: number;
}
export interface ReconnectEvent {
    attempt: number;
    maxAttempts: number;
    delay: number;
    timestamp: number;
}
export interface RoomEvent {
    roomId: string;
    timestamp: number;
}
export interface PingEvent {
    timestamp: number;
}
export interface PongEvent {
    latency: number;
    timestamp: number;
}
export interface MessageAckEvent {
    message: string;
    timestamp: string;
    type: string;
}
export interface RoomMessageEvent {
    message: string;
    room_id: string;
    timestamp: string;
    type: string;
}
export interface DirectMessageEvent {
    message: string;
    from_client_id: string;
    timestamp: string;
    type: string;
}
export interface ServerErrorEvent {
    error: string;
    error_type: string;
    timestamp: string;
    type: string;
}
export interface MessageBlockedEvent {
    originalMessage: string;
    reason: string;
    timestamp: string;
    type: string;
}
export declare enum ConnectionState {
    CONNECTING,
    OPEN,
    CLOSING,
    CLOSED
}
export interface ConnectionStatus {
    isConnected: boolean;
    isConnecting: boolean;
    isReconnecting: boolean;
    currentRoom: string | null;
    state: ConnectionState;
}
export interface MessageHandler {
    type: string;
    handler: (message: WebSocketMessage) => void;
}
//# sourceMappingURL=types.d.ts.map