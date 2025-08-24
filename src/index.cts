// This module is the CJS entry point for the library.

// The Rust addon.
import * as addon from './load.cjs';
import micromatch from 'micromatch';

// Express types for compatibility
import type {NextFunction, Request as ExpressRequest, Response as ExpressResponse} from 'express';

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

export interface TemplateInitResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface TemplateRenderResult {
  success: boolean;
  content?: string;
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
  function createApp(): { name: string; version: string };
  function get(path: string, handler: Function): void;
  function post(path: string, handler: Function): void;
  function put(path: string, handler: Function): void;
  function del(path: string, handler: Function): void;
  function patch(path: string, handler: Function): void;
  function options(path: string, handler: Function): void;
  function use(path: string, handler: Function): void;
  function listen(port: number, host?: string, certPath?: string, keyPath?: string): void;
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
type Middleware = (req: Request, res: Response, next: (error?: any) => void) => void;

export interface Router {
  get(path: string, handler: (req: Request, res: Response) => void): void;
  post(path: string, handler: (req: Request, res: Response) => void): void;
  put(path: string, handler: (req: Request, res: Response) => void): void;
  delete(path: string, handler: (req: Request, res: Response) => void): void;
  patch(path: string, handler: (req: Request, res: Response) => void): void;
  options(path: string, handler: (req: Request, res: Response) => void): void;
  use(pathOrMiddleware: string | Middleware, middleware?: Middleware): void;
  
  // Express middleware support
  useExpress(middleware: ExpressMiddleware): void;
  useExpress(path: string, middleware: ExpressMiddleware): void;
  useExpressError(middleware: ExpressErrorMiddleware): void;
  
  // SSL configuration
  setSslConfig(config: SslConfig): void;
  
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
  
  getHandlers(): Map<string, { method: string; handler: (req: Request, res: Response) => void }>;
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
}

// Global storage for handlers and middleware in JavaScript
let handlers = new Map<string, (req: Request, res: Response) => void>();
let middlewares = new Map<string, Middleware[]>();



// Global function for handling requests from Rust
function getHandler(requestJson: string): string {
  try {
    const request = JSON.parse(requestJson);
    const { method, path, registeredPath, pathParams, queryParams, body, cookies, headers, ip, ips, ipSource } = request;

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
    console.log('🔍 executeMiddleware called with path:', request.path);
    console.log('🔍 Available middleware patterns:', Array.from(middlewares.keys()));
    
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
        console.log(`🔧 Middleware setParam: ${name} = ${value}`);
      },
      getParam: (name: string) => {
        if (!req.customParams) return undefined;
        const value = req.customParams[name];
        console.log(`🔧 Middleware getParam: ${name} = ${value}`);
        return value;
      },
      hasParam: (name: string) => {
        if (!req.customParams) return false;
        const has = name in req.customParams;
        console.log(`🔧 Middleware hasParam: ${name} = ${has}`);
        return has;
      },
      getParams: () => {
        if (!req.customParams) return {};
        console.log(`🔧 Middleware getParams:`, req.customParams);
        return { ...req.customParams };
      },
      // Allow middleware to modify headers
      setHeader: (name: string, value: string) => {
        if (!req.headers) req.headers = {};
        req.headers[name] = value;
        console.log(`🔧 Middleware setHeader: ${name} = ${value}`);
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
        console.log(`🔧 Middleware setCookie: ${name} = ${value}`);
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
      console.log(`🔍 Checking middleware pattern: ${middlewarePath} against path: ${request.path}`);
      
      let matches = false;
      
      if (middlewarePath === '*') {
        // Global middleware matches everything
        matches = true;
        console.log('✅ Global middleware (*) matches');
      } else {
        // Use micromatch for pattern matching (supports glob, regex, etc.)
        matches = micromatch.isMatch(request.path, middlewarePath);
        console.log(`🔍 Micromatch check: ${request.path} matches ${middlewarePath} -> ${matches}`);
      }
      
      // Execute middleware for this pattern
      if (matches) {
        console.log(`✅ Executing ${middlewareArray.length} middleware for pattern: ${middlewarePath}`);
        
        // Execute all middleware for this path
        console.log(`🔧 Starting with params:`, req.customParams);
        
        for (let i = 0; i < middlewareArray.length; i++) {
          const middleware = middlewareArray[i];
          console.log(`🔄 Executing middleware ${i + 1} of ${middlewareArray.length}`);
          
          try {
            // Call middleware function with req and res objects
            let middlewareError: any = null;
            
            console.log(`🔍 Executing middleware for pattern: ${middlewarePath}`);
            console.log(`🔍 Request origin: ${req.headers.origin}`);
            
            middleware(req, res, (error?: any) => {
              // Next function - continue to next middleware
              if (error) {
                // If middleware throws an error, stop execution and return error
                console.error('❌ Middleware error:', error);
                middlewareError = error;
              } else {
                console.log('✅ Middleware completed without error');
              }
            });
            
            // Check if middleware returned an error
            if (middlewareError) {
              console.log('❌ Middleware returned error, stopping execution');
              console.log(`❌ Error details: ${middlewareError.message || middlewareError}`);
              return JSON.stringify({ 
                shouldContinue: false,
                error: middlewareError.message || middlewareError.toString(),
                req: {...req},
                res: {...res}
              });
            }
            
            // Update accumulated params for next middleware
            console.log(`🔧 Updated params:`, req.customParams);
          } catch (error) {
            console.error('❌ Middleware execution error:', error);
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

    console.log('✅ All middleware executed, continuing');
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
    
    console.log(`🔧 Final response headers:`, finalRes.headers);
    
    return JSON.stringify({ 
      shouldContinue: true,
      req: finalReq,
      res: finalRes
    });
  } catch (error) {
    console.error('❌ executeMiddleware error:', error);
    
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
  public handlers = new Map<string, { method: string; handler: (req: Request, res: Response) => void }>();
  public middlewares = new Map<string, Middleware[]>();

  get(path: string, handler: (req: Request, res: Response) => void): Router {
    this.handlers.set(`GET:${path}`, { method: 'GET', handler });
    return this;
  }

  post(path: string, handler: (req: Request, res: Response) => void): Router {
    this.handlers.set(`POST:${path}`, { method: 'POST', handler });
    return this;
  }

  put(path: string, handler: (req: Request, res: Response) => void): Router {
    this.handlers.set(`PUT:${path}`, { method: 'PUT', handler });
    return this;
  }

  delete(path: string, handler: (req: Request, res: Response) => void): Router {
    this.handlers.set(`DELETE:${path}`, { method: 'DELETE', handler });
    return this;
  }

  patch(path: string, handler: (req: Request, res: Response) => void): Router {
    this.handlers.set(`PATCH:${path}`, { method: 'PATCH', handler });
    return this;
  }

  options(path: string, handler: (req: Request, res: Response) => void): Router {
    this.handlers.set(`OPTIONS:${path}`, { method: 'OPTIONS', handler });
    return this;
  }

  use(pathOrMiddleware: string | ((req: Request, res: Response, next: () => void) => void), middleware?: (req: Request, res: Response, next: () => void) => void): void {
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
              console.log(`❌ Middleware error: ${error.message || error}`);
              console.log(`❌ Origin: ${req.headers.origin}`);
              console.log(`❌ CORS blocked request - calling next(error)`);
              
              // Call next with error to trigger error handling
              next(error);
              return;
            }
            
            // Check if response was already sent by middleware
            console.log(`🔧 Checking response state: headersSent=${expressRes.headersSent}, statusCode=${expressRes.statusCode}`);
            if (expressRes.headersSent || expressRes.statusCode !== 200) {
              console.log('✅ Middleware handled response');
              console.log(`🔧 Response headers:`, res.getHeaders());
              console.log(`🔧 Response status: ${expressRes.statusCode}`);
              return;
            }
            
            // Continue to next middleware/handler
            console.log('✅ Middleware passed, continuing');
            console.log(`🔧 Response headers after middleware:`, res.getHeaders());
            next();
          };
          
          // Execute Express middleware with proper error handling
          console.log(`🔒 Executing Express middleware for origin: ${req.headers.origin}`);
          
          // Execute Express middleware
          expressMiddleware(expressReq, expressRes, expressNext);
        } catch (error) {
          console.error('❌ Error in Express middleware:', error);
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
              console.log(`❌ Middleware error: ${error.message || error}`);
              console.log(`❌ Origin: ${req.headers.origin}`);
              
              // Call next with error to trigger error handling
              next(error);
              return;
            }
            
            // Check if response was already sent by middleware
            if (expressRes.headersSent || expressRes.statusCode !== 200) {
              console.log('✅ Middleware handled response');
              console.log(`🔧 Response headers:`, res.getHeaders());
              console.log(`🔧 Response status: ${expressRes.statusCode}`);
              return;
            }
            
            // Continue to next middleware/handler
            console.log('✅ Middleware passed, continuing');
            console.log(`🔧 Response headers after middleware:`, res.getHeaders());
            next();
          };
          
          // Execute Express middleware with proper error handling
          console.log(`🔒 Executing Express middleware for origin: ${req.headers.origin}`);
          
          // Execute Express middleware
          expressMiddleware(expressReq, expressRes, expressNext);
        } catch (error) {
          console.error('❌ Error in Express middleware:', error);
          next(error);
        }
      });
    } else {
      throw new Error('Invalid useExpress call: useExpress(middleware) or useExpress(path, middleware)');
    }
  }

  private sslConfig?: SslConfig;

  setSslConfig(config: SslConfig): void {
    this.sslConfig = config;
  }

  getSslConfig(): SslConfig | undefined {
    return this.sslConfig;
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
        console.log(`🔧 Setting header: ${field} = ${value}`);
        res.setHeader(field, value);
        return expressRes;
      },
      header: (field: string, value: string) => {
        console.log(`🔧 Setting header: ${field} = ${value}`);
        res.setHeader(field, value);
        return expressRes;
      },
      json: (body: any) => {
        console.log('🔧 Sending JSON response');
        headersSent = true;
        res.json(body);
        return expressRes;
      },
      send: (body: any) => {
        console.log('🔧 Sending response');
        headersSent = true;
        res.send(body);
        return expressRes;
      },
      end: (chunk?: any) => {
        console.log('🔧 Ending response');
        headersSent = true;
        res.end(chunk);
        return expressRes;
      },
      status: (code: number) => {
        console.log(`🔧 Setting status: ${code}`);
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

  getHandlers(): Map<string, { method: string; handler: (req: Request, res: Response) => void }> {
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
      console.log(`📁 Files listed from folder: ${folder}`, parsedResult);
      return parsedResult;
    } catch (error) {
      console.error('❌ Error listing files:', error);
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
      console.log(`💾 File saved: ${filename} in ${uploadsDir}`, parsedResult);
      return parsedResult;
    } catch (error) {
      console.error('❌ Error saving file:', error);
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
      console.log(`🗑️ File deleted: ${filename} from ${uploadsDir}`, parsedResult);
      return parsedResult;
    } catch (error) {
      console.error('❌ Error deleting file:', error);
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
      console.log(`📄 File content retrieved: ${filename} from ${uploadsDir}`, {
        ...parsedResult,
        content: parsedResult.content ? `${parsedResult.content.substring(0, 50)}...` : 'No content'
      });
      return parsedResult;
    } catch (error) {
      console.error('❌ Error getting file content:', error);
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
      console.log(`🔍 File exists check: ${filename} in ${uploadsDir} -> ${exists}`);
      return exists;
    } catch (error) {
      console.error('❌ Error checking file existence:', error);
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
        console.log(`Registered static files from: ${path} with secure options:`, defaultOptions);
      }
    } else {
      // Single path
      addon.loadStaticFiles(pathOrPaths, defaultOptions);
      console.log(`Registered static files from: ${pathOrPaths} with secure options:`, defaultOptions);
    }
  }

  // Template initialization method
  initTemplates(pattern: string, options: TemplateOptions): string {
    try {
      // Call Rust addon to initialize templates
      const result = addon.initTemplates(pattern, options);
      console.log(`✅ Templates initialized with pattern: ${pattern}`);
      return result;
    } catch (error) {
      console.error('❌ Error initializing templates:', error);
      return `Template initialization error: ${error}`;
    }
  }

  // Template rendering method
  renderTemplate(templateName: string, context: object): string {
    try {
      // Call Rust addon to render template
      const result = addon.renderTemplate(templateName, JSON.stringify(context));
      return result;
    } catch (error) {
      console.error('❌ Error rendering template:', error);
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

  // Set SSL configuration
  setSslConfig(config: SslConfig): void {
    super.setSslConfig(config);
  }

  // Get all registered routes including router routes
  getAllRoutes(): Map<string, (req: Request, res: Response) => void> {
    // Return global handlers which include all routes from useRouter
    return handlers;
  }

  useRouter(path: string, router: Router): void {
    console.log(`🔧 Registering router for path: ${path}`);

    // Register all routes from router with prefix
    const routerHandlers = router.getHandlers();
    const routerMiddlewares = router.getMiddlewares();

    console.log(`📝 Router contains ${routerHandlers.size} handlers and ${routerMiddlewares.size} middleware`);

    // Register router middleware
    for (const [routePath, middlewareArray] of routerMiddlewares) {
      let fullPath: string;
      
      if (routePath === '*') {
        // Глобальный middleware для роутера - регистрируем для всех путей роутера
        fullPath = `${path}/*`;
        console.log(`🔐 Registering global router middleware for: ${fullPath}`);
      } else {
        // Обычный middleware с путем
        fullPath = `${path}${routePath}`;
        console.log(`🔐 Registering router middleware for: ${fullPath}`);
      }
      
      console.log(`🔍 Full path: '${fullPath}', routePath: '${routePath}', path: '${path}'`);
      
      // Add to global middlewares
      const existing = middlewares.get(fullPath) || [];
      middlewares.set(fullPath, [...existing, ...middlewareArray]);
      
      // Register each middleware individually in Rust addon
      for (const middleware of middlewareArray) {
        console.log(`🔧 Calling addon.use('${fullPath}', middleware)`);
        addon.use(fullPath, middleware);
      }
      
      console.log(`✅ Registered router middleware: ${fullPath} (${middlewareArray.length} middleware functions)`);
      console.log(`📊 Global middlewares after registration:`, Array.from(middlewares.keys()));
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
      const addonMethod = method.toLowerCase() === 'delete' ? 'del' : method.toLowerCase();
      (addon as any)[addonMethod](fullPath, handler);

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
        const addonMethod = method.toLowerCase() === 'delete' ? 'del' : method.toLowerCase();
        (addon as any)[addonMethod](path, value.handler);
      }

      // Copy middleware
      for (const [key, value] of this.middlewares) {
        console.log(`🔧 Copying middleware: ${key} -> ${value.length} functions`);
        const existing = middlewares.get(key) || [];
        middlewares.set(key, [...existing, ...value]);
        
        // Register each middleware individually in Rust addon
        for (const middleware of value) {
          console.log(`🔧 Calling addon.use('${key}', middleware) in listen`);
          addon.use(key, middleware);
        }
      }

      console.log('🔧 Global handlers updated:', Array.from(handlers.keys()));
      console.log('🔧 Global middlewares updated:', Array.from(middlewares.keys()));
      console.log('🔧 App middlewares:', Array.from(this.middlewares.keys()));

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

      // Check if SSL is configured
      const sslConfig = this.getSslConfig();
      if (sslConfig && sslConfig.certPath && sslConfig.keyPath) {
        console.log(`🔒 Starting HTTPS server on ${host || '127.0.0.1'}:${port}`);
        console.log(`   Certificate: ${sslConfig.certPath}`);
        console.log(`   Private Key: ${sslConfig.keyPath}`);
        // Start HTTPS server with SSL certificates
        addon.listen(port, host, sslConfig.certPath, sslConfig.keyPath);
      } else {
        console.log(`🌐 Starting HTTP server on ${host || '127.0.0.1'}:${port}`);
        // Start HTTP server
        addon.listen(port, host);
      }
      
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
        const result = addon.renderTemplate(templateName, contextStr);
        return result;
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: `Failed to render template: ${error}`
        });
      }
    }
  }

  // Function for creating application
  export function createApp(options?: AppOptions): RNodeAppInterface {
    const appInfo = addon.createApp();
    console.log(`Creating ${appInfo.name} v${appInfo.version}`);

    // Create RNodeApp instance
    const app = new RNodeApp();

    // Store SSL configuration if provided
    if (options?.ssl) {
      const { certPath, keyPath } = options.ssl;
      if (certPath && keyPath) {
        console.log(`🔒 SSL configuration loaded:`);
        console.log(`   Certificate: ${certPath}`);
        console.log(`   Private Key: ${keyPath}`);
        // Store SSL config in the app for later use
        (app as any).sslConfig = { certPath, keyPath };
      } else {
        console.warn('SSL certificate paths are not provided in options.');
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