import { Request } from './request';
import { Response } from './response';
import { UploadedFile } from '../types/request-response';

export function createRequestObject(requestData: any): Request {
  return new Request(requestData);
}

export function createResponseObject(cookies: string = ''): Response {
  return new Response(cookies);
}
