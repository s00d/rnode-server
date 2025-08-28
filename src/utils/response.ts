import { UploadedFile, MultipartData } from '../types/request-response';
import { CookieUtils, CookieOptions } from './cookie-utils';

export class Response {
  private responseData: any = '';
  private responseContentType: string = 'text/plain';
  private responseStatus: number = 200;
  private responseHeaders: Record<string, string | string[]> = {};
  private cookies: string = '';

  constructor(cookies: string = '') {
    this.cookies = cookies;
  }

  // Properties for direct access
  get headers(): Record<string, string | string[]> {
    return this.responseHeaders;
  }

  get content(): string | Buffer {
    return this.responseData;
  }

  get contentType(): string {
    return this.responseContentType;
  }

  // Methods
  status(code: number): Response {
    this.responseStatus = code;
    return this;
  }

  get currentStatus() {
    return this.responseStatus;
  }

  setContentType(type: string): Response {
    this.responseContentType = type;
    return this;
  }

  json(data: any): Response {
    this.responseData = JSON.stringify(data);
    this.responseContentType = 'application/json';
    return this;
  }

  send(data: string | Buffer): Response {
    this.responseData = data;
    return this;
  }

  end(data?: string | Buffer): Response {
    if (data) {
      this.responseData = data;
    }
    return this;
  }

  // Async support - allows handlers to work asynchronously
  async(): Response {
    // Mark response as async - this will be handled specially
    this.responseData = { __async: true, __timestamp: Date.now() };
    return this;
  }

  setHeader(name: string, value: string): Response {
    this.responseHeaders[name] = value;
    return this;
  }

  getHeader(name: string): string | string[] | null {
    return this.responseHeaders[name] || null;
  }

  getCookie(name: string): string | null {
    return CookieUtils.getCookie(this.cookies || '', name);
  }

  getCookies(): Record<string, string> {
    // Return set cookies from responseHeaders
    const cookies: Record<string, string> = {};
    if (this.responseHeaders['Set-Cookie']) {
      const setCookies = Array.isArray(this.responseHeaders['Set-Cookie'])
          ? this.responseHeaders['Set-Cookie']
          : [this.responseHeaders['Set-Cookie']];

      setCookies.forEach((cookieStr: string) => {
        const parsedCookie = CookieUtils.parseSetCookie(cookieStr);
        if (parsedCookie) {
          cookies[parsedCookie.name] = parsedCookie.value;
        }
      });
    }
    return cookies;
  }

  getHeaders(): Record<string, string | string[]> {
    // Return set headers
    return this.responseHeaders;
  }

  setCookie(name: string, value: string, options: CookieOptions = {}): Response {
    const cookieString = CookieUtils.buildSetCookie(name, value, options);

    this.responseHeaders['Set-Cookie'] = this.responseHeaders['Set-Cookie'] || [];
    if (Array.isArray(this.responseHeaders['Set-Cookie'])) {
      this.responseHeaders['Set-Cookie'].push(cookieString);
    } else {
      this.responseHeaders['Set-Cookie'] = [this.responseHeaders['Set-Cookie'], cookieString];
    }
    return this;
  }

  // Additional cookie methods
  removeCookie(name: string, path?: string, domain?: string): Response {
    const cookieString = CookieUtils.removeCookie(name, path, domain);
    
    this.responseHeaders['Set-Cookie'] = this.responseHeaders['Set-Cookie'] || [];
    if (Array.isArray(this.responseHeaders['Set-Cookie'])) {
      this.responseHeaders['Set-Cookie'].push(cookieString);
    } else {
      this.responseHeaders['Set-Cookie'] = [this.responseHeaders['Set-Cookie'], cookieString];
    }
    return this;
  }

  clearCookies(): Response {
    // Get all cookies from headers and remove them
    if (this.responseHeaders['Set-Cookie']) {
      const setCookies = Array.isArray(this.responseHeaders['Set-Cookie'])
          ? this.responseHeaders['Set-Cookie']
          : [this.responseHeaders['Set-Cookie']];
      
      // Remove all cookies by setting them to expire
      setCookies.forEach((cookieStr: string) => {
        const parsedCookie = CookieUtils.parseSetCookie(cookieStr);
        if (parsedCookie) {
          this.removeCookie(parsedCookie.name, parsedCookie.options.path, parsedCookie.options.domain);
        }
      });
    }
    return this;
  }

  // Methods for working with files and forms
  sendFile(file: UploadedFile): Response {
    this.responseData = JSON.stringify(file);
    this.responseContentType = 'application/json';
    return this;
  }

  sendBuffer(buffer: Buffer, contentType: string = 'application/octet-stream', size?: number): Response {
    // For binary data use special format
    this.responseData = {
      type: 'binary',
      data: buffer.toString('base64'),
      contentType: contentType,
      contentLength: size || buffer.length
    };
    return this;
  }

  sendFiles(files: Record<string, UploadedFile>): Response {
    this.responseData = JSON.stringify(files);
    this.responseContentType = 'application/json';
    return this;
  }

  sendMultipart(data: MultipartData): Response {
    this.responseData = JSON.stringify(data);
    this.responseContentType = 'application/json';
    return this;
  }

  download(filepath: string, filename?: string): Response {
    // For download set headers for file download
    this.responseHeaders['Content-Disposition'] = `attachment; filename="${filename || filepath}"`;
    this.responseData = filepath; // File path for Rust
    this.responseContentType = 'application/octet-stream';
    return this;
  }

  attachment(filename?: string): Response {
    if (filename) {
      this.responseHeaders['Content-Disposition'] = `attachment; filename="${filename}"`;
    } else {
      this.responseHeaders['Content-Disposition'] = 'attachment';
    }
    return this;
  }

  // Methods for various content types
  html(content: string): Response {
    this.responseData = content;
    this.responseContentType = 'text/html';
    return this;
  }

  text(content: string): Response {
    this.responseData = content;
    this.responseContentType = 'text/plain';
    return this;
  }

  xml(content: string): Response {
    this.responseData = content;
    this.responseContentType = 'application/xml';
    return this;
  }

  redirect(url: string, status = 302): Response {
    this.responseHeaders['Location'] = url;
    this.responseData = `Redirecting to ${url}`;
    this.responseContentType = 'text/plain';
    this.status(status);
    return this;
  }
}
