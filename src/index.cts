// This module is the CJS entry point for the library.
//
// Usage examples:
//
// // Create app with default log level (info)
// const app = createApp();
//
// // Create app with specific log level
// const app = createApp({ logLevel: 'debug' });
//
// // Create app with SSL and log level
// const app = createApp({ 
//   ssl: { certPath: './cert.pem', keyPath: './key.pem' },
//   logLevel: 'trace' 
// });
//
// Log levels: 'trace', 'debug', 'info', 'warn', 'error'
// Higher levels include lower levels (e.g., 'info' shows info, warn, and error)

import * as addon from './load.cjs';
import { StaticOptions } from "./types/app-router";

declare module "./load.cjs" {
  function hello(name: string): string;
  function createApp(logLevel?: string): { name: string; version: string; logLevel?: string };
  function get(path: string, handler: Function): void;
  function post(path: string, handler: Function): void;
  function put(path: string, handler: Function): void;
  function del(path: string, handler: Function): void;
  function patch(path: string, handler: Function): void;
  function options(path: string, handler: Function): void;
  function trace(path: string, handler: Function): void;
  function any(path: string, handler: Function): void;
  function use(path: string, handler: Function): void;
  function listen(port: number, host: string, options: AppOptions): void;
  function loadStaticFiles(path: string, options?: StaticOptions): void;
  function clearStaticCache(): void;
  function getStaticStats(): string;
  function initTemplates(pattern: string, options: TemplateOptions): string;
  function renderTemplate(templateName: string, context: string): string;

  // Functions for working with files
  function saveFile(filename: string, base64Data: string, uploadsDir: string): string;
  function deleteFile(filename: string, uploadsDir: string): string;
  function listFiles(uploadsDir: string): string;
  function getFileContent(filename: string, uploadsDir: string): string;
  function fileExists(filename: string, uploadsDir: string): boolean;
  function registerDownloadRoute(path: string, options: string): void;
  function registerUploadRoute(path: string, options: string): void;

  // HTTP utility functions
  function httpRequest(method: string, url: string, headers: string, body: string, timeout: number): string;
  function httpBatch(requests: string, timeout: number): string;

  // WebSocket functions
  function registerWebSocket(
    path: string,
    onConnect?: string,
    onMessage?: string,
    onClose?: string,
    onError?: string,
    onJoinRoom?: string,
    onLeaveRoom?: string,
    clientId?: string
  ): void;
  function createRoom(name: string, description?: string, maxConnections?: number): string;
  function sendRoomMessage(roomId: string, message: string): boolean;
  function getRoomInfo(roomId: string): {
    id: string;
    name: string;
    connectionsCount: number;
  } | null;
  function joinRoom(connectionId: string, roomId: string): boolean;
  function leaveRoom(connectionId: string, roomId: string): boolean;
  function getAllRooms(): Array<{
    id: string;
    name: string;
    description?: string;
    maxConnections?: number;
    connectionsCount: number;
    metadata: Record<string, string>;
    createdAt: string;
  }>;
  function getClientInfo(connectionId: string): {
    id: string;
    clientId: string;
    path: string;
    roomId?: string;
    handlerId: string;
    metadata: Record<string, string>;
    createdAt: string;
    lastPing: string;
  } | null;
  function getRoomInfo(roomId: string): {
    id: string;
    name: string;
    connectionsCount: number;
  } | null;
  function getUserRooms(connectionId: string): Array<{
    id: string;
    name: string;
    description?: string;
    maxConnections?: number;
    connectionsCount: number;
    metadata: Record<string, string>;
    createdAt: string;
  }>;

  // Cache functions
  function initCacheSystem(config: {
    defaultTtl?: number;
    maxMemory?: number;
    redisUrl?: string;
    fileCachePath?: string;
  }): void;
  function cacheGet(key: string, tags: string[]): string | null;
  function cacheSet(key: string, value: string, tags: string[], ttl: number): boolean;
  function cacheDelete(key: string, tags: string[]): boolean;
  function cacheExists(key: string, tags: string[]): boolean;
  function cacheClear(): boolean;
  function cacheFlushByTags(tags: string[]): number;


}

// Import types from app-router
import { TemplateOptions } from './types/app-router';
// Import types from app-router
import { AppOptions } from './types/app-router';
// Import router utilities
import { createRouter, type Router as RouterType } from './utils/router';
// Import app factory
import { createApp as createAppUtil, greeting as greetingUtil } from './utils/app-factory';
// Import global setup utilities
import { setupGlobalFunctions } from './utils/global-utils';
// Import shutdown utilities
import { setupGracefulShutdown } from './utils/shutdown-utils';
import { RNodeApp } from "./utils/app";


// Setup global functions first
setupGlobalFunctions();

// Setup graceful shutdown
setupGracefulShutdown();

// Function for creating new router
export function Router(): RouterType {
  return createRouter();
}

// Function for creating new app
export function createApp(options?: AppOptions): RNodeApp {
  return createAppUtil(options);
}

// Simple greeting function
export function greeting(name: string): { message: string } {
  return greetingUtil(name);
}

// Default export for ES modules compatibility
export default {
  createApp,
  greeting,
  Router
};

// Export types for use
export type { StaticOptions, TemplateOptions, AppOptions, DownloadOptions, UploadOptions, SslConfig } from './types/app-router';
export type { Request } from './utils/request';
export type { Response } from './utils/response';


