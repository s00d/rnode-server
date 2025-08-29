# File Operations Examples

## File Upload

### Basic Upload
```javascript
import { createApp } from 'rnode-server';

const app = createApp();

// Single file upload
app.upload('/upload', {
  folder: './uploads',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedExtensions: ['.png', '.jpg', '.pdf', '.txt'],
  multiple: false
});

app.post('/upload', (req, res) => {
  if (req.hasFile('document')) {
    const file = req.getFile('document');
    
    res.json({
      success: true,
      file: {
        name: file.filename,
        size: file.size,
        type: file.contentType
      }
    });
  } else {
    res.status(400).json({ error: 'No file uploaded' });
  }
});
```

### Multiple File Upload
```javascript
// Multiple file upload
app.upload('/upload-multiple', {
  folder: './uploads',
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedExtensions: ['.png', '.jpg', '.pdf', '.docx'],
  multiple: true,
  maxFiles: 10
});

app.post('/upload-multiple', (req, res) => {
  const files = req.getFiles();
  const fileCount = req.getFileCount();
  
  if (fileCount > 0) {
    res.json({
      success: true,
      files: files.map(file => ({
        name: file.filename,
        size: file.size,
        type: file.contentType
      })),
      count: fileCount
    });
  } else {
    res.status(400).json({ error: 'No files uploaded' });
  }
});
```

### Upload with Wildcard Routes
```javascript
// Upload to specific subfolder with wildcard support
app.upload('/upload/{*subfolder}', {
  folder: './uploads',
  allowedSubfolders: ['documents/*', 'images/*', 'files/*'],
  maxFileSize: 50 * 1024 * 1024,
  allowedExtensions: ['.png', '.jpg', '.pdf', '.txt'],
  multiple: true,
  maxFiles: 5
});

app.post('/upload/{*subfolder}', (req, res) => {
  const subfolder = req.params.subfolder;
  
  if (req.hasFile('document')) {
    const file = req.getFile('document');
    
    res.json({
      success: true,
      subfolder,
      file: {
        name: file.filename,
        size: file.size,
        type: file.contentType
      }
    });
  } else {
    res.status(400).json({ error: 'No file uploaded' });
  }
});
```

## File Download

### Basic Download
```javascript
// File download route
app.download('/download/{filename}', {
  folder: './uploads',
  maxFileSize: 100 * 1024 * 1024, // 100MB
  allowedExtensions: ['.png', '.jpg', '.pdf', '.txt', '.docx']
});

app.get('/download/{filename}', (req, res) => {
  const { filename } = req.params;
  
  if (app.fileExists(filename, './uploads')) {
    res.download(`./uploads/${filename}`);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});
```

### Secure Download
```javascript
app.download('/secure-download/{filename}', {
  folder: './secure-uploads',
  maxFileSize: 50 * 1024 * 1024,
  allowedExtensions: ['.pdf', '.docx'],
  blockedPaths: ['../', '..\\', '.git', '.env']
});

app.get('/secure-download/{filename}', (req, res) => {
  const { filename } = req.params;
  
  // Check authentication
  if (!req.getParam('isAuthenticated')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Check file exists
  if (!app.fileExists(filename, './secure-uploads')) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  // Log download
  console.log(`User ${req.getParam('userId')} downloaded ${filename}`);
  
  res.download(`./secure-uploads/${filename}`);
});
```

## File Management

### Save File
```javascript
app.post('/api/save-file', (req, res) => {
  if (req.isBinaryData()) {
    const binaryData = req.getBodyAsBinary();
    
    if (binaryData) {
      const filename = `file_${Date.now()}.bin`;
      const success = app.saveFile(filename, binaryData.data, './uploads');
      
      if (success) {
        res.json({
          success: true,
          filename,
          size: binaryData.size
        });
      } else {
        res.status(500).json({ error: 'Failed to save file' });
      }
    } else {
      res.status(400).json({ error: 'Invalid binary data' });
    }
  } else {
    res.status(400).json({ error: 'Binary data expected' });
  }
});
```

### List Files
```javascript
app.get('/api/files', (req, res) => {
  const files = app.listFiles('./uploads');
  
  res.json({
    success: true,
    files: files.map(filename => ({
      name: filename,
      exists: app.fileExists(filename, './uploads')
    }))
  });
});
```

### Delete File
```javascript
app.delete('/api/files/{filename}', (req, res) => {
  const { filename } = req.params;
  
  if (app.fileExists(filename, './uploads')) {
    const success = app.deleteFile(filename, './uploads');
    
    if (success) {
      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } else {
      res.status(500).json({ error: 'Failed to delete file' });
    }
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});
```

## Static File Serving

### Basic Static Files
```javascript
// Serve static files
app.static('./public');
```

### Advanced Static Configuration
```javascript
// Multiple directories with different settings
app.static(['./images', './icons'], {
  cache: true,
  maxAge: 86400,         // 24 hours
  maxFileSize: 10 * 1024 * 1024, // 10MB
  gzip: false,           // Images are already compressed
  brotli: false
});

app.static('./admin', {
  cache: true,
  maxAge: 1800, // 30 minutes
  maxFileSize: 5 * 1024 * 1024, // 5MB
  etag: true,
  lastModified: true,
  gzip: true,
  brotli: true,
  allowHiddenFiles: false,
  allowSystemFiles: false,
  allowedExtensions: ['html', 'css', 'js'],
  blockedPaths: ['.git', '.env', '.htaccess', 'thumbs.db']
});
```

### Static File Statistics
```javascript
app.get('/api/static-stats', (req, res) => {
  const stats = app.getStaticStats();
  
  res.json({
    success: true,
    stats
  });
});

app.post('/api/clear-static-cache', (req, res) => {
  app.clearStaticCache();
  
  res.json({
    success: true,
    message: 'Static file cache cleared'
  });
});
```
