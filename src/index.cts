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

// The Rust addon.
import * as addon from './load.cjs';
import micromatch from 'micromatch';

// Express types for compatibility
import {NextFunction, Request as ExpressRequest, Response as ExpressResponse} from 'express';

// Logger class with levels similar to backend
class Logger {
  private currentLevel: string = 'info';
  
  // Log level hierarchy (higher levels include lower levels)
  private readonly levels = {
    trace: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4
  };

  setLevel(level: string): void {
    this.currentLevel = level.toLowerCase();
  }

  private shouldLog(level: string): boolean {
    const currentLevelNum = this.levels[this.currentLevel as keyof typeof this.levels] ?? 2;
    const messageLevelNum = this.levels[level as keyof typeof this.levels] ?? 2;
    return messageLevelNum >= currentLevelNum;
  }

  private formatMessage(message: any): string {
    if (typeof message === 'string') {
      return message;
    }
    if (message === null) {
      return 'null';
    }
    if (message === undefined) {
      return 'undefined';
    }
    if (typeof message === 'object') {
      try {
        return JSON.stringify(message, null, 2);
      } catch {
        return String(message);
      }
    }
    return String(message);
  }

  log(level: string, message: any, module?: string): void {
    if (!this.shouldLog(level)) return;

    // Format timestamp without milliseconds (like backend: 2025-08-25T06:39:50Z)
    const now = new Date();
    const timestamp = now.getFullYear() + '-' + 
                     String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                     String(now.getDate()).padStart(2, '0') + 'T' + 
                     String(now.getHours()).padStart(2, '0') + ':' + 
                     String(now.getMinutes()).padStart(2, '0') + ':' + 
                     String(now.getSeconds()).padStart(2, '0') + 'Z';
    
    const levelUpper = level.toUpperCase();
    const formattedMessage = this.formatMessage(message);
    
    // ANSI color codes
    const colors = {
      trace: '\x1b[90m',    // Gray
      debug: '\x1b[36m',    // Cyan
      info: '\x1b[32m',     // Green
      warn: '\x1b[33m',     // Yellow
      error: '\x1b[31m',    // Red
      reset: '\x1b[0m'      // Reset
    };
    
    const color = colors[level as keyof typeof colors] || colors.reset;
    const moduleStr = module ? ` ${module}` : '';
    
    console.log(`[${timestamp} ${color}${levelUpper.padEnd(5)}\x1b[0m${moduleStr}] ${formattedMessage}`);
  }

  trace(message: any, module?: string): void {
    this.log('trace', message, module);
  }

  debug(message: any, module?: string): void {
    this.log('debug', message, module);
  }

  info(message: any, module?: string): void {
    this.log('info', message, module);
  }

  warn(message: any, module?: string): void {
    this.log('warn', message, module);
  }

  error(message: any, module?: string): void {
    this.log('error', message, module);
  }
}

// Global logger instance
const logger = new Logger();

// Express middleware wrapper types
export interface ExpressMiddleware {
  (req: ExpressRequest, res: ExpressResponse, next: NextFunction): void;
}

export interface ExpressErrorMiddleware {
  (err: any, req: ExpressRequest, res: ExpressResponse, next: NextFunction): void;
}

// Interface for uploaded file
export interface UploadedFile {
  filename: string;
  contentType: string;
  size: number;
  data: string; // Base64 encoded data
}

// Interface for multipart data
export interface MultipartData {
  fields: Record<string, string>; // Regular form fields
  files: Record<string, UploadedFile>; // Uploaded files
}

// Types for file operations
export interface FileInfo {
  name: string;
  size: number;
  created: string;
  modified: string;
  mime_type: string;
  path: string;
  relative_path: string;
}

export interface FileOperationResult {
  success: boolean;
  message?: string;
  error?: string;
  path?: string;
}

export interface FileListResult {
  success: boolean;
  files: FileInfo[];
  total: number;
  error?: string;
}

export interface FileContentResult {
  success: boolean;
  content: string; // Base64 encoded
  size: number;
  filename: string;
  mime_type: string;
  error?: string;
}

// Types for template operations
export interface TemplateOptions {
  autoescape: boolean;
}

// Express-подобные типы
export interface Request {
  method: string;
  url: string;
  params: Record<string, string>;
  query: Record<string, string>;
  body: any; // Can be string, Record<string, string> (for multipart fields), or null
  files?: Record<string, UploadedFile>; // Files from multipart request
  contentType?: string; // Content-Type header
  headers: Record<string, string>;
  cookies?: string;
  customParams?: Record<string, any>; // Parameters from previous middleware/handlers
  ip?: string; // Client IP address
  ips?: string[]; // All IP addresses from proxy chain
  ipSource?: string; // Source header used for IP extraction
  getCookie(name: string): string | null;
  getHeader(name: string): string | null;
  hasCookie(name: string): boolean;
  hasHeader(name: string): boolean;
  getCookies(): Record<string, string>;
  getHeaders(): Record<string, string>;
  // Methods for working with custom parameters
  setParam(name: string, value: any): void;
  getParam(name: string): any;
  hasParam(name: string): boolean;
  getParams(): Record<string, any>;
  // Methods for working with files
  getFile(fieldName: string): UploadedFile | null;
  getFiles(): Record<string, UploadedFile>;
  hasFile(fieldName: string): boolean;
  getFileCount(): number;
  // Accept methods for content negotiation
  accepts(type: string): boolean;
  acceptsCharsets(charset: string): boolean;
  acceptsEncodings(encoding: string): boolean;
  acceptsLanguages(language: string): boolean;
}

// Use this declaration to assign types to the addon's exports,
// which otherwise by default are `any`.
declare module "./load.cjs" {
  function hello(name: string): string;
  function createApp(logLevel?: string): { name: string; version: string; logLevel?: string };
  function get(path: string, handler: Function): void;
  function post(path: string, handler: Function): void;
  function put(path: string, handler: Function): void;
  function del(path: string, handler: Function): void;
  function patch(path: string, handler: Function): void;
  function options(path: string, handler: Function): void;
  function use(path: string, handler: Function): void;
  // function listen(port: number, host: string, certPath?: string, keyPath?: string): void;
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
  
  // Promise utility functions
  function setPromiseResult(promiseId: string, result: string): boolean;
  function setPromiseError(promiseId: string, error: string): boolean;
}

export interface Response {
  // Properties for direct access
  headers: Record<string, string | string[]>;
  content: string | Buffer;
  contentType: string;

  // Methods
  status(code: number): Response;
  json(data: any): Response;
  send(data: string | Buffer): Response;
  end(data?: string | Buffer): Response;
  async(): Response;
  setHeader(name: string, value: string): Response;
  getHeader(name: string): string | string[] | null;
  getCookie(name: string): string | null;
  getCookies(): Record<string, string>;
  getHeaders(): Record<string, string | string[]>;
  setCookie(name: string, value: string, options?: any): Response;
  // Methods for working with files and forms
  sendFile(file: UploadedFile): Response;
  sendBuffer(buffer: Buffer, contentType?: string, size?: number): Response;
  sendFiles(files: Record<string, UploadedFile>): Response;
  sendMultipart(data: MultipartData): Response;
  download(filepath: string, filename?: string): Response;
  attachment(filename?: string): Response;
  // Methods for various content types
  html(content: string): Response;
  text(content: string): Response;
  xml(content: string): Response;
  redirect(url: string, status?: number): Response;
}

// Middleware type
type Middleware = (req: Request, res: Response, next: (error?: any) => void) => void | Promise<any>;

export interface Router {
  get(path: string, handler: (req: Request, res: Response) => void): Router;
  post(path: string, handler: (req: Request, res: Response) => void): Router;
  put(path: string, handler: (req: Request, res: Response) => void): Router;
  delete(path: string, handler: (req: Request, res: Response) => void): Router;
  patch(path: string, handler: (req: Request, res: Response) => void): Router;
  options(path: string, handler: (req: Request, res: Response) => void): Router;
  use(pathOrMiddleware: string | Middleware, middleware?: Middleware): void;

  // Express middleware support
  useExpress(middleware: ExpressMiddleware): void;
  useExpress(path: string, middleware: ExpressMiddleware): void;
  useExpressError(middleware: ExpressErrorMiddleware): void;

  // Static files
  static(path: string, options?: StaticOptions): void;
  static(paths: string[], options?: StaticOptions): void;

  listFiles(folder: string): FileListResult;
  saveFile(filename: string, base64Data: string, uploadsDir: string): FileOperationResult;
  deleteFile(filename: string, uploadsDir: string): FileOperationResult;
  getFileContent(filename: string, uploadsDir: string): FileContentResult;
  fileExists(filename: string, uploadsDir: string): boolean;

  // Template methods
  initTemplates(pattern: string, options: TemplateOptions): string;
  renderTemplate(templateName: string, context: object): string;

  getHandlers(): Map<string, { method: string; handler: (req: Request, res: Response) => void | Promise<any> }>;
  getMiddlewares(): Map<string, Middleware[]>;
}

// Interface for static file settings
interface StaticOptions {
  cache?: boolean;
  maxAge?: number;
  maxFileSize?: number;
  etag?: boolean;
  lastModified?: boolean;
  gzip?: boolean;
  brotli?: boolean;
  allowHiddenFiles?: boolean;
  allowSystemFiles?: boolean;
  allowedExtensions?: string[];
  blockedPaths?: string[];
}

export interface DownloadOptions {
  folder: string;
  maxFileSize?: number; // in bytes
  allowedExtensions?: string[];
  blockedPaths?: string[];
  allowHiddenFiles?: boolean;
  allowSystemFiles?: boolean;
}

export interface UploadOptions {
  folder: string;
  allowedSubfolders?: string[]; // Allowed subfolders for security
  maxFileSize?: number; // in bytes
  allowedExtensions?: string[];
  allowedMimeTypes?: string[]; // allowed MIME types for security
  multiple?: boolean; // allow multiple file upload
  maxFiles?: number; // maximum number of files (only if multiple: true)
  overwrite?: boolean; // allow overwriting existing files
}

// RNode Server Application Interface
export interface RNodeAppInterface extends Router {
  // Server methods
  listen(port: number, callback?: () => void): void;
  listen(port: number, host: string, callback?: () => void): void;

  // Router methods
  useRouter(path: string, router: Router): void;

  use(pathOrMiddleware: string | ((req: Request, res: Response, next: () => void) => void), middleware?: (req: Request, res: Response, next: () => void) => void): void;

  // Static files
  static(path: string, options?: StaticOptions): void;
  static(paths: string[], options?: StaticOptions): void;
  clearStaticCache(): void;
  getStaticStats(): string;

  // File operations
  saveFile(filename: string, base64Data: string, uploadsDir: string): FileOperationResult;
  deleteFile(filename: string, uploadsDir: string): FileOperationResult;
  listFiles(uploadsDir: string): FileListResult;
  getFileContent(filename: string, uploadsDir: string): FileContentResult;
  fileExists(filename: string, uploadsDir: string): boolean;

  // File upload/download
  download(path: string, options: DownloadOptions): Router;
  upload(path: string, options?: UploadOptions): Router;

  // Template methods
  initTemplates(pattern: string, options: TemplateOptions): string;
  renderTemplate(templateName: string, context: object): string;

  // Express middleware support
  useExpress(middleware: ExpressMiddleware): void;
  useExpress(path: string, middleware: ExpressMiddleware): void;
  useExpressError(middleware: ExpressErrorMiddleware): void;

  // SSL configuration
  setSslConfig(config: SslConfig): void;
  getSslConfig(): SslConfig | undefined;

  // Logging configuration
  setLogLevel(level: string): void;
  getLogLevel(): string;

  // Get all registered routes including router routes
  getAllRoutes(): Map<string, (req: Request, res: Response) => void>;
}

// SSL Configuration interface
export interface SslConfig {
  certPath?: string;
  keyPath?: string;
}

// App creation options
export interface AppOptions {
  ssl?: SslConfig;
  logLevel?: string; // Log level: 'trace', 'debug', 'info', 'warn', 'error'
  metrics?: boolean
  timeout?: number
  devMode?: boolean
}

// Global storage for handlers and middleware in JavaScript
let handlers = new Map<string, (req: Request, res: Response) => void | Promise<any>>();
let middlewares = new Map<string, Middleware[]>();

// Global promise counter for logging
let nextPromiseId = 1;


// Global function for handling requests from Rust
function getHandler(requestJson: string, timeout: number): string {
  try {
    const request = JSON.parse(requestJson);
    const { method, path, registeredPath, pathParams, queryParams, body, cookies, headers, ip, ips, ipSource } = request;

    logger.debug('🔍 getHandler called:', 'rnode_server::handler');
    logger.debug(`  Method: ${method}`, 'rnode_server::handler');
    logger.debug(`  Path: ${path}`, 'rnode_server::handler');
    logger.debug(`  RegisteredPath: ${registeredPath}`, 'rnode_server::handler');
    logger.debug(`  HandlerKey: ${method}:${registeredPath}`, 'rnode_server::handler');
    logger.debug(`  Available handlers: ${Array.from(handlers.keys()).join(', ')}`, 'rnode_server::handler');

    // Search for handler by registered path
    const handlerKey = `${method}:${registeredPath}`;
    const handler = handlers.get(handlerKey);

    if (handler) {
      logger.debug(`✅ Handler found for: ${handlerKey}`, 'rnode_server::handler');

      // Create mock req and res objects
      let responseData: any = '';
      let contentType = 'text/plain';
      let responseHeaders: Record<string, string | string[]> = {};

      // Get parameters from previous calls
      const customParams = request.customParams || {};

      const req: Request = {
        method,
        url: path,
        params: pathParams || {},
        query: queryParams || {},
        body: body || {},
        headers: headers || {},
        cookies: cookies || '',
        customParams: customParams, // Pass parameters to req object
        ip: ip || '127.0.0.1',
        ips: ips || ['127.0.0.1'],
        ipSource: ipSource || 'default',
        // Helper for getting cookie by name
        getCookie: (name: string) => {
          const cookiesStr = cookies || '';
          if (!cookiesStr) return null;

          const cookieMatch = cookiesStr.match(new RegExp(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`));
          return cookieMatch ? decodeURIComponent(cookieMatch[2]) : null;
        },
        // Helper for getting header by name
        getHeader: (name: string): string | null => {
          const headerName = name.toLowerCase();
          const headersObj = headers || {};
          for (const key of Object.keys(headersObj)) {
            if (key.toLowerCase() === headerName) {
              return headersObj[key];
            }
          }
          return null;
        },
        // Helper for checking cookie existence
        hasCookie: (name: string) => {
          const cookiesStr = cookies || '';
          if (!cookiesStr) return false;
          return new RegExp(`(^|;)\\s*${name}\\s*=`).test(cookiesStr);
        },
        // Helper for checking header existence
        hasHeader: (name: string) => {
          const headerName = name.toLowerCase();
          for (const key of Object.keys(headers || {})) {
            if (key.toLowerCase() === headerName) {
              return true;
            }
          }
          return false;
        },
        // Get all cookies as JSON object
        getCookies: () => {
          const cookiesStr = cookies || '';
          const cookiesObj: Record<string, string> = {};

          if (cookiesStr) {
            cookiesStr.split(';').forEach((cookie: string) => {
              const [name, value] = cookie.trim().split('=');
              if (name && value) {
                cookiesObj[name] = decodeURIComponent(value);
              }
            });
          }

          return cookiesObj;
        },
        // Get all headers as JSON object
        getHeaders: () => {
          return headers || {};
        },
        // Methods for working with custom parameters
        // Parameters are stored locally and passed through responseData
        setParam: (name: string, value: any) => {
          customParams[name] = value;
        },
        getParam: (name: string) => {
          return customParams[name];
        },
        hasParam: (name: string) => {
          return name in customParams;
        },
        getParams: () => {
          return { ...customParams };
        },
        // Methods for working with files
        getFile: (fieldName: string) => {
          const files = request.files || {};
          return files[fieldName] || null;
        },
        getFiles: () => {
          return request.files || {};
        },
        hasFile: (fieldName: string) => {
          return fieldName in (request.files || {});
        },
        getFileCount: () => {
          return Object.keys(request.files || {}).length;
        },
        // Accept methods for content negotiation
        accepts: (type: string) => {
          // Simple content type checking
          const acceptHeader = request.headers['accept'] || '';
          if (type === 'json' || type === 'application/json') {
            return acceptHeader.includes('application/json') || acceptHeader.includes('*/*');
          }
          if (type === 'html' || type === 'text/html') {
            return acceptHeader.includes('text/html') || acceptHeader.includes('*/*');
          }
          if (type === 'text' || type === 'text/plain') {
            return acceptHeader.includes('text/plain') || acceptHeader.includes('*/*');
          }
          return acceptHeader.includes('*/*') || acceptHeader.includes(type);
        },
        acceptsCharsets: (charset: string) => {
          const acceptCharsetHeader = request.headers['accept-charset'] || '';
          return acceptCharsetHeader.includes('*') || acceptCharsetHeader.includes(charset);
        },
        acceptsEncodings: (encoding: string) => {
          const acceptEncodingHeader = request.headers['accept-encoding'] || '';
          return acceptEncodingHeader.includes('*') || acceptEncodingHeader.includes(encoding);
        },
        acceptsLanguages: (language: string) => {
          const acceptLanguageHeader = request.headers['accept-language'] || '';
          return acceptLanguageHeader.includes('*') || acceptLanguageHeader.includes(language);
        }
      };

      const res: Response = {
        // Properties for direct access
        headers: {},
        content: '',
        contentType: 'text/plain',

        // Methods
        status: (code: number) => {
          res.headers['status'] = code.toString();
          return res;
        },
        json: (data: any) => {
          responseData = JSON.stringify(data);
          contentType = 'application/json';
          return res;
        },
        send: (data: string) => {
          responseData = data;
          return res;
        },
        end: (data?: string | Buffer) => {
          if (data) {
            responseData = data;
          }
          return res;
        },
        // Async support - allows handlers to work asynchronously
        async: () => {
          // Mark response as async - this will be handled specially
          responseData = { __async: true, __timestamp: Date.now() };
          return res;
        },
        setHeader: (name: string, value: string) => {
          responseHeaders[name] = value;
          return res;
        },
        getHeader: (name: string) => {
          return responseHeaders[name] || null;
        },
        getCookie: (name: string) => {
          const cookiesStr = cookies || '';
          if (!cookiesStr) return null;
          const cookieMatch = cookiesStr.match(new RegExp(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`));
          return cookieMatch ? decodeURIComponent(cookieMatch[2]) : null;
        },
        getCookies: () => {
          // Return set cookies from responseHeaders
          const cookies: Record<string, string> = {};
          if (responseHeaders['Set-Cookie']) {
            const setCookies = Array.isArray(responseHeaders['Set-Cookie'])
                ? responseHeaders['Set-Cookie']
                : [responseHeaders['Set-Cookie']];

            setCookies.forEach((cookieStr: string) => {
              const [nameValue] = cookieStr.split(';');
              if (nameValue) {
                const [name, value] = nameValue.split('=');
                if (name && value) {
                  cookies[name] = value;
                }
              }
            });
          }
          return cookies;
        },
        getHeaders: () => {
          // Return set headers
          return responseHeaders;
        },
        setCookie: (name: string, value: string, options: any = {}) => {
          let cookieString = `${name}=${value}`;
          if (options.httpOnly) cookieString += '; HttpOnly';
          if (options.secure) cookieString += '; Secure';
          if (options.sameSite) cookieString += `; SameSite=${options.sameSite}`;
          if (options.maxAge) cookieString += `; Max-Age=${options.maxAge}`;
          if (options.path) cookieString += `; Path=${options.path}`;

          responseHeaders['Set-Cookie'] = responseHeaders['Set-Cookie'] || [];
          if (Array.isArray(responseHeaders['Set-Cookie'])) {
            responseHeaders['Set-Cookie'].push(cookieString);
          } else {
            responseHeaders['Set-Cookie'] = [responseHeaders['Set-Cookie'], cookieString];
          }
          return res;
        },
        // Methods for working with files and forms
        sendFile: (file: UploadedFile) => {
          responseData = JSON.stringify(file);
          contentType = 'application/json';
          return res;
        },
        sendBuffer: (buffer: Buffer, contentType: string = 'application/octet-stream', size?: number) => {
          // For binary data use special format
          responseData = {
            type: 'binary',
            data: buffer.toString('base64'),
            contentType: contentType,
            contentLength: size || buffer.length
          };
          return res;
        },
        sendFiles: (files: Record<string, UploadedFile>) => {
          responseData = JSON.stringify(files);
          contentType = 'application/json';
          return res;
        },
        sendMultipart: (data: MultipartData) => {
          responseData = JSON.stringify(data);
          contentType = 'application/json';
          return res;
        },
        download: (filepath: string, filename?: string) => {
          // For download set headers for file download
          responseHeaders['Content-Disposition'] = `attachment; filename="${filename || filepath}"`;
          responseData = filepath; // File path for Rust
          contentType = 'application/octet-stream';
          return res;
        },
        attachment: (filename?: string) => {
          if (filename) {
            responseHeaders['Content-Disposition'] = `attachment; filename="${filename}"`;
          } else {
            responseHeaders['Content-Disposition'] = 'attachment';
          }
          return res;
        },
        // Methods for various content types
        html: (content: string) => {
          responseData = content;
          contentType = 'text/html';
          return res;
        },
        text: (content: string) => {
          responseData = content;
          contentType = 'text/plain';
          return res;
        },
        xml: (content: string) => {
          responseData = content;
          contentType = 'application/xml';
          return res;
        },
        redirect: (url: string, status = 302) => {
          responseHeaders['Location'] = url;
          responseData = `Redirecting to ${url}`;
          contentType = 'text/plain';
          res.status(status);
          return res;
        }
      };

      // Execute handler
      try {
        const result = handler(req, res);
        
        // Check if handler returned a promise
        if (result !== undefined && result !== null && typeof result === 'object' && typeof result.then === 'function') {
          // Handler returned a promise - we can't wait for it synchronously
          // Instead, we'll return immediately and let the promise resolve in background
          const promiseId = `promise_${nextPromiseId++}_${Date.now()}`;
          const promise = result as Promise<any>;
          
          logger.debug(`🔄 Handler returned promise ${promiseId}, returning immediately`, 'rnode_server::handler');
          
          // Create AbortController for this promise
          const abortController = new AbortController();
          
          // Set up timeout to cancel the promise if it takes too long
          const timeoutId = setTimeout(() => {
            abortController.abort();
            logger.debug(`🛑 Promise ${promiseId} cancelled due to timeout (${timeout}ms)`, 'rnode_server::handler');
          }, timeout + 1000); // Use timeout from Rust
          
          // Wrap the original promise with abort signal
          const abortablePromise = Promise.race([
            promise,
            new Promise((_, reject) => {
              abortController.signal.addEventListener('abort', () => {
                reject(new Error('Promise cancelled due to timeout'));
              });
            })
          ]);
          
          // Store result when promise resolves
          abortablePromise.then(
            (value) => {
              // Clear timeout since promise completed
              clearTimeout(timeoutId);
              
              // Вызываем Rust функцию для установки результата
              const result = {
                content: responseData,
                contentType: contentType,
                headers: responseHeaders,
                customParams: customParams
              };
              
              try {
                addon.setPromiseResult(promiseId, JSON.stringify(result));
                logger.debug(`✅ Promise ${promiseId} resolved with result`, 'rnode_server::handler');
              } catch (error) {
                logger.error(`❌ Failed to set promise result: ${error}`, 'rnode_server::handler');
              }
            },
            (error) => {
              // Clear timeout since promise completed
              clearTimeout(timeoutId);
              
              // Вызываем Rust функцию для установки ошибки
              try {
                addon.setPromiseError(promiseId, error.message || String(error));
                logger.error(`❌ Promise ${promiseId} rejected: ${error}`, 'rnode_server::handler');
              } catch (error) {
                logger.error(`❌ Failed to set promise error: ${error}`, 'rnode_server::handler');
              }
            }
          );
          
          // Return a response indicating the operation is in progress
          return JSON.stringify({
            content: `Async operation started. Promise ID: ${promiseId}`,
            contentType: 'text/plain',
            headers: responseHeaders,
            customParams: customParams,
            __async: true,
            __promiseId: promiseId,
            __status: 'started'
          });
        }
        
        return JSON.stringify({
          content: responseData,
          contentType: contentType,
          headers: responseHeaders,
          customParams: customParams
        });
      } catch (error) {
        return JSON.stringify({
          content: 'Internal Server Error',
          contentType: 'text/plain'
        });
      }
    }

    return JSON.stringify({
      content: 'Not Found',
      contentType: 'text/plain'
    });
  } catch (error) {
    return JSON.stringify({
      content: 'Invalid request JSON',
      contentType: 'text/plain'
    });
  }
}

// Function for executing middleware from Rust
function executeMiddleware(middlewareJson: string, timeout: number): string {
  try {
    const request = JSON.parse(middlewareJson);
    logger.debug(`🔍 executeMiddleware called with path: ${request.path}`, 'rnode_server::middleware');
    logger.debug(`🔍 Available middleware patterns: ${Array.from(middlewares.keys()).join(', ')}`, 'rnode_server::middleware');

    // Create req and res objects at function level
    const req: Request = {
      ...request,
      customParams: { ...request.customParams },
      headers: { ...request.headers },
      cookies: request.cookies || '',
      // Allow middleware to modify any request properties
      setParam: (name: string, value: any) => {
        if (!req.customParams) req.customParams = {};
        req.customParams[name] = value;
        logger.debug(`🔧 Middleware setParam: ${name} = ${value}`);
      },
      getParam: (name: string) => {
        if (!req.customParams) return undefined;
        const value = req.customParams[name];
        logger.debug(`🔧 Middleware getParam: ${name} = ${value}`);
        return value;
      },
      hasParam: (name: string) => {
        if (!req.customParams) return false;
        const has = name in req.customParams;
        logger.debug(`🔧 Middleware hasParam: ${name} = ${has}`);
        return has;
      },
      getParams: () => {
        if (!req.customParams) return {};
        logger.debug(`🔧 Middleware getParams: ${JSON.stringify(req.customParams)}`, 'rnode_server::middleware');
        return { ...req.customParams };
      },
      // Allow middleware to modify headers
      setHeader: (name: string, value: string) => {
        if (!req.headers) req.headers = {};
        req.headers[name] = value;
        logger.debug(`🔧 Middleware setHeader: ${name} = ${value}`);
      },
      // Allow middleware to modify cookies
      setCookie: (name: string, value: string) => {
        if (!req.cookies) req.cookies = '';
        const existingCookies = req.cookies;
        const cookieRegex = new RegExp(`(^|;)\\s*${name}\\s*=[^;]*`);
        if (cookieRegex.test(existingCookies)) {
          req.cookies = existingCookies.replace(cookieRegex, `$1${name}=${value}`);
        } else {
          req.cookies = existingCookies ? `${existingCookies}; ${name}=${value}` : `${name}=${value}`;
        }
        logger.debug(`🔧 Middleware setCookie: ${name} = ${value}`);
      },
      getCookie: (name: string) => {
        const cookiesStr = req.cookies || '';
        if (!cookiesStr) return null;
        const cookieMatch = cookiesStr.match(new RegExp(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`));
        return cookieMatch ? decodeURIComponent(cookieMatch[2]) : null;
      },
      getHeader: (name: string): string | null => {
        const headerName = name.toLowerCase();
        const headersObj = req.headers || {};
        for (const key of Object.keys(headersObj)) {
          if (key.toLowerCase() === headerName) {
            return headersObj[key];
          }
        }
        return null;
      }
    };

    const res: Response = {
      headers: {},
      content: '',
      contentType: 'text/plain',
      status: (code: number) => {
        res.headers['status'] = code.toString();
        return res;
      },
      json: (data: any) => {
        res.content = JSON.stringify(data);
        res.contentType = 'application/json';
        return res;
      },
      send: (data: any) => {
        if (typeof data === 'string') {
          res.content = data;
          res.contentType = 'text/plain';
        } else {
          res.content = JSON.stringify(data);
          res.contentType = 'application/json';
        }
        return res;
      },
      end: (data?: any) => {
        if (data) {
          res.send(data);
        }
        return res;
      },
      async: () => {
        // Mark response as async - this will be handled specially
        res.content = JSON.stringify({ __async: true, __timestamp: Date.now() });
        return res;
      },
      setHeader: (name: string, value: string) => {
        res.headers[name] = value;
        return res;
      },
      getHeader: (name: string) => {
        return res.headers[name] || null;
      },
      getHeaders: () => {
        return res.headers;
      },
      getCookie: (name: string) => {
        const cookiesStr = request.cookies || '';
        if (!cookiesStr) return null;
        const cookieMatch = cookiesStr.match(new RegExp(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`));
        return cookieMatch ? decodeURIComponent(cookieMatch[2]) : null;
      },
      getCookies: () => {
        const cookiesStr = request.cookies || '';
        if (!cookiesStr) return {};
        const cookies: Record<string, string> = {};
        cookiesStr.split(';').forEach((cookie: string) => {
          const [name, value] = cookie.trim().split('=');
          if (name && value) {
            cookies[name] = decodeURIComponent(value);
          }
        });
        return cookies;
      },
      setCookie: (name: string, value: string, options: any = {}) => {
        let cookieString = `${name}=${value}`;
        if (options.httpOnly) cookieString += '; HttpOnly';
        if (options.secure) cookieString += '; Secure';
        if (options.sameSite) cookieString += `; SameSite=${options.sameSite}`;
        if (options.maxAge) cookieString += `; Max-Age=${options.maxAge}`;
        if (options.path) cookieString += `; Path=${options.path}`;

        res.headers['Set-Cookie'] = res.headers['Set-Cookie'] || [];
        if (Array.isArray(res.headers['Set-Cookie'])) {
          res.headers['Set-Cookie'].push(cookieString);
        } else {
          res.headers['Set-Cookie'] = [res.headers['Set-Cookie'], cookieString];
        }
        return res;
      },
      sendFile: (file: UploadedFile) => {
        res.content = JSON.stringify(file);
        res.contentType = 'application/json';
        return res;
      },
      sendBuffer: (buffer: Buffer, contentType: string = 'application/octet-stream', size?: number) => {
        res.content = buffer;
        res.headers['Content-Type'] = contentType;
        res.headers['Content-Length'] = (size || buffer.length).toString();
        return res;
      },
      sendFiles: (files: Record<string, UploadedFile>) => {
        res.content = JSON.stringify(files);
        res.contentType = 'application/json';
        return res;
      },
      sendMultipart: (data: MultipartData) => {
        res.content = JSON.stringify(data);
        res.contentType = 'application/json';
        return res;
      },
      download: (filepath: string, filename?: string) => {
        res.headers['Content-Disposition'] = `attachment; filename="${filename || filepath}"`;
        res.content = filepath;
        res.contentType = 'application/octet-stream';
        return res;
      },
      attachment: (filename?: string) => {
        if (filename) {
          res.headers['Content-Disposition'] = `attachment; filename="${filename}"`;
        } else {
          res.headers['Content-Disposition'] = 'attachment';
        }
        return res;
      },
      html: (content: string) => {
        res.content = content;
        res.contentType = 'text/html';
        return res;
      },
      text: (content: string) => {
        res.content = content;
        res.contentType = 'text/plain';
        return res;
      },
      xml: (content: string) => {
        res.content = content;
        res.contentType = 'application/xml';
        return res;
      },
      redirect: (url: string, status = 302) => {
        res.headers['Location'] = url;
        res.content = `Redirecting to ${url}`;
        res.contentType = 'text/plain';
        res.status(status);
        return res;
      }
    };

    // Search for suitable middleware
    for (const [middlewarePath, middlewareArray] of middlewares) {
      logger.debug(`🔍 Checking middleware pattern: ${middlewarePath} against path: ${request.path}`);

      let matches = false;

      if (middlewarePath === '*') {
        // Global middleware matches everything
        matches = true;
        logger.debug('✅ Global middleware (*) matches');
      } else {
        // Use micromatch for pattern matching (supports glob, regex, etc.)
        matches = micromatch.isMatch(request.path, middlewarePath);
        logger.debug(`🔍 Micromatch check: ${request.path} matches ${middlewarePath} -> ${matches}`);
      }

      // Execute middleware for this pattern
      if (matches) {
        logger.debug(`✅ Executing ${middlewareArray.length} middleware for pattern: ${middlewarePath}`);

        // Execute all middleware for this path
        logger.debug(`🔧 Starting with params: ${JSON.stringify(req.customParams)}`, 'rnode_server::middleware');

        for (let i = 0; i < middlewareArray.length; i++) {
          const middleware = middlewareArray[i];
          logger.debug(`🔄 Executing middleware ${i + 1} of ${middlewareArray.length}`);

          try {
            // Call middleware function with req and res objects
            let middlewareError: any = null;

            logger.debug(`🔍 Executing middleware for pattern: ${middlewarePath}`);
            logger.debug(`🔍 Request origin: ${req.headers.origin}`);

            const result = middleware(req, res, (error?: any) => {
              // Next function - continue to next middleware
              if (error) {
                // If middleware throws an error, stop execution and return error
                logger.error('❌ Middleware error:', error);
                middlewareError = error;
              } else {
                logger.debug('✅ Middleware completed without error');
              }
            });

            // Check if middleware returned a promise
            if (result !== undefined && result !== null && typeof result === 'object' && typeof (result as any).then === 'function') {
              // Middleware returned a promise - we need to wait for it
              const promiseId = `middleware_promise_${nextPromiseId++}_${Date.now()}`;
              const promise = result as Promise<any>;
              
              logger.debug(`🔄 Middleware returned promise ${promiseId}, waiting for completion`, 'rnode_server::middleware');
              
              // Create AbortController for this promise
              const abortController = new AbortController();
              
              // Set up timeout to cancel the promise if it takes too long
              const timeoutId = setTimeout(() => {
                abortController.abort();
                logger.debug(`🛑 Middleware promise ${promiseId} cancelled due to timeout (${timeout}ms)`, 'rnode_server::middleware');
              }, timeout + 1000); // Use timeout from Rust
              
              // Wrap the original promise with abort signal
              const abortablePromise = Promise.race([
                promise,
                new Promise((_, reject) => {
                  abortController.signal.addEventListener('abort', () => {
                    reject(new Error('Promise cancelled due to timeout'));
                  });
                })
              ]);
              
              // Store result when promise resolves
              abortablePromise.then(
                (value) => {
                  // Clear timeout since promise completed
                  clearTimeout(timeoutId);
                  
                  // Вызываем Rust функцию для установки результата
                  const result = {
                    shouldContinue: true,
                    req: {...req},
                    res: {...res}
                  };
                  
                  try {
                    addon.setPromiseResult(promiseId, JSON.stringify(result));
                    logger.debug(`✅ Middleware promise ${promiseId} resolved with result`, 'rnode_server::middleware');
                  } catch (error) {
                    logger.error(`❌ Failed to set middleware promise result: ${error}`, 'rnode_server::middleware');
                  }
                },
                (error) => {
                  // Clear timeout since promise completed
                  clearTimeout(timeoutId);
                  
                  // Вызываем Rust функцию для установки ошибки
                  try {
                    addon.setPromiseError(promiseId, error.message || String(error));
                    logger.error(`❌ Middleware promise ${promiseId} rejected: ${error}`, 'rnode_server::middleware');
                  } catch (error) {
                    logger.error(`❌ Failed to set middleware promise error: ${error}`, 'rnode_server::middleware');
                  }
                }
              );
              
              // Return a response indicating the operation is in progress
              return JSON.stringify({
                shouldContinue: false,
                content: `Async middleware operation started. Promise ID: ${promiseId}`,
                contentType: 'text/plain',
                __async: true,
                __promiseId: promiseId,
                __status: 'started'
              });
            }

            // Check if middleware returned an error
            if (middlewareError) {
              logger.debug('❌ Middleware returned error, stopping execution');
              logger.debug(`❌ Error details: ${middlewareError.message || middlewareError}`);
              return JSON.stringify({
                shouldContinue: false,
                error: middlewareError.message || middlewareError.toString(),
                req: {...req},
                res: {...res}
              });
            }

            // Update accumulated params for next middleware
            logger.debug(`🔧 Updated params: ${JSON.stringify(req.customParams)}`, 'rnode_server::middleware');
          } catch (error) {
            logger.error(`❌ Middleware execution error: ${error instanceof Error ? error.message : String(error)}`, 'rnode_server::middleware');
            return JSON.stringify({
              shouldContinue: false,
              error: error instanceof Error ? error.message : String(error),
              req: {...req},
              res: {...res}
            });
          }
        }
      }
    }

    // This code will only execute if no middleware returned a Promise
    // For Promise-based middleware, the result is returned above
    logger.debug('✅ All middleware executed synchronously, continuing');
    // Always return accumulated parameters, even when continuing
    // Create req and res objects with accumulated data
    const finalReq = {
      ...request,
      customParams: req.customParams,
      headers: req.headers,
      cookies: req.cookies
    };

    const finalRes = {
      headers: res.getHeaders(),  // Используем реальные заголовки
      content: res.content || '',
      contentType: res.contentType || 'text/plain'
    };

    logger.debug(`🔧 Final response headers: ${JSON.stringify(finalRes.headers)}`, 'rnode_server::middleware');

    return JSON.stringify({
      shouldContinue: true,
      req: finalReq,
      res: finalRes
    });
  } catch (error) {
    logger.error(`❌ executeMiddleware error: ${error instanceof Error ? error.message : String(error)}`, 'rnode_server::middleware');

    // Create default req and res objects for error case
    const errorReq = {
      customParams: {},
      headers: {},
      cookies: '',
      path: '',
      method: '',
      body: '',
      queryParams: {},
      pathParams: {}
    };

    const errorRes = {
      headers: {},
      content: 'Middleware Error',
      contentType: 'text/plain'
    };

    return JSON.stringify({
      shouldContinue: false,
      req: errorReq,
      res: errorRes
    });
  }
}

// Export functions for Rust
(global as any).getHandler = getHandler;
(global as any).executeMiddleware = executeMiddleware;

// Router class for creating route groups
class RouterImpl implements Router {
  public handlers = new Map<string, { method: string; handler: (req: Request, res: Response) => void | Promise<any> }>();
  public middlewares = new Map<string, Middleware[]>();

  get(path: string, handler: (req: Request, res: Response) => void | Promise<any>): Router {
    this.handlers.set(`GET:${path}`, { method: 'GET', handler });
    return this;
  }

  post(path: string, handler: (req: Request, res: Response) => void | Promise<any>): Router {
    this.handlers.set(`POST:${path}`, { method: 'POST', handler });
    return this;
  }

  put(path: string, handler: (req: Request, res: Response) => void | Promise<any>): Router {
    this.handlers.set(`PUT:${path}`, { method: 'PUT', handler });
    return this;
  }

  delete(path: string, handler: (req: Request, res: Response) => void | Promise<any>): Router {
    this.handlers.set(`DELETE:${path}`, { method: 'DELETE', handler });
    return this;
  }

  patch(path: string, handler: (req: Request, res: Response) => void | Promise<any>): Router {
    this.handlers.set(`PATCH:${path}`, { method: 'PATCH', handler });
    return this;
  }

  options(path: string, handler: (req: Request, res: Response) => void | Promise<any>): Router {
    this.handlers.set(`OPTIONS:${path}`, { method: 'OPTIONS', handler });
    return this;
  }

  use(pathOrMiddleware: string | ((req: Request, res: Response, next: () => void) => void | Promise<any>), middleware?: (req: Request, res: Response, next: () => void) => void | Promise<any>): void {
    if (typeof pathOrMiddleware === 'function') {
      // Global middleware: router.use(middleware)
      const existing = this.middlewares.get('*') || [];
      this.middlewares.set('*', [...existing, pathOrMiddleware]);
    } else if (typeof pathOrMiddleware === 'string' && middleware) {
      // Middleware with path: router.use(path, middleware)
      const existing = this.middlewares.get(pathOrMiddleware) || [];
      this.middlewares.set(pathOrMiddleware, [...existing, middleware]);
    } else {
      throw new Error('Invalid middleware registration: use(path, middleware) or use(middleware)');
    }
  }

  // Express middleware support
  useExpress(middleware: ExpressMiddleware): void;
  useExpress(path: string, middleware: ExpressMiddleware): void;
  useExpress(middlewareOrPath: ExpressMiddleware | string, middleware?: ExpressMiddleware): void {
    if (typeof middlewareOrPath === 'function') {
      // useExpress(middleware)
      const expressMiddleware = middlewareOrPath;
      this.use((req: Request, res: Response, next: (error?: any) => void) => {
        try {
          // Convert RNode Request to Express Request
          const expressReq = this.convertToExpressRequest(req);

          // Convert RNode Response to Express Response
          const expressRes = this.convertToExpressResponse(res);

          // Create Express NextFunction that properly handles errors
          const expressNext: NextFunction = (error?: any) => {
            if (error) {
              // If middleware calls next(error), reject the promise
              logger.error(`❌ Middleware error: ${error.message || error}`);
              logger.debug(`❌ Origin: ${req.headers.origin}`);
              logger.debug(`❌ CORS blocked request - calling next(error)`);

              // Call next with error to trigger error handling
              next(error);
              return;
            }

            // Check if response was already sent by middleware
            logger.debug(`🔧 Checking response state: headersSent=${expressRes.headersSent}, statusCode=${expressRes.statusCode}`, 'rnode_server::express');
            if (expressRes.headersSent || expressRes.statusCode !== 200) {
              logger.debug('✅ Middleware handled response', 'rnode_server::express');
              logger.debug(`🔧 Response headers: ${JSON.stringify(res.getHeaders())}`, 'rnode_server::express');
              logger.debug(`🔧 Response status: ${expressRes.statusCode}`, 'rnode_server::express');
              return;
            }

            // Continue to next middleware/handler
            logger.debug('✅ Middleware passed, continuing', 'rnode_server::express');
            logger.debug(`🔧 Response headers after middleware: ${JSON.stringify(res.getHeaders())}`, 'rnode_server::express');
            next();
          };

          // Execute Express middleware with proper error handling
          logger.debug(`🔒 Executing Express middleware for origin: ${req.headers.origin}`);

          // Execute Express middleware
          expressMiddleware(expressReq, expressRes, expressNext);
        } catch (error) {
          logger.error('❌ Error in Express middleware:', error instanceof Error ? error.message : String(error));
          next(error);
        }
      });
    } else if (typeof middlewareOrPath === 'string' && middleware) {
      // useExpress(path, middleware)
      const path = middlewareOrPath;
      const expressMiddleware = middleware;
      this.use(path, (req: Request, res: Response, next: (error?: any) => void) => {
        try {
          // Convert RNode Request to Express Request
          const expressReq = this.convertToExpressRequest(req);

          // Convert RNode Response to Express Response
          const expressRes = this.convertToExpressResponse(res);

          // Create Express NextFunction that properly handles errors
          const expressNext: NextFunction = (error?: any) => {
            if (error) {
              // If middleware calls next(error), reject the promise
              logger.error(`❌ Middleware error: ${error.message || error}`);
              logger.debug(`❌ Origin: ${req.headers.origin}`);

              // Call next with error to trigger error handling
              next(error);
              return;
            }

            // Check if response was already sent by middleware
            if (expressRes.headersSent || expressRes.statusCode !== 200) {
              logger.debug('✅ Middleware handled response', 'rnode_server::express');
              logger.debug(`🔧 Response headers: ${JSON.stringify(res.getHeaders())}`, 'rnode_server::express');
              logger.debug(`🔧 Response status: ${expressRes.statusCode}`, 'rnode_server::express');
              return;
            }

            // Continue to next middleware/handler
            logger.debug('✅ Middleware passed, continuing', 'rnode_server::express');
            logger.debug(`🔧 Response headers after middleware: ${JSON.stringify(res.getHeaders())}`, 'rnode_server::express');
            next();
          };

          // Execute Express middleware with proper error handling
          logger.debug(`🔒 Executing Express middleware for origin: ${req.headers.origin}`);

          // Execute Express middleware
          expressMiddleware(expressReq, expressRes, expressNext);
        } catch (error) {
          logger.error('❌ Error in Express middleware:', error instanceof Error ? error.message : String(error));
          next(error);
        }
      });
    } else {
      throw new Error('Invalid useExpress call: useExpress(middleware) or useExpress(path, middleware)');
    }
  }

  useExpressError(middleware: ExpressErrorMiddleware): void {
    // Error middleware - will be called when errors occur
    this.use((req: Request, res: Response, next: (error?: any) => void) => {
      try {
        // Convert RNode Request to Express Request
        const expressReq = this.convertToExpressRequest(req);

        // Convert RNode Response to Express Response
        const expressRes = this.convertToExpressResponse(res);

        // Create Express NextFunction
        const expressNext: NextFunction = (error?: any) => {
          next(error); // Pass error to the next middleware/handler
        };

        // Execute Express error middleware
        middleware(null, expressReq, expressRes, expressNext);
      } catch (error) {
        // If error middleware fails, continue
        next(error);
      }
    });
  }

  // Helper methods for converting between RNode and Express types
  private convertToExpressRequest(req: Request): ExpressRequest {
    return {
      ...req,
      // Add Express-specific properties
      app: {} as any,
      baseUrl: '',
      originalUrl: req.url,
      path: req.url,
      secure: false,
      subdomains: [],
      xhr: false,
      accepts: (type: string) => req.accepts(type),
      acceptsCharsets: (charset: string) => req.acceptsCharsets(charset),
      acceptsEncodings: (encoding: string) => req.acceptsEncodings(encoding),
      acceptsLanguages: (language: string) => req.acceptsLanguages(language),
      get: (name: string) => req.getHeader(name),
      header: (name: string) => req.getHeader(name),
      is: () => false,
      param: (name: string) => req.params[name] || req.query[name] || '',
      range: () => undefined,
      protocol: 'http',
      route: {} as any,
      signedCookies: {},
      stale: false,
      fresh: false,
      hostname: 'localhost',
      host: 'localhost:3000'
    } as unknown as ExpressRequest;
  }

  private convertToExpressResponse(res: Response): ExpressResponse {
    let headersSent = false;
    let statusCode = 200;

    // Create a proxy that tracks changes to the response
    const expressRes = {
      ...res,
      // Add Express-specific properties
      app: {} as any,
      locals: {},
      charset: 'utf-8',
      // Only essential Express methods that make sense
      get: (field: string) => res.getHeader(field),
      set: (field: string, value: string) => {
        logger.debug(`🔧 Setting header: ${field} = ${value}`);
        res.setHeader(field, value);
        return expressRes;
      },
      header: (field: string, value: string) => {
        logger.debug(`🔧 Setting header: ${field} = ${value}`);
        res.setHeader(field, value);
        return expressRes;
      },
      json: (body: any) => {
        logger.debug('🔧 Sending JSON response');
        headersSent = true;
        res.json(body);
        return expressRes;
      },
      send: (body: any) => {
        logger.debug('🔧 Sending response');
        headersSent = true;
        res.send(body);
        return expressRes;
      },
      end: (chunk?: any) => {
        logger.debug('🔧 Ending response');
        headersSent = true;
        res.end(chunk);
        return expressRes;
      },
      status: (code: number) => {
        logger.debug(`🔧 Setting status: ${code}`);
        statusCode = code;
        res.status(code);
        return expressRes;
      },
      // Getters for tracking state
      get headersSent() {
        return headersSent;
      },
      get statusCode() {
        return statusCode;
      },
      // Override getHeaders to return the actual headers from res
      getHeaders: () => res.getHeaders()
    } as unknown as ExpressResponse;

    return expressRes;
  }

  getHandlers(): Map<string, { method: string; handler: (req: Request, res: Response) => void | Promise<any> }> {
    return this.handlers; // Return original Map with method:path keys
  }

  getMiddlewares(): Map<string, Middleware[]> {
    return this.middlewares;
  }

  // File listing method
  listFiles(folder: string): FileListResult {
    try {
      const result = addon.listFiles(folder);
      const parsedResult = JSON.parse(result);
      logger.debug(`📁 Files listed from folder: ${folder}`, parsedResult);
      return parsedResult;
    } catch (error) {
      logger.error('❌ Error listing files:', error instanceof Error ? error.message : String(error));
      return {
        success: false,
        error: `Failed to list files from ${folder}: ${error}`,
        files: [],
        total: 0
      };
    }
  }

  // File saving method
  saveFile(filename: string, base64Data: string, uploadsDir: string): FileOperationResult {
    try {
      const result = addon.saveFile(filename, base64Data, uploadsDir);
      const parsedResult = JSON.parse(result);
      logger.debug(`💾 File saved: ${filename} in ${uploadsDir}`, parsedResult);
      return parsedResult;
    } catch (error) {
      logger.error('❌ Error saving file:', error instanceof Error ? error.message : String(error));
      return {
        success: false,
        error: `Failed to save file ${filename}: ${error}`,
        path: `${uploadsDir}/${filename}`
      };
    }
  }

  // File deletion method
  deleteFile(filename: string, uploadsDir: string): FileOperationResult {
    try {
      const result = addon.deleteFile(filename, uploadsDir);
      const parsedResult = JSON.parse(result);
      logger.debug(`🗑️ File deleted: ${filename} from ${uploadsDir}`, parsedResult);
      return parsedResult;
    } catch (error) {
      logger.error('❌ Error deleting file:', error instanceof Error ? error.message : String(error));
      return {
        success: false,
        error: `Failed to delete file ${filename}: ${error}`,
        path: `${uploadsDir}/${filename}`
      };
    }
  }

  // File content retrieval method
  getFileContent(filename: string, uploadsDir: string): FileContentResult {
    try {
      const result = addon.getFileContent(filename, uploadsDir);
      const parsedResult = JSON.parse(result);
      logger.debug(`📄 File content retrieved: ${filename} from ${uploadsDir}`, {
        ...parsedResult,
        content: parsedResult.content ? `${parsedResult.content.substring(0, 50)}...` : 'No content'
      });
      return parsedResult;
    } catch (error) {
      logger.error('❌ Error getting file content:', error instanceof Error ? error.message : String(error));
      return {
        success: false,
        error: `Failed to get content of file ${filename}: ${error}`,
        content: '',
        size: 0,
        filename: filename,
        mime_type: 'application/octet-stream'
      };
    }
  }

  // File existence check method
  fileExists(filename: string, uploadsDir: string): boolean {
    try {
      const exists = addon.fileExists(filename, uploadsDir);
      logger.debug(`🔍 File exists check: ${filename} in ${uploadsDir} -> ${exists}`);
      return exists;
    } catch (error) {
      logger.error('❌ Error checking file existence:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  // Static files method
  static(pathOrPaths: string | string[], options?: StaticOptions): void {
    // Default settings
    const defaultOptions: StaticOptions = {
      cache: options?.cache ?? true,
      maxAge: options?.maxAge ?? 3600, // 1 hour
      maxFileSize: options?.maxFileSize ?? 10 * 1024 * 1024, // 10MB
      etag: options?.etag ?? true,
      lastModified: options?.lastModified ?? true,
      gzip: options?.gzip ?? true,
      brotli: options?.brotli ?? false,
      allowHiddenFiles: options?.allowHiddenFiles ?? false,
      allowSystemFiles: options?.allowSystemFiles ?? false,
      allowedExtensions: options?.allowedExtensions ?? ['html', 'css', 'js', 'json', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'woff', 'woff2', 'ttf', 'eot'],
      blockedPaths: options?.blockedPaths ?? ['.git', '.env', '.htaccess', 'thumbs.db', '.ds_store', 'desktop.ini']
    };

    if (Array.isArray(pathOrPaths)) {
      // Multiple paths
      for (const path of pathOrPaths) {
        addon.loadStaticFiles(path, defaultOptions);
        logger.debug(`Registered static files from: ${path} with secure options:`, JSON.stringify(defaultOptions));
      }
    } else {
      // Single path
      addon.loadStaticFiles(pathOrPaths, defaultOptions);
      logger.debug(`Registered static files from: ${pathOrPaths} with secure options:`, JSON.stringify(defaultOptions));
    }
  }

  // Template initialization method
  initTemplates(pattern: string, options: TemplateOptions): string {
    try {
      // Call Rust addon to initialize templates
      const result = addon.initTemplates(pattern, options);
      logger.debug(`✅ Templates initialized with pattern: ${pattern}`);
      return result;
    } catch (error) {
      logger.error('❌ Error initializing templates:', error instanceof Error ? error.message : String(error));
      return `Template initialization error: ${error}`;
    }
  }

  // Template rendering method
  renderTemplate(templateName: string, context: object): string {
    try {
      // Call Rust addon to render template
      return addon.renderTemplate(templateName, JSON.stringify(context));
    } catch (error) {
      logger.error('❌ Error rendering template:', error instanceof Error ? error.message : String(error));
      return `<!-- Template rendering error: ${templateName} -->`;
    }
  }
}

// Function for creating new router
export function Router(): Router {
  return new RouterImpl();
}

// RNodeApp class inherits from RouterImpl
class RNodeApp extends RouterImpl {
  // Properties
  private logLevel: string = 'info';
  private metrics: boolean = false;
  private timeout: number = 30000;
  private devMode: boolean = false;
  private sslConfig?: SslConfig;

  // Additional methods for RNodeApp
  static(pathOrPaths: string | string[], options?: StaticOptions): void {
    // Default settings
    const defaultOptions: StaticOptions = {
      cache: options?.cache ?? true,
      maxAge: options?.maxAge ?? 3600, // 1 hour
      maxFileSize: options?.maxFileSize ?? 10 * 1024 * 1024, // 10MB
      etag: options?.etag ?? true,
      lastModified: options?.lastModified ?? true,
      gzip: options?.gzip ?? true,
      brotli: options?.brotli ?? false,
      allowHiddenFiles: options?.allowHiddenFiles ?? false,
      allowSystemFiles: options?.allowSystemFiles ?? false,
      allowedExtensions: options?.allowedExtensions ?? ['html', 'css', 'js', 'json', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'woff', 'woff2', 'ttf', 'eot'],
      blockedPaths: options?.blockedPaths ?? ['.git', '.env', '.htaccess', 'thumbs.db', '.ds_store', 'desktop.ini']
    };

    if (Array.isArray(pathOrPaths)) {
      // Multiple paths
      for (const path of pathOrPaths) {
        addon.loadStaticFiles(path, defaultOptions);
        logger.info(`📁 Registered static files from: ${path} with secure options`, 'rnode_server::static');
      }
    } else {
      // Single path
      addon.loadStaticFiles(pathOrPaths, defaultOptions);
      logger.info(`📁 Registered static files from: ${pathOrPaths} with secure options`, 'rnode_server::static');
    }
  }

  // Clear static files cache
  clearStaticCache(): void {
    addon.clearStaticCache();
    logger.info('🗑️ Static files cache cleared', 'rnode_server::static');
  }

  // Get static files statistics
  getStaticStats(): string {
    return addon.getStaticStats();
  }

  setSslConfig(config: SslConfig): void {
    this.sslConfig = config;
  }

  getSslConfig(): SslConfig | undefined {
    return this.sslConfig;
  }

  // Get all registered routes including router routes
  getAllRoutes(): Map<string, (req: Request, res: Response) => void> {
    // Return global handlers which include all routes from useRouter
    return handlers;
  }

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
      handlers.set(`${method}:${fullPath}`, handler);

      // Register in Rust addon through existing methods
      const addonMethod = method.toLowerCase() === 'delete' ? 'del' : method.toLowerCase();
      (addon as any)[addonMethod](fullPath, handler);

      logger.info(`✅ Router handler registered: ${method} ${fullPath}`, 'rnode_server::router');
    }

    logger.info(`🎯 Router registered for path: ${path}`, 'rnode_server::router');
    logger.debug(`📊 Total handlers in system: ${router.getHandlers().size}`, 'rnode_server::router');
    logger.debug(`🔧 Global handlers updated: ${Array.from(handlers.keys()).join(', ')}`, 'rnode_server::router');
  }

  listen(port: number, hostOrCallback?: string | (() => void), callback?: () => void): void {
    // Copy handlers and register in Rust addon
    for (const [key, value] of this.handlers) {
      const [method, path] = key.split(':', 2);
      handlers.set(key, value.handler);

      // Register in Rust addon through existing methods
      const addonMethod = method.toLowerCase() === 'delete' ? 'del' : method.toLowerCase();
      (addon as any)[addonMethod](path, value.handler);
    }

    // Copy middleware
    for (const [key, value] of this.middlewares) {
      logger.debug(`🔧 Copying middleware: ${key} -> ${value.length} functions`, 'rnode_server::server');
      const existing = middlewares.get(key) || [];
      middlewares.set(key, [...existing, ...value]);

      // Register each middleware individually in Rust addon
      for (const middleware of value) {
        logger.debug(`🔧 Calling addon.use('${key}', middleware) in listen`, 'rnode_server::server');
        addon.use(key, middleware);
      }
    }

    logger.debug(`🔧 Global handlers updated: ${Array.from(handlers.keys()).join(', ')}`, 'rnode_server::server');
    logger.debug(`🔧 Global middlewares updated: ${Array.from(middlewares.keys()).join(', ')}`, 'rnode_server::server');
    logger.debug(`🔧 App middlewares: ${Array.from(this.middlewares.keys()).join(', ')}`, 'rnode_server::server');

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

  // HTTP methods get, post, put, delete, patch and use are automatically inherited from RouterImpl
  // and automatically registered in Rust addon

  // Methods for working with files
  saveFile(filename: string, base64Data: string, uploadsDir: string): FileOperationResult {
    const result = addon.saveFile(filename, base64Data, uploadsDir);
    return JSON.parse(result);
  }

  deleteFile(filename: string, uploadsDir: string): FileOperationResult {
    const result = addon.deleteFile(filename, uploadsDir);
    return JSON.parse(result);
  }

  listFiles(uploadsDir: string): FileListResult {
    const result = addon.listFiles(uploadsDir);
    return JSON.parse(result);
  }

  getFileContent(filename: string, uploadsDir: string): FileContentResult {
    const result = addon.getFileContent(filename, uploadsDir);
    return JSON.parse(result);
  }

  fileExists(filename: string, uploadsDir: string): boolean {
    return addon.fileExists(filename, uploadsDir);
  }

  download(path: string, options: DownloadOptions): Router {
    // Register route for file downloads in Rust backend
    addon.registerDownloadRoute(path, JSON.stringify(options));
    return this;
  }

  upload(path: string, options: UploadOptions): Router {
    // Register route for file uploads in Rust backend
    addon.registerUploadRoute(path, JSON.stringify(options));
    return this;
  }

  // Methods for working with templates
  initTemplates(pattern: string, options: TemplateOptions): string {
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

  // Logging configuration
  setMetrics(metrics: boolean): void {
    this.metrics = metrics;
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

  setTimeout(timeout: number): void {
    this.timeout = timeout;
  }

  getTimeout() {
    return this.timeout;
  }

  setDevMode(devMode: boolean): void {
    this.devMode = devMode;
  }

  getDevMode() {
    return this.devMode;
  }
}

// Function for creating application
export function createApp(options?: AppOptions): RNodeAppInterface {
  // Get log level from options or use default
  const logLevel = options?.logLevel || 'info';
  const level = logLevel.toLowerCase();
  
  // Create app with log level
  const appInfo = addon.createApp(level);
  logger.info(`🚀 Creating ${appInfo.name} v${appInfo.version} with log level: ${level}`, 'rnode_server::app');

  // Create RNodeApp instance
  const app = new RNodeApp();
  
  // Set log level using the method
  app.setLogLevel(level);
  app.setMetrics(options?.metrics ?? false);
  app.setTimeout(options?.timeout ?? 30000)
  app.setDevMode(options?.devMode ?? process.env.MODE === 'development')
  // Store SSL configuration if provided
  if (options?.ssl) {
    const { certPath, keyPath } = options.ssl;
    if (certPath && keyPath) {
      logger.info(`🔒 SSL configuration loaded:`, 'rnode_server::app');
      logger.info(`   Certificate: ${certPath}`, 'rnode_server::app');
      logger.info(`   Private Key: ${keyPath}`, 'rnode_server::app');
      app.setSslConfig(options.ssl)
    } else {
      logger.warn('⚠️ SSL certificate paths are not provided in options.', 'rnode_server::app');
    }
  }

  return app;
}

// Simple greeting function
export function greeting(name: string): { message: string } {
  const message = addon.hello(name);
  return { message };
}

// Default export for ES modules compatibility
export default {
  createApp,
  greeting,
  RNodeApp
};

// Export types for use
export type { StaticOptions };


// Graceful shutdown handling
process.on('SIGINT', (signal) => {
  logger.info(`🛑 Received ${signal}, shutting down gracefully...`, 'rnode_server::shutdown');
  
  // Force exit after a short delay if graceful shutdown fails
  setTimeout(() => {
    logger.warn('⚠️ Force exit after timeout', 'rnode_server::shutdown');
    process.exit(1);
  }, 5000);
  
  // Try to exit gracefully
  process.exit(0);
});

process.on('SIGTERM', (signal) => {
  logger.info(`🛑 Received ${signal}, shutting down gracefully...`, 'rnode_server::shutdown');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(`💥 Uncaught Exception: ${error.message}`, 'rnode_server::error');
  logger.error(`Stack trace: ${error.stack}`, 'rnode_server::error');
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`💥 Unhandled Rejection at: ${promise}`, 'rnode_server::error');
  logger.error(`Reason: ${reason}`, 'rnode_server::error');
  process.exit(1);
});
