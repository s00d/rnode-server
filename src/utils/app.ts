import { logger } from './logger';
import { Router } from './router';
import { SslConfig, AppOptions } from '../types/app-router';
import { Request } from './request';
import { Response } from './response';
import { clearStaticCache, getStaticStats } from './file-utils';
import { createHttpMethodsUtils } from './http-methods';
import { createMiddlewareUtils } from './middleware';
import * as addon from '../load.cjs';
import { DownloadOptions, UploadOptions } from "../types/app-router";
import { handlers, middlewares, websocketCallbacks } from './global-utils';
import { WebSocketOptions, WebSocketRoom } from '../types/websocket';

export class RNodeApp extends Router {
  // Properties
  private logLevel: string = 'info';
  private metrics: boolean = false;
  private timeout: number = 30000;
  private devMode: boolean = false;
  private sslConfig: SslConfig | undefined = undefined;

  constructor() {
    super();
    
    // Initialize HTTP methods and middleware for the app level
    const httpMethods = createHttpMethodsUtils(handlers);
    const middlewareUtils = createMiddlewareUtils(middlewares);
    
    // Bind app-specific methods to preserve 'this' context
    this.setMetrics = this.setMetrics.bind(this);
    this.getMetrics = this.getMetrics.bind(this);
    this.setLogLevel = this.setLogLevel.bind(this);
    this.getLogLevel = this.getLogLevel.bind(this);
    this.setTimeout = this.setTimeout.bind(this);
    this.getTimeout = this.getTimeout.bind(this);
    this.setDevMode = this.setDevMode.bind(this);
    this.getDevMode = this.getDevMode.bind(this);
    this.setSslConfig = this.setSslConfig.bind(this);
    this.getSslConfig = this.getSslConfig.bind(this);
    this.clearStaticCache = this.clearStaticCache.bind(this);
    this.getStaticStats = this.getStaticStats.bind(this);
    this.download = this.download.bind(this);
    this.upload = this.upload.bind(this);
    this.useRouter = this.useRouter.bind(this);
    this.getAllRoutes = this.getAllRoutes.bind(this);
    this.listen = this.listen.bind(this);
    this.httpRequest = this.httpRequest.bind(this);
    this.httpBatch = this.httpBatch.bind(this);
  }

  // Logging configuration
  setMetrics(metricsValue: boolean): void {
    this.metrics = metricsValue;
  }

  getMetrics() {
    return this.metrics;
  }

  setLogLevel(level: string): void {
    const newLevel = level.toLowerCase();
    
    // Set log level in the logger
    logger.setLevel(newLevel);
    
    // Update environment variable for Rust logging
    process.env.RUST_LOG = newLevel;
    
    // Store log level in the app
    this.logLevel = newLevel;
    
    logger.info(`🔧 Log level changed to: ${newLevel}`, 'rnode_server::app');
  }

  getLogLevel(): string {
    return this.logLevel;
  }

  setTimeout(timeoutValue: number): void {
    this.timeout = timeoutValue;
  }

  getTimeout() {
    return this.timeout;
  }

  setDevMode(devModeValue: boolean): void {
    this.devMode = devModeValue;
  }

  getDevMode() {
    return this.devMode;
  }

  // SSL configuration
  setSslConfig(config: SslConfig): void {
    this.sslConfig = config;
  }

  getSslConfig(): SslConfig | undefined {
    return this.sslConfig;
  }

  // Override static method to add app-specific functionality
  static(pathOrPaths: string | string[], options?: any): void {
    super.static(pathOrPaths, options);
  }

  // Clear static files cache
  clearStaticCache(): void {
    clearStaticCache();
  }

  // Get static files statistics
  getStaticStats(): string {
    return getStaticStats();
  }

  // Override file operations to use addon
  saveFile(filename: string, base64Data: string, uploadsDir: string) {
    const result = addon.saveFile(filename, base64Data, uploadsDir);
    return JSON.parse(result);
  }

  deleteFile(filename: string, uploadsDir: string) {
    const result = addon.deleteFile(filename, uploadsDir);
    return JSON.parse(result);
  }

  listFiles(uploadsDir: string) {
    const result = addon.listFiles(uploadsDir);
    return JSON.parse(result);
  }

  getFileContent(filename: string, uploadsDir: string) {
    const result = addon.getFileContent(filename, uploadsDir);
    return JSON.parse(result);
  }

  fileExists(filename: string, uploadsDir: string): boolean {
    return addon.fileExists(filename, uploadsDir);
  }

  // File upload/download
  download(path: string, options: DownloadOptions): Router {
    // Register route for file downloads in Rust backend
    addon.registerDownloadRoute(path, JSON.stringify(options));
    return this;
  }

  upload(path: string, options?: UploadOptions): Router {
    // Register route for file uploads in Rust backend
    addon.registerUploadRoute(path, JSON.stringify(options));
    return this;
  }

  // Override template methods to use addon
  initTemplates(pattern: string, options: any): string {
    try {
      return addon.initTemplates(pattern, options);
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: `Failed to initialize templates: ${error}`
      });
    }
  }

  renderTemplate(templateName: string, context: object): string {
    try {
      const contextStr = JSON.stringify(context);
      return addon.renderTemplate(templateName, contextStr);
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: `Failed to render template: ${error}`
      });
    }
  }

  // Get all registered routes including router routes
  getAllRoutes(): Map<string, (req: Request, res: Response) => void> {
    // Return global handlers which include all routes from useRouter
    const result = new Map<string, (req: Request, res: Response) => void>();
    for (const [key, handlerInfo] of handlers) {
      result.set(key, handlerInfo.handler);
    }
    return result;
  }

  // Router methods
  useRouter(path: string, router: Router): void {
    logger.info(`🔧 Registering router for path: ${path}`, 'rnode_server::router');

    // Register all routes from router with prefix
    const routerHandlers = router.getHandlers();
    const routerMiddlewares = router.getMiddlewares();

    logger.debug(`📝 Router contains ${routerHandlers.size} handlers and ${routerMiddlewares.size} middleware`, 'rnode_server::router');

    // Register router middleware
    for (const [routePath, middlewareArray] of routerMiddlewares) {
      let fullPath: string;

      if (routePath === '*') {
        // Глобальный middleware для роутера - регистрируем для всех путей роутера
        fullPath = `${path}/*`;
        logger.debug(`🔐 Registering global router middleware for: ${fullPath}`, 'rnode_server::router');
      } else {
        // Обычный middleware с путем
        fullPath = `${path}${routePath}`;
        logger.debug(`🔐 Registering router middleware for: ${fullPath}`, 'rnode_server::router');
      }

      logger.debug(`🔍 Full path: '${fullPath}', routePath: '${routePath}', path: '${path}'`, 'rnode_server::router');

      // Add to global middlewares
      const existing = middlewares.get(fullPath) || [];
      middlewares.set(fullPath, [...existing, ...middlewareArray]);

      // Register each middleware individually in Rust addon
      for (const middleware of middlewareArray) {
        logger.debug(`🔧 Calling addon.use('${fullPath}', middleware)`, 'rnode_server::router');
        addon.use(fullPath, middleware);
      }

      logger.info(`✅ Registered router middleware: ${fullPath} (${middlewareArray.length} middleware functions)`, 'rnode_server::router');
      logger.debug(`📊 Global middlewares after registration: ${Array.from(middlewares.keys()).join(', ')}`, 'rnode_server::router');
    }

    // Register router handlers
    for (const [methodPath, handlerInfo] of routerHandlers) {
      const [method, routePath] = methodPath.split(':', 2);
      const fullPath = `${path}${routePath}`;
      const { handler } = handlerInfo;

      logger.debug(`🔧 Registering handler: ${method} ${fullPath} (original path: ${routePath})`, 'rnode_server::router');

      // Add to global handlers with full path
      handlers.set(`${method}:${fullPath}`, { method, handler });

      // Register in Rust addon immediately
      const addonMethod = method.toLowerCase() === 'delete' ? 'del' : method.toLowerCase();
      try {
        (addon as any)[addonMethod](fullPath, handler);
        logger.info(`✅ Router handler registered in Rust addon: ${method} ${fullPath}`, 'rnode_server::router');
      } catch (error) {
        logger.error(`❌ Failed to register router handler in Rust addon: ${method} ${fullPath}`, 'rnode_server::router');
        logger.error(`Error: ${error}`, 'rnode_server::router');
      }
    }

    logger.info(`🎯 Router registered for path: ${path}`, 'rnode_server::router');
    logger.debug(`📊 Total handlers in system: ${router.getHandlers().size}`, 'rnode_server::router');
    logger.debug(`🔧 Global handlers updated: ${Array.from(handlers.keys()).join(', ')}`, 'rnode_server::router');
  }

  // WebSocket methods
  websocket(path: string, options: WebSocketOptions = {}): void {
    try {
      // Определяем список включенных событий на основе наличия колбеков
      // Если колбек настроен - добавляем событие в список для обработки
      const enabledEvents: string[] = [];
      
      if (options.onConnect) enabledEvents.push('onConnect');
      if (options.onMessage) enabledEvents.push('onMessage');
      if (options.onClose) enabledEvents.push('onClose');
      if (options.onError) enabledEvents.push('onError');
      if (options.onJoinRoom) enabledEvents.push('onJoinRoom');
      if (options.onLeaveRoom) enabledEvents.push('onLeaveRoom');
      if (options.onPing) enabledEvents.push('onPing');
      if (options.onPong) enabledEvents.push('onPong');
      if (options.onBinaryMessage) enabledEvents.push('onBinaryMessage');
      
      // Регистрируем WebSocket роут с включенными событиями
      // События НЕ в списке будут пропущены без обработки
      addon.registerWebSocket(path, JSON.stringify(enabledEvents));
      
      // Сохраняем колбеки в глобальном хранилище для последующего вызова
      websocketCallbacks.set(path, options);
      
      logger.info(`✅ WebSocket route registered: ${path}`, 'rnode_server::websocket');
      logger.debug(`🔧 Events with callbacks: ${enabledEvents.join(', ')}`, 'rnode_server::websocket');
      logger.debug(`🚫 Events without callbacks will be skipped`, 'rnode_server::websocket');
    } catch (error) {
      logger.error(`❌ Failed to register WebSocket route: ${path}`, 'rnode_server::websocket');
      logger.error(`Error: ${error}`, 'rnode_server::websocket');
    }
  }

  createRoom(name: string, description?: string, maxConnections?: number): string {
    try {
      const roomId = addon.createRoom(name, description, maxConnections);
      logger.info(`✅ Room created: ${name} (${roomId})`, 'rnode_server::websocket');
      return roomId;
    } catch (error) {
      logger.error(`❌ Failed to create room: ${name}`, 'rnode_server::websocket');
      logger.error(`Error: ${error}`, 'rnode_server::websocket');
      throw error;
    }
  }

  sendRoomMessage(roomId: string, message: string): boolean {
    try {
      const result = addon.sendRoomMessage(roomId, message);
      logger.debug(`📤 Room message sent to ${roomId}: ${message}`, 'rnode_server::websocket');
      return result;
    } catch (error) {
      logger.error(`❌ Failed to send room message to ${roomId}`, 'rnode_server::websocket');
      logger.error(`Error: ${error}`, 'rnode_server::websocket');
      return false;
    }
  }

  getRoomInfo(roomId: string): WebSocketRoom | null {
    try {
      const roomInfo = addon.getRoomInfo(roomId);
      if (roomInfo && roomInfo.id) {
        return {
          id: roomInfo.id,
          name: roomInfo.name,
          description: undefined,
          maxConnections: undefined,
          connections: [],
          metadata: {},
          createdAt: new Date().toISOString(),
        } as WebSocketRoom;
      }
      return null;
    } catch (error) {
      logger.error(`❌ Failed to get room info for ${roomId}`, 'rnode_server::websocket');
      logger.error(`Error: ${error}`, 'rnode_server::websocket');
      return null;
    }
  }

  // Программное подключение клиента к комнате
  joinRoom(connectionId: string, roomId: string): boolean {
    try {
      const result = addon.joinRoom(connectionId, roomId);
      logger.info(`🔗 Client ${connectionId} joining room ${roomId}`, 'rnode_server::websocket');
      return result;
    } catch (error) {
      logger.error(`❌ Failed to join room ${roomId} for client ${connectionId}`, 'rnode_server::websocket');
      logger.error(`Error: ${error}`, 'rnode_server::websocket');
      return false;
    }
  }

  // Программный выход клиента из комнаты
  leaveRoom(connectionId: string, roomId: string): boolean {
    try {
      const result = addon.leaveRoom(connectionId, roomId);
      logger.info(`🚪 Client ${connectionId} leaving room ${roomId}`, 'rnode_server::websocket');
      return result;
    } catch (error) {
      logger.error(`❌ Failed to leave room ${roomId} for client ${connectionId}`, 'rnode_server::websocket');
      logger.error(`Error: ${error}`, 'rnode_server::websocket');
      return false;
    }
  }

  // Получить список всех комнат
  getAllRooms(): WebSocketRoom[] {
    try {
      const rooms = addon.getAllRooms();
      logger.debug(`📋 Getting all rooms`, 'rnode_server::websocket');
      if (rooms && Array.isArray(rooms)) {
        return rooms.map(room => ({
          id: room.id,
          name: room.name,
          description: room.description,
          maxConnections: room.maxConnections,
          connections: [], // Rust не возвращает connections, используем пустой массив
          metadata: room.metadata || {},
          createdAt: room.createdAt || new Date().toISOString(),
        } as WebSocketRoom));
      }
      return [];
    } catch (error) {
      logger.error(`❌ Failed to get all rooms`, 'rnode_server::websocket');
      logger.error(`Error: ${error}`, 'rnode_server::websocket');
      return [];
    }
  }

  // Получить информацию о клиенте
  getClientInfo(connectionId: string): any {
    try {
      const clientInfo = addon.getClientInfo(connectionId);
      logger.debug(`👤 Getting client info for ${connectionId}`, 'rnode_server::websocket');
      return clientInfo;
    } catch (error) {
      logger.error(`❌ Failed to get client info for ${connectionId}`, 'rnode_server::websocket');
      logger.error(`Error: ${error}`, 'rnode_server::websocket');
      return null;
    }
  }

  // Получить комнаты пользователя
  getUserRooms(connectionId: string): WebSocketRoom[] {
    try {
      const rooms = addon.getUserRooms(connectionId);
      logger.debug(`🏠 Getting user rooms for ${connectionId}`, 'rnode_server::websocket');
      if (rooms && Array.isArray(rooms)) {
        return rooms.map(room => ({
          id: room.id,
          name: room.name,
          description: room.description,
          maxConnections: room.maxConnections,
          connections: [], // Rust не возвращает connections, используем пустой массив
          metadata: room.metadata || {},
          createdAt: room.createdAt || new Date().toISOString(),
        } as WebSocketRoom));
      }
      return [];
    } catch (error) {
      logger.error(`❌ Failed to get user rooms for ${connectionId}`, 'rnode_server::websocket');
      logger.error(`Error: ${error}`, 'rnode_server::websocket');
      return [];
    }
  }

  listen(port: number, hostOrCallback?: string | (() => void), callback?: () => void): void {
    // Copy app-level handlers to global system (like in old version)
    for (const [key, handlerInfo] of this.getHandlers()) {
      handlers.set(key, handlerInfo);
    }

    // Register all global handlers (including app and router handlers) in Rust addon
    for (const [key, handlerInfo] of handlers) {
      const [method, path] = key.split(':', 2);
      
      // Register in Rust addon through existing methods
      const addonMethod = method.toLowerCase() === 'delete' ? 'del' : method.toLowerCase();
      (addon as any)[addonMethod](path, handlerInfo.handler);
    }

    // Copy app-level middlewares to global system (like in old version)
    for (const [key, middlewareArray] of this.getMiddlewares()) {
      const existing = middlewares.get(key) || [];
      middlewares.set(key, [...existing, ...middlewareArray]);
    }

    // Register all global middlewares in Rust addon
    for (const [key, middlewareArray] of middlewares) {
      for (const middleware of middlewareArray) {
        logger.debug(`🔧 Calling addon.use('${key}', middleware) in listen`, 'rnode_server::server');
        addon.use(key, middleware);
      }
    }

    logger.debug(`🔧 Global handlers updated: ${Array.from(handlers.keys()).join(', ')}`, 'rnode_server::server');
    logger.debug(`🔧 Global middlewares updated: ${Array.from(middlewares.keys()).join(', ')}`, 'rnode_server::server');

    // Determine host and callback
    let host: string = "127.0.0.1";
    let actualCallback: (() => void) | undefined;

    if (typeof hostOrCallback === 'string') {
      host = hostOrCallback;
      actualCallback = callback;
    } else if (typeof hostOrCallback === 'function') {
      actualCallback = hostOrCallback;
    }

    // Normalize host values
    if (host === 'localhost') {
      host = '127.0.0.1';
    } else if (host === '0') {
      host = '0.0.0.0';
    }

    const options: AppOptions = {
      metrics: this.getMetrics(),
      ssl: this.getSslConfig(),
      logLevel: this.getLogLevel(),
      timeout: this.getTimeout(),
      devMode: this.getDevMode(),
    }

    addon.listen(port, host, options);

    if (actualCallback) {
      actualCallback();
    }
  }
}

// Legacy function for backward compatibility
export function createRNodeApp(): RNodeApp {
  return new RNodeApp();
}
