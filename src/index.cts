// This module is the CJS entry point for the library.

// The Rust addon.
import * as addon from './load.cjs';


// Интерфейс для загруженного файла
export interface UploadedFile {
  filename: string;
  contentType: string;
  size: number;
  data: string; // Base64 encoded data
}

// Интерфейс для multipart данных
export interface MultipartData {
  fields: Record<string, string>; // Обычные поля формы
  files: Record<string, UploadedFile>; // Загруженные файлы
}

// Типы для файловых операций
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
  body: any; // Может быть string, Record<string, string> (для multipart полей), или null
  files?: Record<string, UploadedFile>; // Файлы из multipart запроса
  contentType?: string; // Content-Type заголовок
  headers: Record<string, string>;
  cookies?: string;
  customParams?: Record<string, any>; // Параметры из предыдущих middleware/обработчиков
  getCookie(name: string): string | null;
  getHeader(name: string): string | null;
  hasCookie(name: string): boolean;
  hasHeader(name: string): boolean;
  getCookies(): Record<string, string>;
  getHeaders(): Record<string, string>;
  // Методы для работы с пользовательскими параметрами
  setParam(name: string, value: any): void;
  getParam(name: string): any;
  hasParam(name: string): boolean;
  getParams(): Record<string, any>;
  // Методы для работы с файлами
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

  // Функции для работы с файлами
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
  // Методы для работы с файлами и формами
  sendFile(file: UploadedFile): Response;
  sendBuffer(buffer: Buffer, contentType?: string, size?: number): Response;
  sendFiles(files: Record<string, UploadedFile>): Response;
  sendMultipart(data: MultipartData): Response;
  download(filepath: string, filename?: string): Response;
  attachment(filename?: string): Response;
  // Методы для различных типов контента
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

// Интерфейс для настроек статических файлов
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
  maxFileSize?: number; // в байтах
  allowedExtensions?: string[];
  blockedPaths?: string[];
  allowHiddenFiles?: boolean;
  allowSystemFiles?: boolean;
}

export interface UploadOptions {
  folder: string;
  allowedSubfolders?: string[]; // Разрешенные подпапки для безопасности
  maxFileSize?: number; // в байтах
  allowedExtensions?: string[];
  allowedMimeTypes?: string[]; // разрешенные MIME типы для безопасности
  multiple?: boolean; // разрешить загрузку нескольких файлов
  maxFiles?: number; // максимальное количество файлов (только если multiple: true)
  overwrite?: boolean; // разрешить перезапись существующих файлов
}

// Интерфейс для RNodeApp (будет реализован классом)
interface RNodeAppInterface extends Router {
  useRouter(path: string, router: Router): void;
  static(path: string, options?: StaticOptions): void;
  static(paths: string[], options?: StaticOptions): void;
  clearStaticCache(): void;
  getStaticStats(): string;
  listen(port: number, callback?: () => void): void;
  listen(port: number, host: string, callback?: () => void): void;

  // Методы для работы с файлами
  saveFile(filename: string, base64Data: string, uploadsDir: string): FileOperationResult;
  deleteFile(filename: string, uploadsDir: string): FileOperationResult;
  listFiles(uploadsDir: string): FileListResult;
  getFileContent(filename: string, uploadsDir: string): FileContentResult;
  fileExists(filename: string, uploadsDir: string): boolean;
  download(path: string, options: DownloadOptions): void;
  upload(path: string, options: UploadOptions): void;
}

// Глобальное хранилище обработчиков и middleware в JavaScript
let handlers = new Map<string, (req: Request, res: Response) => void>();
let middlewares = new Map<string, (req: Request, res: Response, next: () => void) => void>();



// Глобальная функция для обработки запросов из Rust
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

    // Ищем обработчик по зарегистрированному пути
    const handlerKey = `${method}:${registeredPath}`;
    const handler = handlers.get(handlerKey);

    if (handler) {
      console.log('✅ Handler found for:', handlerKey);

      // Создаем mock объекты req и res
      let responseData: any = '';
      let contentType = 'text/plain';
      let responseHeaders: Record<string, string | string[]> = {};

      // Получаем параметры из предыдущих вызовов
      const customParams = request.customParams || {};

      const req: Request = {
        method,
        url: path,
        params: pathParams || {},
        query: queryParams || {},
        body: body || {},
        headers: headers || {},
        cookies: cookies || '',
        customParams: customParams, // Передаем параметры в объект req
        // Хелпер для получения cookie по имени
        getCookie: (name: string) => {
          const cookiesStr = cookies || '';
          if (!cookiesStr) return null;

          const cookieMatch = cookiesStr.match(new RegExp(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`));
          return cookieMatch ? decodeURIComponent(cookieMatch[2]) : null;
        },
        // Хелпер для получения заголовка по имени
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
        // Хелпер для проверки наличия cookie
        hasCookie: (name: string) => {
          const cookiesStr = cookies || '';
          if (!cookiesStr) return false;
          return new RegExp(`(^|;)\\s*${name}\\s*=`).test(cookiesStr);
        },
        // Хелпер для проверки наличия заголовка
        hasHeader: (name: string) => {
          const headerName = name.toLowerCase();
          for (const key of Object.keys(headers || {})) {
            if (key.toLowerCase() === headerName) {
              return true;
            }
          }
          return false;
        },
        // Получить все cookies в виде JSON объекта
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
        // Получить все заголовки в виде JSON объекта
        getHeaders: () => {
          return headers || {};
        },
        // Методы для работы с пользовательскими параметрами
        // Параметры сохраняются локально и передаются через responseData
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
        // Методы для работы с файлами
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
          // Возвращаем установленные cookies из responseHeaders
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
          // Возвращаем установленные заголовки
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
        // Методы для работы с файлами и формами
        sendFile: (file: UploadedFile) => {
          responseData = JSON.stringify(file);
          contentType = 'application/json';
          return res;
        },
        sendBuffer: (buffer: Buffer, contentType: string = 'application/octet-stream', size?: number) => {
          // Для бинарных данных используем специальный формат
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
          // Для download устанавливаем заголовки для загрузки файла
          responseHeaders['Content-Disposition'] = `attachment; filename="${filename || filepath}"`;
          responseData = filepath; // Путь к файлу для Rust
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
        // Методы для различных типов контента
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

      // Выполняем обработчик
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

// Функция для выполнения middleware из Rust
function executeMiddleware(middlewareJson: string): string {
  try {
    const request = JSON.parse(middlewareJson);
    const { method, path, cookies, headers } = request;

    // Ищем подходящие middleware
    for (const [middlewarePath, middleware] of middlewares) {
      if (path.startsWith(middlewarePath) || middlewarePath === '*') {
        let shouldContinue = true;
        let middlewareResponse: string | Buffer = '';
        let middlewareContentType = 'text/plain';
        let middlewareHeaders: Record<string, string | string[]> = {};

        // Создаем mock объекты req и res для middleware
        // Получаем параметры из предыдущих вызовов
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
          // Методы для работы с пользовательскими параметрами
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
          // Методы для работы с файлами
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
            shouldContinue = false; // Middleware прерывает выполнение
            return res;
          },
          send: (data: string) => {
            middlewareResponse = data;
            shouldContinue = false; // Middleware прерывает выполнение
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
          // Методы для работы с файлами и формами
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
          // Методы для различных типов контента
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

        // Выполняем middleware
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

    // Если middleware не найден, продолжаем выполнение
    return JSON.stringify({ shouldContinue: true });
  } catch (error) {
    return JSON.stringify({ shouldContinue: true });
  }
}

// Экспортируем функции для Rust
(global as any).getHandler = getHandler;
(global as any).executeMiddleware = executeMiddleware;

// Класс Router для создания групп маршрутов
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
      // Глобальный middleware: router.use(middleware)
      this.middlewares.set('*', pathOrMiddleware);
    } else if (typeof pathOrMiddleware === 'string' && middleware) {
      // Middleware с путем: router.use(path, middleware)
      this.middlewares.set(pathOrMiddleware, middleware);
    } else {
      throw new Error('Invalid middleware registration: use(path, middleware) or use(middleware)');
    }
  }

  getHandlers(): Map<string, { method: string; handler: (req: Request, res: Response) => void }> {
    return this.handlers; // Возвращаем оригинальный Map с ключами method:path
  }

  getMiddlewares(): Map<string, (req: Request, res: Response, next: () => void) => void> {
    return this.middlewares;
  }
}

// Функция для создания нового роутера
export function Router(): Router {
  return new RouterImpl();
}

// Класс RNodeApp наследует от RouterImpl
class RNodeApp extends RouterImpl {
  // Дополнительные методы для RNodeApp
  static(pathOrPaths: string | string[], options?: StaticOptions): void {
    // Дефолтные настройки
    const defaultOptions: StaticOptions = {
      cache: options?.cache ?? true,
      maxAge: options?.maxAge ?? 3600, // 1 час
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
      // Множественные пути
      for (const path of pathOrPaths) {
        addon.loadStaticFiles(path, defaultOptions);
        console.log(`Registered static files from: ${path} with secure options:`, defaultOptions);
      }
    } else {
      // Один путь
      addon.loadStaticFiles(pathOrPaths, defaultOptions);
      console.log(`Registered static files from: ${pathOrPaths} with secure options:`, defaultOptions);
    }
  }

  // Очистка кеша статических файлов
  clearStaticCache(): void {
    addon.clearStaticCache();
    console.log('Static files cache cleared');
  }

  // Получение статистики статических файлов
  getStaticStats(): string {
    return addon.getStaticStats();
  }

  useRouter(path: string, router: Router): void {
    console.log(`🔧 Регистрируем роутер для пути: ${path}`);

    // Регистрируем все маршруты из роутера с префиксом
    const routerHandlers = router.getHandlers();
    const routerMiddlewares = router.getMiddlewares();

    console.log(`📝 Роутер содержит ${routerHandlers.size} обработчиков и ${routerMiddlewares.size} middleware`);

    // Регистрируем middleware роутера
    for (const [routePath, middleware] of routerMiddlewares) {
      const fullPath = `${path}${routePath}`;
      // Добавляем в глобальные middlewares
      middlewares.set(fullPath, middleware);
      addon.use(fullPath, middleware);
      console.log(`Registered router middleware: ${fullPath}`);
    }

    // Регистрируем обработчики роутера
    for (const [methodPath, handlerInfo] of routerHandlers) {
      const [method, routePath] = methodPath.split(':', 2);
      const fullPath = `${path}${routePath}`;
      const { handler } = handlerInfo;

      console.log(`🔧 Регистрируем обработчик: ${method} ${fullPath} (исходный путь: ${routePath})`);

      // Добавляем в глобальные handlers с полным путем
      handlers.set(`${method}:${fullPath}`, handler);

      // Регистрируем в Rust addon через существующие методы
      (addon as any)[method.toLowerCase()](fullPath, handler);

      console.log(`✅ Зарегистрирован обработчик роутера: ${method} ${fullPath}`);
    }

    console.log(`🎯 Роутер зарегистрирован для пути: ${path}`);
    console.log(`📊 Всего обработчиков в системе: ${router.getHandlers().size}`);
    console.log(`🔧 Глобальные handlers обновлены:`, Array.from(handlers.keys()));
  }

  listen(port: number, hostOrCallback?: string | (() => void), callback?: () => void): void {
    // Копируем обработчики и регистрируем в Rust addon
    for (const [key, value] of this.handlers) {
      const [method, path] = key.split(':', 2);
      handlers.set(key, value.handler);

      // Регистрируем в Rust addon через существующие методы
      (addon as any)[method.toLowerCase()](path, value.handler);
    }

    // Копируем middleware
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

      // Конвертируем специальные значения
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

    // Держим процесс живым
    setInterval(() => {
      // Пустой интервал для предотвращения завершения процесса
    }, 1000);
  }

  // HTTP методы get, post, put, delete, patch и use автоматически наследуются от RouterImpl
  // и автоматически регистрируются в Rust addon

  // Методы для работы с файлами
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
    // Регистрируем роут для скачивания файлов в Rust backend
    addon.registerDownloadRoute(path, JSON.stringify(options));
  }

  upload(path: string, options: UploadOptions): void {
    // Регистрируем роут для загрузки файлов в Rust backend
    addon.registerUploadRoute(path, JSON.stringify(options));
  }
}

// Функция для создания приложения
export function createApp(): RNodeAppInterface {
  const appInfo = addon.createApp();
  console.log(`Creating ${appInfo.name} v${appInfo.version}`);

  // Создаем экземпляр RNodeApp
  return new RNodeApp();
}

// Простая функция приветствия
export function greeting(name: string): { message: string } {
  const message = addon.hello(name);
  return { message };
}

// Экспорт по умолчанию для совместимости с ES модулями
export default {
  createApp,
  greeting,
  RNodeApp
};

// Экспортируем типы для использования
export type { StaticOptions };
