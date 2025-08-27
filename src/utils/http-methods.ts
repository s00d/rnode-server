import { logger } from './logger';
import type { Request } from './request';
import type { Response } from './response';
import { registerHttpMethod } from './http-methods-utils';

export interface HttpMethodsUtils {
  get(path: string, handler: (req: Request, res: Response) => void | Promise<any> | Response | Promise<Response>): HttpMethodsUtils;
  post(path: string, handler: (req: Request, res: Response) => void | Promise<any> | Response | Promise<Response>): HttpMethodsUtils;
  put(path: string, handler: (req: Request, res: Response) => void | Promise<any> | Response | Promise<Response>): HttpMethodsUtils;
  delete(path: string, handler: (req: Request, res: Response) => void | Promise<any> | Response | Promise<Response>): HttpMethodsUtils;
  patch(path: string, handler: (req: Request, res: Response) => void | Promise<any> | Response | Promise<Response>): HttpMethodsUtils;
  options(path: string, handler: (req: Request, res: Response) => void | Promise<any> | Response | Promise<Response>): HttpMethodsUtils;
  trace(path: string, handler: (req: Request, res: Response) => void | Promise<any> | Response | Promise<Response>): HttpMethodsUtils;
  any(path: string, handler: (req: Request, res: Response) => void | Promise<any> | Response | Promise<Response>): HttpMethodsUtils;
}

export function createHttpMethodsUtils(handlers: Map<string, { method: string; handler: (req: Request, res: Response) => void | Promise<any> }>): HttpMethodsUtils {
  return {
    get(path: string, handler: (req: Request, res: Response) => void | Promise<any>) {
      // Store in local handlers map (like in old version)
      handlers.set(`GET:${path}`, { method: 'GET', handler });
      // Don't register in global system here - it will be done in useRouter
      return this;
    },

    post(path: string, handler: (req: Request, res: Response) => void | Promise<any>) {
      // Store in local handlers map (like in old version)
      handlers.set(`POST:${path}`, { method: 'POST', handler });
      // Don't register in global system here - it will be done in useRouter
      return this;
    },

    put(path: string, handler: (req: Request, res: Response) => void | Promise<any>) {
      // Store in local handlers map (like in old version)
      handlers.set(`PUT:${path}`, { method: 'PUT', handler });
      // Don't register in global system here - it will be done in useRouter
      return this;
    },

    delete(path: string, handler: (req: Request, res: Response) => void | Promise<any>) {
      // Store in local handlers map (like in old version)
      handlers.set(`DELETE:${path}`, { method: 'DELETE', handler });
      // Don't register in global system here - it will be done in useRouter
      return this;
    },

    patch(path: string, handler: (req: Request, res: Response) => void | Promise<any>) {
      // Store in local handlers map (like in old version)
      handlers.set(`PATCH:${path}`, { method: 'PATCH', handler });
      // Don't register in global system here - it will be done in useRouter
      return this;
    },

    options(path: string, handler: (req: Request, res: Response) => void | Promise<any>) {
      // Store in local handlers map (like in old version)
      handlers.set(`OPTIONS:${path}`, { method: 'OPTIONS', handler });
      // Don't register in global system here - it will be done in useRouter
      return this;
    },

    trace(path: string, handler: (req: Request, res: Response) => void | Promise<any>) {
      // Store in local handlers map (like in old version)
      handlers.set(`TRACE:${path}`, { method: 'TRACE', handler });
      // Don't register in global system here - it will be done in useRouter
      return this;
    },

    any(path: string, handler: (req: Request, res: Response) => void | Promise<any>) {
      // Store in local handlers map (like in old version)
      handlers.set(`ANY:${path}`, { method: 'ANY', handler });
      // Don't register in global system here - it will be done in useRouter
      return this;
    }
  };
}
