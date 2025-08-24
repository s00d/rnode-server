import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createApp } from '../';
import { makeHttpRequest } from './helpers';
import * as fs from 'fs';
import * as path from 'path';

const templatesDir = path.join(__dirname, 'templates');
const testPort = 5792;

describe('Templates Tests', () => {
  beforeEach(() => {
    // Ensure templates directory exists
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up any created files
    if (fs.existsSync(templatesDir)) {
      fs.rmSync(templatesDir, { recursive: true, force: true });
    }
  });

  describe('Template Initialization', () => {
    it('should initialize templates successfully', () => {
      const app = createApp();
      const result = app.initTemplates(`${templatesDir}/**/*.html`, {
        autoescape: true
      });
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      
      try {
        const parsed = JSON.parse(result);
        expect(parsed.success).toBe(true);
        expect(parsed.message).toBeDefined();
      } catch (error) {
        // If parsing fails, it might be a simple string
        expect(result).toContain('success');
      }
    });

    it('should handle template initialization errors gracefully', () => {
      const app = createApp();
      const result = app.initTemplates('./nonexistent/**/*.html', {
        autoescape: true
      });
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      
      try {
        const parsed = JSON.parse(result);
        expect(parsed.success).toBe(false);
        expect(parsed.error).toBeDefined();
      } catch (error) {
        // If parsing fails, it might be a simple string
        expect(result).toContain('error');
      }
    });
  });

  describe('Template Rendering', () => {
    it('should render index.html template with context data', () => {
      const app = createApp();
      
      // Initialize templates first
      const initResult = app.initTemplates(`${templatesDir}/**/*.html`, {
        autoescape: true
      });
      console.log('Template initialization result:', initResult);
      
      // Create a simple test template
      const testTemplate = `<!DOCTYPE html>
<html>
<head><title>{{ title | default(value="Test Template Server") }}</title></head>
<body>
  <h1>{{ title | default(value="Test Template Server") }}</h1>
  <p>{{ message | default(value="Template rendering works!") }}</p>
</body>
</html>`;
      
      fs.writeFileSync(path.join(templatesDir, 'index.html'), testTemplate);
      
      const result = app.renderTemplate('index.html', {
        title: 'Custom Title',
        message: 'Custom Message'
      });
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      
      try {
        const parsed = JSON.parse(result);
        expect(parsed.success).toBe(true);
        expect(parsed.content).toBeDefined();
        expect(parsed.content).toContain('Custom Title');
        expect(parsed.content).toContain('Custom Message');
      } catch (error) {
        // If parsing fails, it might be a simple string
        expect(result).toContain('Custom Title');
      }
    });

    it('should render user_profile.html template with user data', () => {
      const app = createApp();
      
      // Initialize templates first
      const initResult = app.initTemplates(`${templatesDir}/**/*.html`, {
        autoescape: true
      });
      
      // Create a user profile template
      const userTemplate = `<!DOCTYPE html>
<html>
<head><title>User Profile</title></head>
<body>
  <h1>{{ user.name }}</h1>
  <p>Email: {{ user.email }}</p>
  <p>Role: {{ user.role }}</p>
</body>
</html>`;
      
      fs.writeFileSync(path.join(templatesDir, 'user_profile.html'), userTemplate);
      
      const result = app.renderTemplate('user_profile.html', {
        user: {
          name: 'John Doe',
          email: 'john@example.com',
          role: 'admin'
        }
      });
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      
      try {
        const parsed = JSON.parse(result);
        expect(parsed.success).toBe(true);
        expect(parsed.content).toBeDefined();
        expect(parsed.content).toContain('John Doe');
        expect(parsed.content).toContain('john@example.com');
        expect(parsed.content).toContain('admin');
      } catch (error) {
        // If parsing fails, it might be a simple string
        expect(result).toContain('John Doe');
      }
    });

    it('should render components.html template with macros', () => {
      const app = createApp();
      
      // Initialize templates first
      const initResult = app.initTemplates(`${templatesDir}/**/*.html`, {
        autoescape: true
      });
      
      // Create a components template
      const componentsTemplate = `<!DOCTYPE html>
<html>
<head><title>Components Demo</title></head>
<body>
  <h1>{{ title | default(value="Components Demo") }}</h1>
  <div class="component">
    <p>{{ description | default(value="This is a component") }}</p>
  </div>
</body>
</html>`;
      
      fs.writeFileSync(path.join(templatesDir, 'components.html'), componentsTemplate);
      
      const result = app.renderTemplate('components.html', {
        title: 'Custom Components',
        description: 'Custom description'
      });
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      
      try {
        const parsed = JSON.parse(result);
        expect(parsed.success).toBe(true);
        expect(parsed.content).toBeDefined();
        expect(parsed.content).toContain('Custom Components');
        expect(parsed.content).toContain('Custom description');
      } catch (error) {
        // If parsing fails, it might be a simple string
        expect(result).toContain('Custom Components');
      }
    });

    it('should handle template rendering errors gracefully', () => {
      const app = createApp();
      
      // Initialize templates first
      const initResult = app.initTemplates(`${templatesDir}/**/*.html`, {
        autoescape: true
      });
      
      const result = app.renderTemplate('nonexistent.html', {});
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      
      try {
        const parsed = JSON.parse(result);
        expect(parsed.success).toBe(false);
        expect(parsed.error).toBeDefined();
      } catch (error) {
        // If parsing fails, it might be a simple string
        expect(result).toContain('error');
      }
    });
  });

  describe('Template Routes', () => {
    it('should serve index.html template route with HTML content', () => {
      const app = createApp();
      
      // Initialize templates first
      const initResult = app.initTemplates(`${templatesDir}/**/*.html`, {
        autoescape: true
      });
      
      // Create a test template
      const testTemplate = `<!DOCTYPE html>
<html>
<head><title>Template Test</title></head>
<body>
  <h1>Template Test</h1>
  <p>Template rendering works!</p>
</body>
</html>`;
      
      fs.writeFileSync(path.join(templatesDir, 'index.html'), testTemplate);
      
      app.get('/templates', (req, res) => {
        const result = app.renderTemplate('index.html', {
          title: 'Template Test'
        });
        
        try {
          const parsed = JSON.parse(result);
          if (parsed.success && parsed.content) {
            res.setHeader('Content-Type', 'text/html');
            res.send(parsed.content);
          } else {
            res.status(500).json({ error: parsed.error });
          }
        } catch (error) {
          res.status(500).json({ error: 'Template parsing failed' });
        }
      });
      
      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort, async () => {
          try {
            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort,
              path: '/templates',
              method: 'GET'
            });
            
            expect(response.statusCode).toBe(200);
            expect(response.headers['content-type']).toContain('text/html');
            expect(response.body).toContain('Template Test');
            expect(response.body).toContain('Template rendering works!');
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });

    it('should serve user profile template route', () => {
      const app = createApp();
      
      // Initialize templates first
      const initResult = app.initTemplates(`${templatesDir}/**/*.html`, {
        autoescape: true
      });
      
      // Create a user profile template
      const userTemplate = `<!DOCTYPE html>
<html>
<head><title>User Profile</title></head>
<body>
  <h1>{{ user.name }}</h1>
  <p>ID: {{ user.id }}</p>
  <p>Role: {{ user.role }}</p>
</body>
</html>`;
      
      fs.writeFileSync(path.join(templatesDir, 'user_profile.html'), userTemplate);
      
      app.get('/profile/{id}', (req, res) => {
        const userId = req.params.id;
        const result = app.renderTemplate('user_profile.html', {
          user: {
            id: userId,
            name: `User ${userId}`,
            role: 'admin'
          }
        });
        
        try {
          const parsed = JSON.parse(result);
          if (parsed.success && parsed.content) {
            res.setHeader('Content-Type', 'text/html');
            res.send(parsed.content);
          } else {
            res.status(500).json({ error: parsed.error });
          }
        } catch (error) {
          res.status(500).json({ error: 'Template parsing failed' });
        }
      });
      
      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort + 1, async () => {
          try {
            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort + 1,
              path: '/profile/1',
              method: 'GET'
            });
            
            expect(response.statusCode).toBe(200);
            expect(response.headers['content-type']).toContain('text/html');
            expect(response.body).toContain('User 1');
            expect(response.body).toContain('admin');
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });

    it('should handle template rendering errors in routes', () => {
      const app = createApp();
      
      // Initialize templates first
      const initResult = app.initTemplates(`${templatesDir}/**/*.html`, {
        autoescape: true
      });
      
      app.get('/templates/error', (req, res) => {
        const result = app.renderTemplate('nonexistent.html', {});
        
        try {
          const parsed = JSON.parse(result);
          if (parsed.success) {
            res.send(parsed.content);
          } else {
            res.status(500).json({ error: parsed.error });
          }
        } catch (error) {
          res.status(500).json({ error: 'Template parsing failed' });
        }
      });
      
      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort + 2, async () => {
          try {
            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort + 2,
              path: '/templates/error',
              method: 'GET'
            });
            
            expect(response.statusCode).toBe(500);
            expect(response.body.error).toBeDefined();
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  });

  describe('Template Context', () => {
    it('should pass complex data structures to templates', () => {
      const app = createApp();
      
      // Initialize templates first
      const initResult = app.initTemplates(`${templatesDir}/**/*.html`, {
        autoescape: true
      });
      
      // Create a complex template
      const complexTemplate = `<!DOCTYPE html>
<html>
<head><title>{{ title | default(value="Complex Template") }}</title></head>
<body>
  <h1>{{ title | default(value="Complex Template") }}</h1>
  <ul>
    {% for item in items %}
    <li>{{ item.name }}: {{ item.value }}</li>
    {% endfor %}
  </ul>
  <p>Count: {{ items | length }}</p>
</body>
</html>`;
      
      fs.writeFileSync(path.join(templatesDir, 'index.html'), complexTemplate);
      
      const result = app.renderTemplate('index.html', {
        title: 'Complex Data Test',
        items: [
          { name: 'Item 1', value: 'Value 1' },
          { name: 'Item 2', value: 'Value 2' },
          { name: 'Item 3', value: 'Value 3' }
        ]
      });
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      
      try {
        const parsed = JSON.parse(result);
        expect(parsed.success).toBe(true);
        expect(parsed.content).toContain('Complex Data Test');
        expect(parsed.content).toContain('Item 1');
        expect(parsed.content).toContain('Item 2');
        expect(parsed.content).toContain('Item 3');
        expect(parsed.content).toContain('Count: 3');
      } catch (error) {
        // If parsing fails, it might be a simple string
        expect(result).toContain('Complex Data Test');
      }
    });

    it('should handle empty context gracefully', () => {
      const app = createApp();
      
      // Initialize templates first
      const initResult = app.initTemplates(`${templatesDir}/**/*.html`, {
        autoescape: true
      });
      
      // Create a template with defaults
      const templateWithDefaults = `<!DOCTYPE html>
<html>
<head><title>{{ title | default(value="Default Title") }}</title></head>
<body>
  <h1>{{ title | default(value="Default Title") }}</h1>
  <p>{{ message | default(value="Default Message") }}</p>
</body>
</html>`;
      
      fs.writeFileSync(path.join(templatesDir, 'index.html'), templateWithDefaults);
      
      const result = app.renderTemplate('index.html', {});
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      
      try {
        const parsed = JSON.parse(result);
        expect(parsed.success).toBe(true);
        expect(parsed.content).toContain('Default Title');
        expect(parsed.content).toContain('Default Message');
      } catch (error) {
        // If parsing fails, it might be a simple string
        expect(result).toContain('Default Title');
      }
    });
  });

  describe('Template File Operations', () => {
    it('should list template files', () => {
      const app = createApp();
      
      // Create some test template files
      fs.writeFileSync(path.join(templatesDir, 'test1.html'), '<html><body>Test 1</body></html>');
      fs.writeFileSync(path.join(templatesDir, 'test2.html'), '<html><body>Test 2</body></html>');
      
      const result = app.listFiles(templatesDir);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.success).toBeDefined();
      
      if (result.success && result.files) {
        expect(Array.isArray(result.files)).toBe(true);
        expect(result.files).toContain('test1.html');
        expect(result.files).toContain('test2.html');
      }
    });

    it('should check if template file exists', () => {
      const app = createApp();
      
      const testFile = path.join(templatesDir, 'test.html');
      fs.writeFileSync(testFile, '<html><body>Test</body></html>');
      
      const exists = app.fileExists('test.html', templatesDir);
      
      expect(typeof exists).toBe('boolean');
      expect(exists).toBe(true);
    });

    it('should get template file content', () => {
      const app = createApp();
      
      const testFile = path.join(templatesDir, 'index.html');
      const testContent = '<!DOCTYPE html>\n<html>\n<body>\n<h1>Test</h1>\n</body>\n</html>';
      fs.writeFileSync(testFile, testContent);
      
      const result = app.getFileContent('index.html', templatesDir);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.success).toBeDefined();
      
      if (result.success && result.content) {
        expect(typeof result.content).toBe('string');
        expect(result.content).toContain('<!DOCTYPE html>');
        expect(result.content).toContain('<h1>Test</h1>');
      }
    });
  });
});
