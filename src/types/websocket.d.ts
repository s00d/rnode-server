export interface WebSocketEventResult {
  shouldCancel?: boolean;
  modifiedEvent?: any;
  error?: string;
}

export interface WebSocketOptions {
  onConnect?: (data: WebSocketEventData) => WebSocketEventResult | void;
  onMessage?: (data: WebSocketEventData) => WebSocketEventResult | void;
  onClose?: (data: WebSocketEventData) => WebSocketEventResult | void;
  onError?: (data: WebSocketEventData) => WebSocketEventResult | void;
  onJoinRoom?: (data: WebSocketEventData) => WebSocketEventResult | void;
  onLeaveRoom?: (data: WebSocketEventData) => WebSocketEventResult | void;
  onPing?: (data: WebSocketEventData) => WebSocketEventResult | void;
  onPong?: (data: WebSocketEventData) => WebSocketEventResult | void;
  onBinaryMessage?: (data: WebSocketEventData) => WebSocketEventResult | void;
}

export interface WebSocketEventData {
  connectionId: string;
  path: string;
  handlerId: string;
  data?: any;
  timestamp?: string;
}

export interface WebSocketSocket {
  id: string;
  clientId: string;
  path: string;
  roomId?: string;
  handlerId: string;
  metadata: Record<string, string>;
  createdAt: string;
  lastPing: string;
}

export interface WebSocketRoom {
  id: string;
  name: string;
  description?: string;
  maxConnections?: number;
  connections: string[];
  metadata: Record<string, string>;
  createdAt: string;
}

export interface WebSocketMessage {
  type: string;
  connectionId: string;
  path: string;
  handlerId: string;
  data?: string;
}

export interface RoomMessage {
  type: 'room_message';
  roomId: string;
  message: string;
  fromClientId: string;
  timestamp?: string;
}

export interface JoinRoomMessage {
  type: 'join_room';
  roomId: string;
}

export interface LeaveRoomMessage {
  type: 'leave_room';
  roomId: string;
}

export interface PingMessage {
  type: 'ping';
}

export interface WebSocketEventMap {
  'websocket:connect': WebSocketMessage;
  'websocket:message': WebSocketMessage;
  'websocket:close': WebSocketMessage;
  'websocket:error': WebSocketMessage;
  'websocket:room_joined': WebSocketMessage;
  'websocket:room_left': WebSocketMessage;
  'websocket:room_broadcast': WebSocketMessage;
  'websocket:ping': WebSocketMessage;
  'websocket:pong': WebSocketMessage;
  'websocket:pong_received': WebSocketMessage;
  'websocket:binary_message': WebSocketMessage;
}
