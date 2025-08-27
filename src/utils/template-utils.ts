import { logger } from './logger';
import { TemplateOptions } from '../types/app-router';

// The Rust addon.
import * as addon from '../load.cjs';

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
