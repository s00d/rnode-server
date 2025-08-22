// This module is the CJS entry point for the library.

// The Rust addon.
import * as addon from './load.cjs';


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
}

// Use this declaration to assign types to the addon's exports,
// which otherwise by default are `any`.
declare module "./load.cjs" {
  function hello(name: string): string;
  function createApp(): { name: string; version: string };
  function get(path: string, handler: Function): void;
  function post(path: string, handler: Function): void;
  function put(path: string, handler: Function): void;
  function del(path: string, handler: Function): void;
  function patch(path: string, handler: Function): void;
  function options(path: string, handler: Function): void;
  function use(path: string, handler: Function): void;
  function listen(port: number, host?: string): void;
  function loadStaticFiles(path: string, options?: StaticOptions): void;
  function clearStaticCache(): void;
  function getStaticStats(): string;

  // Functions for working with files
  function saveFile(filename: string, base64Data: string, uploadsDir: string): string;
  function deleteFile(filename: string, uploadsDir: string): string;
  function listFiles(uploadsDir: string): string;
  function getFileContent(filename: string, uploadsDir: string): string;
  function fileExists(filename: string, uploadsDir: string): boolean;
  function registerDownloadRoute(path: string, options: string): void;
  function registerUploadRoute(path: string, options: string): void;
}

export interface Response {
  status(code: number): Response;
  json(data: any): Response;
  send(data: string | Buffer): Response;
  end(data?: string | Buffer): Response;
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

export interface Router {
  get(path: string, handler: (req: Request, res: Response) => void): void;
  post(path: string, handler: (req: Request, res: Response) => void): void;
  put(path: string, handler: (req: Request, res: Response) => void): void;
  delete(path: string, handler: (req: Request, res: Response) => void): void;
  patch(path: string, handler: (req: Request, res: Response) => void): void;
  options(path: string, handler: (req: Request, res: Response) => void): void;
  use(pathOrMiddleware: string | ((req: Request, res: Response, next: () => void) => void), middleware?: (req: Request, res: Response, next: () => void) => void): void;
  getHandlers(): Map<string, { method: string; handler: (req: Request, res: Response) => void }>;
  getMiddlewares(): Map<string, (req: Request, res: Response, next: () => void) => void>;
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

// Interface for RNodeApp (will be implemented by class)
interface RNodeAppInterface extends Router {
  useRouter(path: string, router: Router): void;
  static(path: string, options?: StaticOptions): void;
  static(paths: string[], options?: StaticOptions): void;
  clearStaticCache(): void;
  getStaticStats(): string;
  listen(port: number, callback?: () => void): void;
  listen(port: number, host: string, callback?: () => void): void;

  // Methods for working with files
  saveFile(filename: string, base64Data: string, uploadsDir: string): FileOperationResult;
  deleteFile(filename: string, uploadsDir: string): FileOperationResult;
  listFiles(uploadsDir: string): FileListResult;
  getFileContent(filename: string, uploadsDir: string): FileContentResult;
  fileExists(filename: string, uploadsDir: string): boolean;
  download(path: string, options: DownloadOptions): void;
  upload(path: string, options: UploadOptions): void;
}

// Global storage for handlers and middleware in JavaScript
let handlers = new Map<string, (req: Request, res: Response) => void>();
let middlewares = new Map<string, (req: Request, res: Response, next: () => void) => void>();



// Global function for handling requests from Rust
function getHandler(requestJson: string): string {
  try {
    const request = JSON.parse(requestJson);
    const { method, path, registeredPath, pathParams, queryParams, body, cookies, headers } = request;

    console.log('🔍 getHandler called:');
    console.log('  Method:', method);
    console.log('  Path:', path);
    console.log('  RegisteredPath:', registeredPath);
    console.log('  HandlerKey:', `${method}:${registeredPath}`);
    console.log('  Available handlers:', Array.from(handlers.keys()));

    // Search for handler by registered path
    const handlerKey = `${method}:${registeredPath}`;
    const handler = handlers.get(handlerKey);

    if (handler) {
      console.log('✅ Handler found for:', handlerKey);

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
        }
      };

      const res: Response = {
        status: (code: number) => {
          responseHeaders['status'] = code.toString();
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
        handler(req, res);
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
function executeMiddleware(middlewareJson: string): string {
  try {
    const request = JSON.parse(middlewareJson);
    const { method, path, cookies, headers } = request;

    // Search for suitable middleware
    for (const [middlewarePath, middleware] of middlewares) {
      if (path.startsWith(middlewarePath) || middlewarePath === '*') {
        let shouldContinue = true;
        let middlewareResponse: string | Buffer = '';
        let middlewareContentType = 'text/plain';
        let middlewareHeaders: Record<string, string | string[]> = {};

        // Create mock req and res objects for middleware
        // Get parameters from previous calls
        const middlewareCustomParams = request.customParams || {};

        const req: Request = {
          method,
          url: path,
          params: {},
          query: {},
          body: {},
          headers: headers || {},
          cookies: cookies || '',
          customParams: middlewareCustomParams,
          getCookie: (name: string) => {
            const cookiesStr = cookies || '';
            if (!cookiesStr) return null;
            const cookieMatch = cookiesStr.match(new RegExp(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`));
            return cookieMatch ? decodeURIComponent(cookieMatch[2]) : null;
          },
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
          hasCookie: (name: string) => {
            const cookiesStr = cookies || '';
            if (!cookiesStr) return false;
            return new RegExp(`(^|;)\\s*${name}\\s*=`).test(cookiesStr);
          },
          hasHeader: (name: string) => {
            const headerName = name.toLowerCase();
            for (const key of Object.keys(headers || {})) {
              if (key.toLowerCase() === headerName) {
                return true;
              }
            }
            return false;
          },
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
          getHeaders: () => {
            return headers || {};
          },
          // Methods for working with custom parameters
          setParam: (name: string, value: any) => {
            middlewareCustomParams[name] = value;
          },
          getParam: (name: string) => {
            return middlewareCustomParams[name];
          },
          hasParam: (name: string) => {
            return name in middlewareCustomParams;
          },
          getParams: () => {
            return { ...middlewareCustomParams };
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
          }
        };

        const res: Response = {
          status: (code: number) => {
            middlewareHeaders['status'] = code.toString();
            return res;
          },
          json: (data: any) => {
            middlewareResponse = JSON.stringify(data);
            middlewareContentType = 'application/json';
            shouldContinue = false; // Middleware interrupts execution
            return res;
          },
          send: (data: string) => {
            middlewareResponse = data;
            shouldContinue = false; // Middleware interrupts execution
            return res;
          },
          end: (data?: string | Buffer) => {
            if (data) {
              middlewareResponse = data;
            }
            shouldContinue = false;
            return res;
          },
          setHeader: (name: string, value: string) => {
            middlewareHeaders[name] = value;
            return res;
          },
          getHeader: (name: string) => {
            return middlewareHeaders[name] || null;
          },
          getCookie: (name: string) => {
            const cookiesStr = cookies || '';
            if (!cookiesStr) return null;
            const cookieMatch = cookiesStr.match(new RegExp(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`));
            return cookieMatch ? decodeURIComponent(cookieMatch[2]) : null;
          },
          getCookies: () => {
            const cookies: Record<string, string> = {};
            if (middlewareHeaders['Set-Cookie']) {
              const setCookies = Array.isArray(middlewareHeaders['Set-Cookie'])
                  ? middlewareHeaders['Set-Cookie']
                  : [middlewareHeaders['Set-Cookie']];

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
            return middlewareHeaders;
          },
          setCookie: (name: string, value: string, options: any = {}) => {
            let cookieString = `${name}=${value}`;
            if (options.httpOnly) cookieString += '; HttpOnly';
            if (options.secure) cookieString += '; Secure';
            if (options.sameSite) cookieString += `; SameSite=${options.sameSite}`;
            if (options.maxAge) cookieString += `; Max-Age=${options.maxAge}`;
            if (options.path) cookieString += `; Path=${options.path}`;

            middlewareHeaders['Set-Cookie'] = middlewareHeaders['Set-Cookie'] || [];
            if (Array.isArray(middlewareHeaders['Set-Cookie'])) {
              middlewareHeaders['Set-Cookie'].push(cookieString);
            } else {
              middlewareHeaders['Set-Cookie'] = [middlewareHeaders['Set-Cookie'], cookieString];
            }
            return res;
          },
          // Methods for working with files and forms
          sendFile: (file: UploadedFile) => {
            middlewareResponse = JSON.stringify(file);
            middlewareContentType = 'application/json';
            shouldContinue = false;
            return res;
          },
          sendBuffer: (buffer: Buffer, contentType: string = 'application/octet-stream', size?: number) => {
            middlewareResponse = buffer;
            middlewareHeaders['Content-Type'] = contentType;
            middlewareHeaders['Content-Length'] = (size || buffer.length).toString();
            shouldContinue = false;
            return res;
          },
          sendFiles: (files: Record<string, UploadedFile>) => {
            middlewareResponse = JSON.stringify(files);
            middlewareContentType = 'application/json';
            shouldContinue = false;
            return res;
          },
          sendMultipart: (data: MultipartData) => {
            middlewareResponse = JSON.stringify(data);
            middlewareContentType = 'application/json';
            shouldContinue = false;
            return res;
          },
          download: (filepath: string, filename?: string) => {
            middlewareHeaders['Content-Disposition'] = `attachment; filename="${filename || filepath}"`;
            middlewareResponse = filepath;
            middlewareContentType = 'application/octet-stream';
            shouldContinue = false;
            return res;
          },
          attachment: (filename?: string) => {
            if (filename) {
              middlewareHeaders['Content-Disposition'] = `attachment; filename="${filename}"`;
            } else {
              middlewareHeaders['Content-Disposition'] = 'attachment';
            }
            return res;
          },
          // Methods for various content types
          html: (content: string) => {
            middlewareResponse = content;
            middlewareContentType = 'text/html';
            shouldContinue = false;
            return res;
          },
          text: (content: string) => {
            middlewareResponse = content;
            middlewareContentType = 'text/plain';
            shouldContinue = false;
            return res;
          },
          xml: (content: string) => {
            middlewareResponse = content;
            middlewareContentType = 'application/xml';
            shouldContinue = false;
            return res;
          },
          redirect: (url: string, status = 302) => {
            middlewareHeaders['Location'] = url;
            middlewareResponse = `Redirecting to ${url}`;
            middlewareContentType = 'text/plain';
            shouldContinue = false;
            res.status(status);
            return res;
          }
        };

        const next = () => {
          shouldContinue = true;
        };

        // Execute middleware
        try {
          middleware(req, res, next);

          return JSON.stringify({
            shouldContinue,
            content: middlewareResponse,
            contentType: middlewareContentType,
            headers: middlewareHeaders,
            customParams: middlewareCustomParams
          });
        } catch (error) {
          return JSON.stringify({
            shouldContinue: false,
            content: 'Middleware Error',
            contentType: 'text/plain'
          });
        }
      }
    }

    // If middleware not found, continue execution
    return JSON.stringify({ shouldContinue: true });
  } catch (error) {
    return JSON.stringify({ shouldContinue: true });
  }
}

// Export functions for Rust
(global as any).getHandler = getHandler;
(global as any).executeMiddleware = executeMiddleware;

// Router class for creating route groups
class RouterImpl implements Router {
  public handlers = new Map<string, { method: string; handler: (req: Request, res: Response) => void }>();
  public middlewares = new Map<string, (req: Request, res: Response, next: () => void) => void>();

  get(path: string, handler: (req: Request, res: Response) => void): void {
    this.handlers.set(`GET:${path}`, { method: 'GET', handler });
  }

  post(path: string, handler: (req: Request, res: Response) => void): void {
    this.handlers.set(`POST:${path}`, { method: 'POST', handler });
  }

  put(path: string, handler: (req: Request, res: Response) => void): void {
    this.handlers.set(`PUT:${path}`, { method: 'PUT', handler });
  }

  delete(path: string, handler: (req: Request, res: Response) => void): void {
    this.handlers.set(`DELETE:${path}`, { method: 'DELETE', handler });
  }

  patch(path: string, handler: (req: Request, res: Response) => void): void {
    this.handlers.set(`PATCH:${path}`, { method: 'PATCH', handler });
  }

  options(path: string, handler: (req: Request, res: Response) => void): void {
    this.handlers.set(`OPTIONS:${path}`, { method: 'OPTIONS', handler });
  }

  use(pathOrMiddleware: string | ((req: Request, res: Response, next: () => void) => void), middleware?: (req: Request, res: Response, next: () => void) => void): void {
    if (typeof pathOrMiddleware === 'function') {
      // Global middleware: router.use(middleware)
      this.middlewares.set('*', pathOrMiddleware);
    } else if (typeof pathOrMiddleware === 'string' && middleware) {
      // Middleware with path: router.use(path, middleware)
      this.middlewares.set(pathOrMiddleware, middleware);
    } else {
      throw new Error('Invalid middleware registration: use(path, middleware) or use(middleware)');
    }
  }

  getHandlers(): Map<string, { method: string; handler: (req: Request, res: Response) => void }> {
    return this.handlers; // Return original Map with method:path keys
  }

  getMiddlewares(): Map<string, (req: Request, res: Response, next: () => void) => void> {
    return this.middlewares;
  }
}

// Function for creating new router
export function Router(): Router {
  return new RouterImpl();
}

// RNodeApp class inherits from RouterImpl
class RNodeApp extends RouterImpl {
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
        console.log(`Registered static files from: ${path} with secure options:`, defaultOptions);
      }
    } else {
      // Single path
      addon.loadStaticFiles(pathOrPaths, defaultOptions);
      console.log(`Registered static files from: ${pathOrPaths} with secure options:`, defaultOptions);
    }
  }

  // Clear static files cache
  clearStaticCache(): void {
    addon.clearStaticCache();
    console.log('Static files cache cleared');
  }

  // Get static files statistics
  getStaticStats(): string {
    return addon.getStaticStats();
  }

  useRouter(path: string, router: Router): void {
    console.log(`🔧 Registering router for path: ${path}`);

    // Register all routes from router with prefix
    const routerHandlers = router.getHandlers();
    const routerMiddlewares = router.getMiddlewares();

    console.log(`📝 Router contains ${routerHandlers.size} handlers and ${routerMiddlewares.size} middleware`);

    // Register router middleware
    for (const [routePath, middleware] of routerMiddlewares) {
      const fullPath = `${path}${routePath}`;
      // Add to global middlewares
      middlewares.set(fullPath, middleware);
      addon.use(fullPath, middleware);
      console.log(`Registered router middleware: ${fullPath}`);
    }

    // Register router handlers
    for (const [methodPath, handlerInfo] of routerHandlers) {
      const [method, routePath] = methodPath.split(':', 2);
      const fullPath = `${path}${routePath}`;
      const { handler } = handlerInfo;

      console.log(`🔧 Registering handler: ${method} ${fullPath} (original path: ${routePath})`);

      // Add to global handlers with full path
      handlers.set(`${method}:${fullPath}`, handler);

      // Register in Rust addon through existing methods
      (addon as any)[method.toLowerCase()](fullPath, handler);

      console.log(`✅ Router handler registered: ${method} ${fullPath}`);
    }

    console.log(`🎯 Router registered for path: ${path}`);
    console.log(`📊 Total handlers in system: ${router.getHandlers().size}`);
    console.log(`🔧 Global handlers updated:`, Array.from(handlers.keys()));
  }

  listen(port: number, hostOrCallback?: string | (() => void), callback?: () => void): void {
    // Copy handlers and register in Rust addon
    for (const [key, value] of this.handlers) {
      const [method, path] = key.split(':', 2);
      handlers.set(key, value.handler);

      // Register in Rust addon through existing methods
      (addon as any)[method.toLowerCase()](path, value.handler);
    }

    // Copy middleware
    for (const [key, value] of this.middlewares) {
      middlewares.set(key, value);
    }

    console.log('🔧 Global handlers updated:', Array.from(handlers.keys()));
    console.log('🔧 Global middlewares updated:', Array.from(middlewares.keys()));

    if (typeof hostOrCallback === 'function') {
      // listen(port, callback)
      addon.listen(port);
      hostOrCallback();
    } else if (typeof hostOrCallback === 'string') {
      // listen(port, host, callback)
      let host = hostOrCallback;

      // Convert special values
      if (host === 'localhost') {
        host = '127.0.0.1';
      } else if (host === '0') {
        host = '0.0.0.0';
      }

      addon.listen(port, host);
      if (callback) callback();
    } else {
      // listen(port)
      addon.listen(port);
    }

    // Keep process alive
    setInterval(() => {
      // Empty interval to prevent process termination
    }, 1000);
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

  download(path: string, options: DownloadOptions): void {
    // Register route for file downloads in Rust backend
    addon.registerDownloadRoute(path, JSON.stringify(options));
  }

  upload(path: string, options: UploadOptions): void {
    // Register route for file uploads in Rust backend
    addon.registerUploadRoute(path, JSON.stringify(options));
  }
}

// Function for creating application
export function createApp(): RNodeAppInterface {
  const appInfo = addon.createApp();
  console.log(`Creating ${appInfo.name} v${appInfo.version}`);

  // Create RNodeApp instance
  return new RNodeApp();
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
