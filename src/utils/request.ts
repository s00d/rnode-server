import { UploadedFile } from '../types/request-response';
import { CookieUtils } from './cookie-utils';

// Union type for different body types
export type RequestBody = 
  | Record<string, string> // Form data
  | Record<string, any> // JSON data
  | string // Text data
  | BinaryData; // Binary data

// Interface for binary data
export interface BinaryData {
  type: 'binary';
  data: string; // Base64 encoded
  contentType: string;
  size: number;
}

export class Request {
  public method: string;
  public url: string;
  public params: Record<string, string>;
  public query: Record<string, string>;
  public body: RequestBody;
  public files?: Record<string, UploadedFile>;
  public contentType?: string;
  public headers: Record<string, string>;
  public cookies?: string;
  public customParams?: Record<string, any>;
  public ip?: string;
  public ips?: string[];
  public ipSource?: string;
  public abortController: AbortController = new AbortController();

  // Getter for abort signal
  get abortSignal(): AbortSignal | undefined {
    return this.abortController.signal;
  }

  constructor(requestData: any) {
    const { method, path, registeredPath, pathParams, queryParams, body, cookies, headers, ip, ips, ipSource, customParams = {} } = requestData;
    
    this.method = method;
    this.url = path;
    this.params = pathParams || {};
    this.query = queryParams || {};
    this.body = (body || {}) as RequestBody;
    this.headers = headers || {};
    this.cookies = cookies || '';
    this.customParams = customParams;
    this.ip = ip || '127.0.0.1';
    this.ips = ips || ['127.0.0.1'];
    this.ipSource = ipSource || 'default';
  }

  // Helper for getting cookie by name
  getCookie(name: string): string | null {
    return CookieUtils.getCookie(this.cookies || '', name);
  }

  // Helper for getting header by name
  getHeader(name: string): string | null {
    const headerName = name.toLowerCase();
    for (const key of Object.keys(this.headers)) {
      if (key.toLowerCase() === headerName) {
        return this.headers[key];
      }
    }
    return null;
  }

  // Helper for checking cookie existence
  hasCookie(name: string): boolean {
    return CookieUtils.hasCookie(this.cookies || '', name);
  }

  // Helper for checking header existence
  hasHeader(name: string): boolean {
    const headerName = name.toLowerCase();
    for (const key of Object.keys(this.headers)) {
      if (key.toLowerCase() === headerName) {
        return true;
      }
    }
    return false;
  }

  // Get all cookies as JSON object
  getCookies(): Record<string, string> {
    return CookieUtils.parseCookies(this.cookies || '');
  }

  // Get all headers as JSON object
  getHeaders(): Record<string, string> {
    return this.headers;
  }

  // Methods for working with custom parameters
  setParam(name: string, value: any): void {
    if (!this.customParams) this.customParams = {};
    this.customParams[name] = value;
  }

  getParam(name: string): any {
    return this.customParams?.[name];
  }

  hasParam(name: string): boolean {
    return this.customParams ? name in this.customParams : false;
  }

  getParams(): Record<string, any> {
    return { ...this.customParams };
  }

  // Methods for working with files
  getFile(fieldName: string): UploadedFile | null {
    return this.files?.[fieldName] || null;
  }

  getFiles(): Record<string, UploadedFile> {
    return this.files || {};
  }

  hasFile(fieldName: string): boolean {
    return this.files ? fieldName in this.files : false;
  }

  getFileCount(): number {
    return Object.keys(this.files || {}).length;
  }

  // Methods for working with body
  getBodyAsForm(): Record<string, string> | null {
    if (typeof this.body === 'object' && this.body !== null && !('type' in this.body)) {
      return this.body as Record<string, string>;
    }
    return null;
  }

  getBodyAsJson(): Record<string, any> | null {
    if (typeof this.body === 'object' && this.body !== null && !('type' in this.body)) {
      return this.body as Record<string, any>;
    }
    return null;
  }

  getBodyAsText(): string | null {
    if (typeof this.body === 'string') {
      return this.body;
    }
    return null;
  }

  getBodyAsBinary(): BinaryData | null {
    if (typeof this.body === 'object' && this.body !== null && 'type' in this.body && this.body.type === 'binary') {
      return this.body as BinaryData;
    }
    return null;
  }

  isFormData(): boolean {
    return this.getBodyAsForm() !== null;
  }

  isJsonData(): boolean {
    return this.getBodyAsJson() !== null;
  }

  isTextData(): boolean {
    return this.getBodyAsText() !== null;
  }

  isBinaryData(): boolean {
    return this.getBodyAsBinary() !== null;
  }

  // Accept methods for content negotiation
  accepts(type: string): boolean {
    // Simple content type checking
    const acceptHeader = this.headers['accept'] || '';
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
  }

  acceptsCharsets(charset: string): boolean {
    const acceptCharsetHeader = this.headers['accept-charset'] || '';
    return acceptCharsetHeader.includes('*') || acceptCharsetHeader.includes(charset);
  }

  acceptsEncodings(encoding: string): boolean {
    const acceptEncodingHeader = this.headers['accept-encoding'] || '';
    return acceptEncodingHeader.includes('*') || acceptEncodingHeader.includes(encoding);
  }

  acceptsLanguages(language: string): boolean {
    const acceptLanguageHeader = this.headers['accept-language'] || '';
    return acceptLanguageHeader.includes('*') || acceptLanguageHeader.includes(language);
  }

  // Sleep function that can be cancelled
  async sleep(ms: number): Promise<void> {
    console.log(`⏰ Sleep called with ${ms}ms, abortController exists: ${!!this.abortController}`);
    
    // Check if already aborted
    if (this.abortController?.signal.aborted) {
      console.log(`🛑 Sleep already aborted, rejecting immediately`);
      throw new Error('Already aborted');
    }
    
    return new Promise<void>((resolve, reject) => {
      const id = setTimeout(resolve, ms);
      
      // Check periodically if aborted
      const checkInterval = setInterval(() => {
        if (this.abortController?.signal.aborted) {
          console.log(`🛑 Sleep aborted during execution after ${ms}ms`);
          clearTimeout(id);
          clearInterval(checkInterval);
          reject(new Error('Aborted'));
        }
      }, 100);
      
      this.abortController?.signal.addEventListener('abort', () => {
        console.log(`🛑 Sleep aborted via event listener after ${ms}ms`);
        clearTimeout(id);
        clearInterval(checkInterval);
        reject(new Error('Aborted'));
      });
    });
  }
}
