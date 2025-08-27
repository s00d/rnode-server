// Cookie utilities for parsing, setting, and managing cookies

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  maxAge?: number;
  expires?: Date;
  path?: string;
  domain?: string;
}

export interface ParsedCookie {
  name: string;
  value: string;
  options: CookieOptions;
}

export class CookieUtils {
  /**
   * Parse cookie string into object
   */
  static parseCookies(cookieString: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    
    if (!cookieString) return cookies;
    
    cookieString.split(';').forEach((cookie: string) => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
    });
    
    return cookies;
  }

  /**
   * Parse Set-Cookie header into structured object
   */
  static parseSetCookie(setCookieString: string): ParsedCookie | null {
    if (!setCookieString) return null;
    
    const parts = setCookieString.split(';');
    if (parts.length === 0) return null;
    
    const [nameValue] = parts;
    if (!nameValue) return null;
    
    const [name, value] = nameValue.split('=');
    if (!name || !value) return null;
    
    const options: CookieOptions = {};
    
    // Parse options
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i].trim().toLowerCase();
      
      if (part === 'httponly') {
        options.httpOnly = true;
      } else if (part === 'secure') {
        options.secure = true;
      } else if (part.startsWith('samesite=')) {
        const sameSite = part.split('=')[1];
        if (sameSite === 'strict' || sameSite === 'lax' || sameSite === 'none') {
          options.sameSite = sameSite.charAt(0).toUpperCase() + sameSite.slice(1) as 'Strict' | 'Lax' | 'None';
        }
      } else if (part.startsWith('max-age=')) {
        const maxAge = part.split('=')[1];
        if (maxAge) {
          options.maxAge = parseInt(maxAge, 10);
        }
      } else if (part.startsWith('expires=')) {
        const expires = part.split('=')[1];
        if (expires) {
          options.expires = new Date(expires);
        }
      } else if (part.startsWith('path=')) {
        const path = part.split('=')[1];
        if (path) {
          options.path = path;
        }
      } else if (part.startsWith('domain=')) {
        const domain = part.split('=')[1];
        if (domain) {
          options.domain = domain;
        }
      }
    }
    
    return {
      name: decodeURIComponent(name),
      value: decodeURIComponent(value),
      options
    };
  }

  /**
   * Build Set-Cookie string from cookie data
   */
  static buildSetCookie(name: string, value: string, options: CookieOptions = {}): string {
    let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
    
    if (options.httpOnly) cookieString += '; HttpOnly';
    if (options.secure) cookieString += '; Secure';
    if (options.sameSite) cookieString += `; SameSite=${options.sameSite}`;
    if (options.maxAge) cookieString += `; Max-Age=${options.maxAge}`;
    if (options.expires) cookieString += `; Expires=${options.expires.toUTCString()}`;
    if (options.path) cookieString += `; Path=${options.path}`;
    if (options.domain) cookieString += `; Domain=${options.domain}`;
    
    return cookieString;
  }

  /**
   * Get cookie value by name from cookie string
   */
  static getCookie(cookieString: string, name: string): string | null {
    const cookies = this.parseCookies(cookieString);
    return cookies[name] || null;
  }

  /**
   * Check if cookie exists in cookie string
   */
  static hasCookie(cookieString: string, name: string): boolean {
    return this.getCookie(cookieString, name) !== null;
  }

  /**
   * Remove cookie by setting it to expire in the past
   */
  static removeCookie(name: string, path?: string, domain?: string): string {
    const options: CookieOptions = {
      maxAge: -1,
      expires: new Date(0)
    };
    
    if (path) options.path = path;
    if (domain) options.domain = domain;
    
    return this.buildSetCookie(name, '', options);
  }

  /**
   * Parse multiple Set-Cookie headers
   */
  static parseSetCookies(setCookieHeaders: string[]): ParsedCookie[] {
    return setCookieHeaders
      .map(header => this.parseSetCookie(header))
      .filter((cookie): cookie is ParsedCookie => cookie !== null);
  }

  /**
   * Validate cookie options
   */
  static validateCookieOptions(options: CookieOptions): string[] {
    const errors: string[] = [];
    
    if (options.maxAge !== undefined && options.maxAge < 0) {
      errors.push('maxAge must be non-negative');
    }
    
    if (options.sameSite === 'None' && !options.secure) {
      errors.push('SameSite=None requires Secure flag');
    }
    
    if (options.expires && options.maxAge) {
      errors.push('Cannot set both expires and maxAge');
    }
    
    return errors;
  }

  /**
   * Get cookie expiration date
   */
  static getCookieExpiration(options: CookieOptions): Date | null {
    if (options.expires) {
      return options.expires;
    }
    
    if (options.maxAge) {
      return new Date(Date.now() + options.maxAge * 1000);
    }
    
    return null;
  }

  /**
   * Check if cookie is expired
   */
  static isCookieExpired(cookie: ParsedCookie): boolean {
    const expiration = this.getCookieExpiration(cookie.options);
    return expiration ? expiration < new Date() : false;
  }

  /**
   * Clone cookie with new options
   */
  static cloneCookie(cookie: ParsedCookie, newOptions: Partial<CookieOptions>): ParsedCookie {
    return {
      name: cookie.name,
      value: cookie.value,
      options: { ...cookie.options, ...newOptions }
    };
  }
}
