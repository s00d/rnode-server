// This module is the CJS entry point for the library.

// The Rust addon.
import * as addon from './load.cjs';

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
  function use(path: string, handler: Function): void;
  function listen(port: number, host?: string): void;
  function loadStaticFiles(path: string): void;
}

// Express-подобные типы
export interface Request {
  method: string;
  url: string;
  params: Record<string, string>;
  query: Record<string, string>;
  body: any;
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
}

export interface Response {
  status(code: number): Response;
  json(data: any): Response;
  send(data: string): Response;
  setHeader(name: string, value: string): Response;
  getHeader(name: string): string | string[] | null;
  getCookie(name: string): string | null;
  getCookies(): Record<string, string>;
  getHeaders(): Record<string, string | string[]>;
  setCookie(name: string, value: string, options?: any): Response;
}

export interface Router {
  get(path: string, handler: (req: Request, res: Response) => void): void;
  post(path: string, handler: (req: Request, res: Response) => void): void;
  put(path: string, handler: (req: Request, res: Response) => void): void;
  delete(path: string, handler: (req: Request, res: Response) => void): void;
  patch(path: string, handler: (req: Request, res: Response) => void): void;
  use(pathOrMiddleware: string | ((req: Request, res: Response, next: () => void) => void), middleware?: (req: Request, res: Response, next: () => void) => void): void;
  getHandlers(): Map<string, { method: string; handler: (req: Request, res: Response) => void }>;
  getMiddlewares(): Map<string, (req: Request, res: Response, next: () => void) => void>;
}

// Интерфейс для RNodeApp (будет реализован классом)
interface RNodeAppInterface extends Router {
  useRouter(path: string, router: Router): void;
  static(path: string): void;
  listen(port: number, callback?: () => void): void;
  listen(port: number, host: string, callback?: () => void): void;
}

// Глобальное хранилище обработчиков и middleware в JavaScript
const handlers = new Map<string, (req: Request, res: Response) => void>();
const middlewares = new Map<string, (req: Request, res: Response, next: () => void) => void>();

// Глобальная функция для обработки запросов из Rust
function getHandler(requestJson: string): string {
  try {
    const request = JSON.parse(requestJson);
    const { method, path, registeredPath, pathParams, queryParams, body, cookies, headers } = request;
    
    // Ищем обработчик по зарегистрированному пути
    const handlerKey = `${method}:${registeredPath}`;
    const handler = handlers.get(handlerKey);
    
    if (handler) {
      
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
        }
      };
      
      const res: Response = {
        status: (code: number) => res,
        json: (data: any) => {
          responseData = JSON.stringify(data);
          contentType = 'application/json';
          return res;
        },
        send: (data: string) => {
          responseData = data;
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
        let middlewareResponse = '';
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
          }
        };
        
        const res: Response = {
          status: (code: number) => res,
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
  private handlers = new Map<string, { method: string; handler: (req: Request, res: Response) => void }>();
  private middlewares = new Map<string, (req: Request, res: Response, next: () => void) => void>();
  
  get(path: string, handler: (req: Request, res: Response) => void): void {
    this.handlers.set(`GET:${path}`, { method: 'GET', handler });
    // Автоматически регистрируем в Rust addon если доступен
    if (typeof addon !== 'undefined') {
      addon.get(path, handler);
      console.log(`Registered GET ${path}`);
    } else {
      console.log(`🔧 Router: Зарегистрирован GET обработчик для: ${path}`);
    }
  }
  
  post(path: string, handler: (req: Request, res: Response) => void): void {
    this.handlers.set(`POST:${path}`, { method: 'POST', handler });
    // Автоматически регистрируем в Rust addon если доступен
    if (typeof addon !== 'undefined') {
      addon.post(path, handler);
      console.log(`Registered POST ${path}`);
    } else {
      console.log(`🔧 Router: Зарегистрирован POST обработчик для: ${path}`);
    }
  }
  
  put(path: string, handler: (req: Request, res: Response) => void): void {
    this.handlers.set(`PUT:${path}`, { method: 'PUT', handler });
    // Автоматически регистрируем в Rust addon если доступен
    if (typeof addon !== 'undefined') {
      addon.put(path, handler);
      console.log(`Registered PUT ${path}`);
    } else {
      console.log(`🔧 Router: Зарегистрирован PUT обработчик для: ${path}`);
    }
  }
  
  delete(path: string, handler: (req: Request, res: Response) => void): void {
    this.handlers.set(`DELETE:${path}`, { method: 'DELETE', handler });
    // Автоматически регистрируем в Rust addon если доступен
    if (typeof addon !== 'undefined') {
      addon.del(path, handler);
      console.log(`Registered DELETE ${path}`);
    } else {
      console.log(`🔧 Router: Зарегистрирован DELETE обработчик для: ${path}`);
    }
  }
  
  patch(path: string, handler: (req: Request, res: Response) => void): void {
    this.handlers.set(`PATCH:${path}`, { method: 'PATCH', handler });
    // Автоматически регистрируем в Rust addon если доступен
    if (typeof addon !== 'undefined') {
      addon.patch(path, handler);
      console.log(`Registered PATCH ${path}`);
    } else {
      console.log(`🔧 Router: Зарегистрирован PATCH обработчик для: ${path}`);
    }
  }
  
  use(pathOrMiddleware: string | ((req: Request, res: Response, next: () => void) => void), middleware?: (req: Request, res: Response, next: () => void) => void): void {
    if (typeof pathOrMiddleware === 'function') {
      // Глобальный middleware: router.use(middleware)
      const globalMiddleware = pathOrMiddleware;
      this.middlewares.set('*', globalMiddleware);
      // Автоматически регистрируем в Rust addon если доступен
      if (typeof addon !== 'undefined') {
        addon.use('*', globalMiddleware);
        console.log(`Registered global middleware`);
      } else {
        console.log(`Router: Registered global middleware`);
      }
    } else if (typeof pathOrMiddleware === 'string' && middleware) {
      // Middleware с путем: router.use(path, middleware)
      const path = pathOrMiddleware;
      this.middlewares.set(path, middleware);
      // Автоматически регистрируем в Rust addon если доступен
      if (typeof addon !== 'undefined') {
        addon.use(path, middleware);
        console.log(`Registered middleware for path: ${path}`);
      } else {
        console.log(`Router: Registered middleware for path: ${path}`);
      }
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
  // Дополнительные методы для ExpressApp
  static(path: string): void {
    addon.loadStaticFiles(path);
    console.log(`Registered static files from: ${path}`);
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
      addon.use(fullPath, middleware);
      console.log(`Registered router middleware: ${fullPath}`);
    }

    // Регистрируем обработчики роутера
    for (const [methodPath, handlerInfo] of routerHandlers) {
      const [method, routePath] = methodPath.split(':', 2);
      const fullPath = `${path}${routePath}`;
      const { handler } = handlerInfo;

      console.log(`🔧 Регистрируем обработчик: ${method} ${fullPath} (исходный путь: ${routePath})`);

      // Регистрируем маршрут в Rust части
      switch (method) {
        case 'GET':
          addon.get(fullPath, handler);
          break;
        case 'POST':
          addon.post(fullPath, handler);
          break;
        case 'PUT':
          addon.put(fullPath, handler);
          break;
        case 'DELETE':
          addon.del(fullPath, handler);
          break;
        case 'PATCH':
          addon.patch(fullPath, handler);
          break;
        default:
          console.warn(`Unknown HTTP method: ${method} for path: ${fullPath}`);
      }

      console.log(`✅ Зарегистрирован обработчик роутера: ${method} ${fullPath}`);
    }

    console.log(`🎯 Роутер зарегистрирован для пути: ${path}`);
    console.log(`📊 Всего обработчиков в системе: ${router.getHandlers().size}`);
  }

  listen(port: number, hostOrCallback?: string | (() => void), callback?: () => void): void {
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
