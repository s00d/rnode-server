// Express types for compatibility
import type {NextFunction, Request as ExpressRequest, Response as ExpressResponse} from 'express';

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

// Express middleware wrapper types
export interface ExpressMiddleware {
  (req: ExpressRequest, res: ExpressResponse, next: NextFunction): void;
}

export interface ExpressErrorMiddleware {
  (err: any, req: ExpressRequest, res: ExpressResponse, next: NextFunction): void;
}
