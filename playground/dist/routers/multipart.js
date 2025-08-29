"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.multipartRouter = void 0;
const rnode_server_1 = require("rnode-server");
const node_console_1 = __importDefault(require("node:console"));
exports.multipartRouter = (0, rnode_server_1.Router)();
// Static files for web interface
exports.multipartRouter.static('./upload-demo', {
    cache: true,
    maxAge: 3600,
    etag: true,
    lastModified: true,
    gzip: true,
    brotli: true
});
// Folder for saving uploaded files (example)
exports.multipartRouter.static('./uploads', {
    cache: false, // Don't cache uploaded files
    maxAge: 0,
    maxFileSize: 50 * 1024 * 1024, // 50MB for uploaded files
    allowHiddenFiles: false,
    allowedExtensions: ['jpg', 'png', 'gif', 'pdf', 'txt', 'docx'],
    blockedPaths: ['.git', '.env', 'node_modules']
});
// Route for main page with upload form
exports.multipartRouter.get('/', (req, res) => {
    try {
        const path = require('path');
        const uploadsDir = path.join(__dirname, '../../uploads');
        let filesList = '';
        let totalFiles = 0;
        // Use Rust method to get file list with subfolders
        try {
            const listResult = exports.multipartRouter.listFiles(uploadsDir);
            if (listResult.success) {
                let allFiles = [];
                // Add all files with folder identification
                if (listResult.files && listResult.files.length > 0) {
                    allFiles.push(...listResult.files.map(file => {
                        let folder = 'Root folder';
                        if (file.relative_path.includes('/')) {
                            const pathParts = file.relative_path.split('/');
                            if (pathParts.length >= 2) {
                                // Show full folder path (e.g., "documents/2024/january")
                                folder = pathParts.slice(0, -1).join('/');
                            }
                            else {
                                folder = pathParts[0];
                            }
                        }
                        return { ...file, folder };
                    }));
                }
                if (allFiles.length > 0) {
                    const files = allFiles.map((file) => {
                        const fileSize = (file.size / 1024).toFixed(2); // KB
                        const createdDate = new Date(parseInt(file.created)).toLocaleString('ru-RU');
                        const modifiedDate = new Date(parseInt(file.modified)).toLocaleString('ru-RU');
                        const folderInfo = file.folder !== 'Root folder' ? `<span class="file-folder">📁 ${file.folder}</span>` : '';
                        return `
              <div class="file-item">
                <div class="file-info">
                  <span class="file-name">${file.name}</span>
                  ${folderInfo}
                  <span class="file-size">${fileSize} KB</span>
                  <span class="file-date">Created: ${createdDate}</span>
                  <span class="file-date">Modified: ${modifiedDate}</span>
                  <span class="file-mime">${file.mime_type}</span>
                </div>
                <div class="file-actions">
                  <a href="/download/${file.relative_path}" class="download-btn" download>📥 Download</a>
                  <button class="delete-btn" onclick="deleteFile('${file.relative_path}')">🗑️ Delete</button>
                </div>
              </div>
            `;
                    });
                    totalFiles = allFiles.length;
                    filesList = files.join('');
                }
            }
        }
        catch (rustError) {
            node_console_1.default.error('❌ Error getting files via Rust:', rustError);
            // Fallback to empty list
        }
        res.html(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Multipart Upload Demo</title>
        <link rel="stylesheet" href="/styles.css">
      </head>
      <body>
        <div class="container">
          <h1>RNode Server - File Upload Demo</h1>
          
          <div class="upload-section">
            <h2>Single File Upload</h2>
            <p class="upload-info">💡 Now uses wildcard path for better SEO!</p>
            <form id="singleUpload" enctype="multipart/form-data">
              <input type="file" name="avatar" accept="image/*" required>
              <input type="text" name="description" placeholder="File description">
              <select id="singleSubfolder" required>
                <option value="">Select folder</option>
                <option value="documents">📁 Documents</option>
                <option value="documents/2024">📁 Documents/2024</option>
                <option value="documents/2024/january">📁 Documents/2024/January</option>
                <option value="images">🖼️ Images</option>
                <option value="images/thumbnails">🖼️ Images/Thumbnails</option>
                <option value="files">📄 Files</option>
                <option value="files/archives">📄 Files/Archives</option>
              </select>
              <button type="submit">Upload File</button>
            </form>
          </div>
          
          <div class="upload-section">
            <h2>Multiple Files Upload</h2>
            <p class="upload-info">💡 Now uses wildcard path for better SEO!</p>
            <form id="multipleUpload" enctype="multipart/form-data">
              <input type="file" name="documents" multiple accept=".pdf,.txt,.docx">
              <input type="text" name="category" placeholder="File category">
              <select id="multipleSubfolder" required>
                <option value="">Select folder</option>
                <option value="documents">📁 Documents</option>
                <option value="documents/2024">📁 Documents/2024</option>
                <option value="documents/2024/january">📁 Documents/2024/January</option>
                <option value="images">🖼️ Images</option>
                <option value="images/thumbnails">🖼️ Images/Thumbnails</option>
                <option value="files">📄 Files</option>
                <option value="files/archives">📄 Files/Archives</option>
              </select>
              <button type="submit">Upload Files</button>
            </form>
          </div>
          
          <div class="files-section">
            <h2>Uploaded Files (${totalFiles})</h2>
            ${totalFiles > 0 ?
            `<div class="files-list">${filesList}</div>` :
            '<p class="no-files">No files uploaded yet</p>'}
            <button onclick="refreshFiles()" class="refresh-btn">🔄 Refresh List</button>
          </div>
          
          <div id="results"></div>
        </div>
        
        <script src="/upload.js"></script>
        <script>
          function deleteFile(filepath) {
            if (confirm('Delete file "' + filepath + '"?')) {
              // Encode path for safe URL transmission
              const encodedPath = encodeURIComponent(filepath);
              fetch('/multipart/delete/' + encodedPath, { method: 'DELETE' })
                .then(response => response.json())
                .then(data => {
                  if (data.success) {
                    location.reload();
                  } else {
                    alert('Delete error: ' + data.error);
                  }
                })
                .catch(error => {
                  alert('Error: ' + error);
                });
            }
          }
          
          function refreshFiles() {
            location.reload();
          }
        </script>
      </body>
      </html>
    `);
    }
    catch (error) {
        node_console_1.default.error('❌ Error loading main page:', error);
        res.status(500).html('<h1>Server Error</h1><p>Failed to load page</p>');
    }
});
// API for deleting file (supports subfolders)
exports.multipartRouter.delete('/delete/{*filepath}', (req, res) => {
    // Get full file path from URL and decode it
    let filepath = req.params.filepath;
    // Decode URL-encoded parameter
    try {
        filepath = decodeURIComponent(filepath);
    }
    catch (error) {
        node_console_1.default.error('❌ URL decoding error:', error);
        res.status(400).json({
            success: false,
            error: 'Invalid URL encoding'
        });
        return;
    }
    node_console_1.default.log(`🔍 Attempting to delete file: ${filepath}`);
    const path = require('path');
    const uploadsDir = path.join(__dirname, '../../uploads');
    try {
        // Use Rust method to delete file
        const deleteResult = exports.multipartRouter.deleteFile(filepath, uploadsDir);
        if (deleteResult.success) {
            node_console_1.default.log(`🗑️ File deleted via Rust: ${filepath}`);
            res.json({
                success: true,
                message: deleteResult.message
            });
        }
        else {
            node_console_1.default.log(`❌ File not found for deletion: ${filepath}`);
            res.status(404).json({
                success: false,
                error: deleteResult.error
            });
        }
    }
    catch (error) {
        node_console_1.default.error(`❌ File deletion error ${filepath}:`, error);
        res.status(500).json({
            success: false,
            error: 'File deletion error'
        });
    }
});
// API for getting list of uploaded files
exports.multipartRouter.get('/files', (req, res) => {
    try {
        const path = require('path');
        const uploadsDir = path.join(__dirname, '../../uploads');
        // Use Rust method to get file list
        const listResult = exports.multipartRouter.listFiles(uploadsDir);
        if (listResult.success) {
            res.json(listResult);
        }
        else {
            res.status(500).json({
                success: false,
                error: listResult.error
            });
        }
    }
    catch (error) {
        node_console_1.default.error('❌ Error getting file list:', error);
        res.status(500).json({
            success: false,
            error: 'Error getting file list'
        });
    }
});
// Testing different response types
exports.multipartRouter.get('/demo/html', (req, res) => {
    res.html('<h1>HTML Response</h1><p>This is HTML content from server</p>');
});
exports.multipartRouter.get('/demo/text', (req, res) => {
    res.text('This is a simple text response from server');
});
exports.multipartRouter.get('/demo/xml', (req, res) => {
    res.xml('<?xml version="1.0"?><response><message>XML Response</message></response>');
});
exports.multipartRouter.get('/demo/redirect', (req, res) => {
    res.redirect('/', 301);
});
exports.multipartRouter.get('/demo/download', (req, res) => {
    // Example file download (in real app file should exist)
    res.download('./upload-demo/sample.txt', 'downloaded_file.txt');
});
// API information
exports.multipartRouter.get('/api/info', (req, res) => {
    res.json({
        server: 'RNode Server',
        version: '1.0.0',
        features: [
            'Multipart file upload',
            'Multiple file upload',
            'Base64 file encoding',
            'Various response types',
            'Static file serving'
        ],
        endpoints: {
            'POST /upload': 'Single file upload',
            'POST /upload-multiple': 'Multiple file upload',
            'GET /download/:filename': 'Download uploaded file',
            'DELETE /delete/:filename': 'Delete uploaded file',
            'GET /files': 'List uploaded files',
            'GET /multipart/demo/*': 'Response type demonstrations',
            'GET /multipart/api/info': 'This endpoint'
        }
    });
});
