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

// Types for template operations
export interface TemplateOptions {
  autoescape: boolean;
}
// Interface for static file settings
export interface StaticOptions {
  cache?: boolean;
  maxAge?: number;
  maxFileSize?: number;
  etag?: boolean;
  lastModified?: boolean;
  gzip?: boolean;
  brotli?: boolean;
  zstd?: boolean;
  lz4?: boolean;
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


export interface StaticOptions {
  cache?: boolean;
  maxAge?: number;
  maxFileSize?: number;
  etag?: boolean;
  lastModified?: boolean;
  gzip?: boolean;
  brotli?: boolean;
  zstd?: boolean;
  lz4?: boolean;
  allowHiddenFiles?: boolean;
  allowSystemFiles?: boolean;
  allowedExtensions?: string[];
  blockedPaths?: string[];
}