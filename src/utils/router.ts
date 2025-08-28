import { Request } from './request';
import { Response } from './response';
import { createHttpMethodsUtils, type HttpMethodsUtils } from './http-methods';
import { createMiddlewareUtils, type MiddlewareUtils } from './middleware';
import { listFiles, saveFile, deleteFile, getFileContent, fileExists, loadStaticFiles, initTemplates, renderTemplate } from './file-utils';
import { TemplateOptions } from '../types/app-router';
import { createExpressMiddlewareWrapper, createExpressErrorMiddlewareWrapper } from './express-middleware-utils';
import {handlers} from "./global-utils";
import * as addon from "../load.cjs";

export type Middleware = (req: Request, res: Response, next: (error?: any) => void) => void | Promise<any>;

export class Router {
  private routerHandlers: Map<string, { method: string; handler: (req: Request, res: Response) => void | Promise<any> }>;
  private routerMiddlewares: Map<string, Middleware[]>;
  private httpMethods: HttpMethodsUtils;
  private middlewareUtils: MiddlewareUtils;

  constructor() {
    this.routerHandlers = new Map<string, { method: string; handler: (req: Request, res: Response) => void | Promise<any> }>();
    this.routerMiddlewares = new Map<string, Middleware[]>();
    
    this.httpMethods = createHttpMethodsUtils(this.routerHandlers);
    this.middlewareUtils = createMiddlewareUtils(this.routerMiddlewares);
    
    // Bind methods to preserve 'this' context
    this.useExpress = this.useExpress.bind(this);
    this.useExpressError = this.useExpressError.bind(this);
  }

  // HTTP Methods
  get(path: string, handler: (req: Request, res: Response) => void | Promise<any> | Response | Promise<Response>): any {
    return this.httpMethods.get(path, handler);
  }

  post(path: string, handler: (req: Request, res: Response) => void | Promise<any> | Response | Promise<Response>): any {
    return this.httpMethods.post(path, handler);
  }

  put(path: string, handler: (req: Request, res: Response) => void | Promise<any> | Response | Promise<Response>): any {
    return this.httpMethods.put(path, handler);
  }

  delete(path: string, handler: (req: Request, res: Response) => void | Promise<any> | Response | Promise<Response>): any {
    return this.httpMethods.delete(path, handler);
  }

  patch(path: string, handler: (req: Request, res: Response) => void | Promise<any> | Response | Promise<Response>): any {
    return this.httpMethods.patch(path, handler);
  }

  options(path: string, handler: (req: Request, res: Response) => void | Promise<any> | Response | Promise<Response>): any {
    return this.httpMethods.options(path, handler);
  }

  trace(path: string, handler: (req: Request, res: Response) => void | Promise<any> | Response | Promise<Response>): any {
    return this.httpMethods.trace(path, handler);
  }
  any(path: string, handler: (req: Request, res: Response) => void | Promise<any> | Response | Promise<Response>): any {
    return this.httpMethods.any(path, handler);
  }

  // Middleware
  use(pathOrMiddleware: string | Middleware, middleware?: Middleware): void {
    return this.middlewareUtils.use(pathOrMiddleware, middleware);
  }

  // File listing method
  listFiles(folder: string) {
    return listFiles(folder);
  }

  // File saving method
  saveFile(filename: string, base64Data: string, uploadsDir: string) {
    return saveFile(filename, base64Data, uploadsDir);
  }

  // File deletion method
  deleteFile(filename: string, uploadsDir: string) {
    return deleteFile(filename, uploadsDir);
  }

  // File content retrieval method
  getFileContent(filename: string, uploadsDir: string) {
    return getFileContent(filename, uploadsDir);
  }

  // File existence check method
  fileExists(filename: string, uploadsDir: string): boolean {
    return fileExists(filename, uploadsDir);
  }

  // Static files method
  static(pathOrPaths: string | string[], options?: any): void {
    loadStaticFiles(pathOrPaths, options);
  }

  // Template initialization method
  initTemplates(pattern: string, options: TemplateOptions): string {
    return initTemplates(pattern, options);
  }

  // Template rendering method
  renderTemplate(templateName: string, context: object): string {
    return renderTemplate(templateName, context);
  }

  getHandlers(): Map<string, { method: string; handler: (req: Request, res: Response) => void | Promise<any> }> {
    return this.routerHandlers;
  }

  getMiddlewares(): Map<string, Middleware[]> {
    return this.routerMiddlewares;
  }


  // HTTP utility methods
  async httpRequest(method: string, url: string, headers: Record<string, string> = {}, body: string = '', timeout: number = 30000): Promise<any> {
    const headersJson = JSON.stringify(headers);
    const result = (addon as any).httpRequest(method, url, headersJson, body, timeout);
    return JSON.parse(result);
  }

  async httpBatch(requests: Array<{method: string, url: string, headers?: Record<string, string>, body?: string}>, timeout: number = 30000): Promise<any> {
    const requestsJson = JSON.stringify(requests);
    const result = (addon as any).httpBatch(requestsJson, timeout);
    return JSON.parse(result);
  }

  // Express middleware support
  useExpress(middlewareOrPath: any | string, middleware?: any): void {
    if (typeof middlewareOrPath === 'function') {
      // useExpress(middleware)
      const expressMiddleware = middlewareOrPath;
      this.use((req: Request, res: Response, next: (error?: any) => void) => {
        createExpressMiddlewareWrapper(expressMiddleware, req, res, next);
      });
    } else if (typeof middlewareOrPath === 'string' && middleware) {
      // useExpress(path, middleware)
      const path = middlewareOrPath;
      const expressMiddleware = middleware;
      this.use(path, (req: Request, res: Response, next: (error?: any) => void) => {
        createExpressMiddlewareWrapper(expressMiddleware, req, res, next);
      });
    } else {
      throw new Error('Invalid useExpress call: useExpress(middleware) or useExpress(path, middleware)');
    }
  }

  useExpressError(middleware: any): void {
    // Error middleware - will be called when errors occur
    this.use((req: Request, res: Response, next: (error?: any) => void) => {
      createExpressErrorMiddlewareWrapper(middleware, req, res, next);
    });
  }
}

// Legacy function for backward compatibility
export function createRouter(): Router {
  return new Router();
}
