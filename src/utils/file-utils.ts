import { logger } from './logger';
import { StaticOptions, TemplateOptions } from '../types/app-router';

// The Rust addon.
import * as addon from '../load.cjs';


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

export function listFiles(folder: string): FileListResult {
  try {
    const result = addon.listFiles(folder);
    const parsedResult = JSON.parse(result);
    logger.debug(`📁 Files listed from folder: ${folder}`, parsedResult);
    return parsedResult;
  } catch (error) {
    logger.error('❌ Error listing files:', error instanceof Error ? error.message : String(error));
    return {
      success: false,
      error: `Failed to list files from ${folder}: ${error}`,
      files: [],
      total: 0
    };
  }
}

export function saveFile(filename: string, base64Data: string, uploadsDir: string): FileOperationResult {
  try {
    const result = addon.saveFile(filename, base64Data, uploadsDir);
    const parsedResult = JSON.parse(result);
    logger.debug(`💾 File saved: ${filename} in ${uploadsDir}`, parsedResult);
    return parsedResult;
  } catch (error) {
    logger.error('❌ Error saving file:', error instanceof Error ? error.message : String(error));
    return {
      success: false,
      error: `Failed to save file ${filename}: ${error}`,
      path: `${uploadsDir}/${filename}`
    };
  }
}

export function deleteFile(filename: string, uploadsDir: string): FileOperationResult {
  try {
    const result = addon.deleteFile(filename, uploadsDir);
    const parsedResult = JSON.parse(result);
    logger.debug(`🗑️ File deleted: ${filename} from ${uploadsDir}`, parsedResult);
    return parsedResult;
  } catch (error) {
    logger.error('❌ Error deleting file:', error instanceof Error ? error.message : String(error));
    return {
      success: false,
      error: `Failed to delete file ${filename}: ${error}`,
      path: `${uploadsDir}/${filename}`
    };
  }
}

export function getFileContent(filename: string, uploadsDir: string): FileContentResult {
  try {
    const result = addon.getFileContent(filename, uploadsDir);
    const parsedResult = JSON.parse(result);
    logger.debug(`📄 File content retrieved: ${filename} from ${uploadsDir}`, {
      ...parsedResult,
      content: parsedResult.content ? `${parsedResult.content.substring(0, 50)}...` : 'No content'
    });
    return parsedResult;
  } catch (error) {
    logger.error('❌ Error getting file content:', error instanceof Error ? error.message : String(error));
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

export function fileExists(filename: string, uploadsDir: string): boolean {
  try {
    const exists = addon.fileExists(filename, uploadsDir);
    logger.debug(`🔍 File exists check: ${filename} in ${uploadsDir} -> ${exists}`);
    return exists;
  } catch (error) {
    logger.error('❌ Error checking file existence:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

export function loadStaticFiles(pathOrPaths: string | string[], options?: StaticOptions): void {
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
      logger.debug(`Registered static files from: ${path} with secure options:`, JSON.stringify(defaultOptions));
    }
  } else {
    // Single path
    addon.loadStaticFiles(pathOrPaths, defaultOptions);
    logger.debug(`Registered static files from: ${pathOrPaths} with secure options:`, JSON.stringify(defaultOptions));
  }
}

export function initTemplates(pattern: string, options: TemplateOptions): string {
  try {
    // Call Rust addon to initialize templates
    const result = addon.initTemplates(pattern, options);
    logger.debug(`✅ Templates initialized with pattern: ${pattern}`);
    return result;
  } catch (error) {
    logger.error('❌ Error initializing templates:', error instanceof Error ? error.message : String(error));
    return `Template initialization error: ${error}`;
  }
}

export function renderTemplate(templateName: string, context: object): string {
  try {
    // Call Rust addon to render template
    return addon.renderTemplate(templateName, JSON.stringify(context));
  } catch (error) {
    logger.error('❌ Error rendering template:', error instanceof Error ? error.message : String(error));
    return `<!-- Template rendering error: ${templateName} -->`;
  }
}

export function clearStaticCache(): void {
  addon.clearStaticCache();
  logger.info('🗑️ Static files cache cleared', 'rnode_server::static');
}

export function getStaticStats(): string {
  return addon.getStaticStats();
}
