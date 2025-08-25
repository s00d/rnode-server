import { createApp, type Request, type Response } from 'rnode-server';
import { apiRouter } from './routers/api';
import { commonRouter } from './routers/common';
import { usersRouter } from './routers/users';
import { authApiRouter } from './routers/auth_api';
import { templatesRouter } from './routers/templates';
import { staticRouter } from './routers/static';
import { multipartRouter } from './routers/multipart';
import { corsRouter } from './routers/cors';
import * as path from 'path';

const httpPort = 4599;
const httpsPort = 4600;

// SSL configuration
const sslConfig = {
  certPath: path.join(__dirname, '../ssl/server.crt'),
  keyPath: path.join(__dirname, '../ssl/server.key')
};

// Create HTTP server
const httpApp = createApp({ logLevel: 'debug' });
httpApp.useRouter('/', commonRouter);
httpApp.useRouter('/api/users', usersRouter);
httpApp.useRouter('/api/auth', authApiRouter);
httpApp.useRouter('/api', apiRouter);
httpApp.useRouter('/templates', templatesRouter);
httpApp.useRouter('/static', staticRouter);
httpApp.useRouter('/multipart', multipartRouter);
httpApp.useRouter('/cors', corsRouter);
httpApp.static('./public');

httpApp.use((req, res, next) => {
  console.log('🔐 Router Middleware:', req.method, req.url);
  next();
});

// Add file upload to HTTP server
httpApp.upload('/upload', {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ['image/*', 'application/pdf'],
  folder: './uploads'
});


// Register route for downloading files (supports subfolders)
httpApp.download('/download/{*name}', {
  folder: './uploads',
  maxFileSize: 100 * 1024 * 1024, // 100 MB
  allowedExtensions: ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.txt', '.docx'],
  allowHiddenFiles: false,
  allowSystemFiles: false
});

// Route for uploading files to root folder
httpApp.upload('/upload', {
  folder: './uploads',
  allowedSubfolders: ['documents/*', 'images/*', 'files/*'], // Allowed subfolders with wildcard
  maxFileSize: 50 * 1024 * 1024, // 50 MB
  allowedExtensions: ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.txt', '.docx'],
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  multiple: false,
  overwrite: true
});

// Route for uploading files to any subfolder (wildcard)
httpApp.upload('/upload/{*subfolder}', {
  folder: './uploads',
  allowedSubfolders: ['*'], // Allow any subfolder
  maxFileSize: 50 * 1024 * 1024, // 50 MB
  allowedExtensions: ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.txt', '.docx'],
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  multiple: false,
  overwrite: true
});

// Route for multiple file upload to root folder
httpApp.upload('/upload-multiple', {
  folder: './uploads',
  allowedSubfolders: ['documents/*', 'images/*', 'files/*'], // Allowed subfolders with wildcard
  maxFileSize: 50 * 1024 * 1024, // 50 MB
  allowedExtensions: ['.png', '.jpg', '.jpeg', '.gif'],
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif'],
  multiple: true,
  maxFiles: 10,
  overwrite: true
});

// Route for multiple file upload to any subfolder (wildcard)
httpApp.upload('/upload-multiple/{*subfolder}', {
  folder: './uploads',
  allowedSubfolders: ['*'], // Allow any subfolder
  maxFileSize: 50 * 1024 * 1024, // 50 MB
  allowedExtensions: ['.png', '.jpg', '.jpeg', '.gif'],
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif'],
  multiple: true,
  maxFiles: 10,
  overwrite: true
});

httpApp.get('/hello', (req: Request, res: Response) => {
  res.json({
    message: 'Hello from RNode server!',
    timestamp: new Date().toISOString()
  });
});

// Start HTTP server
httpApp.listen(httpPort, () => {
  console.log(`🌐 HTTP server started on port ${httpPort}`);
  console.log(`📝 Available routes:`);

});

// Create HTTPS server (only if certificates exist)
let httpsApp = createApp({ ssl: sslConfig });
httpsApp.useRouter('/', commonRouter);
httpsApp.useRouter('/api/users', usersRouter);
httpsApp.useRouter('/api/auth', authApiRouter);
httpsApp.useRouter('/api', apiRouter);
httpsApp.useRouter('/templates', templatesRouter);
httpsApp.useRouter('/static', staticRouter);
httpsApp.useRouter('/multipart', multipartRouter);
httpsApp.useRouter('/cors', corsRouter);
httpsApp.static('./public');

httpsApp.use((req, res, next) => {
  console.log('🔐 Router Middleware:', req.method, req.url);
  next();
});

// Add file upload to HTTPS server
httpsApp.upload('/upload', {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ['image/*', 'application/pdf'],
  folder: './uploads'
});



// Register route for downloading files (supports subfolders)
httpsApp.download('/download/{*name}', {
  folder: './uploads',
  maxFileSize: 100 * 1024 * 1024, // 100 MB
  allowedExtensions: ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.txt', '.docx'],
  allowHiddenFiles: false,
  allowSystemFiles: false
});

// Route for uploading files to root folder
httpsApp.upload('/upload', {
  folder: './uploads',
  allowedSubfolders: ['documents/*', 'images/*', 'files/*'], // Allowed subfolders with wildcard
  maxFileSize: 50 * 1024 * 1024, // 50 MB
  allowedExtensions: ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.txt', '.docx'],
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  multiple: false,
  overwrite: true
});

// Route for uploading files to any subfolder (wildcard)
httpsApp.upload('/upload/{*subfolder}', {
  folder: './uploads',
  allowedSubfolders: ['*'], // Allow any subfolder
  maxFileSize: 50 * 1024 * 1024, // 50 MB
  allowedExtensions: ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.txt', '.docx'],
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  multiple: false,
  overwrite: true
});

// Route for multiple file upload to root folder
httpsApp.upload('/upload-multiple', {
  folder: './uploads',
  allowedSubfolders: ['documents/*', 'images/*', 'files/*'], // Allowed subfolders with wildcard
  maxFileSize: 50 * 1024 * 1024, // 50 MB
  allowedExtensions: ['.png', '.jpg', '.jpeg', '.gif'],
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif'],
  multiple: true,
  maxFiles: 10,
  overwrite: true
});

// Route for multiple file upload to any subfolder (wildcard)
httpsApp.upload('/upload-multiple/{*subfolder}', {
  folder: './uploads',
  allowedSubfolders: ['*'], // Allow any subfolder
  maxFileSize: 50 * 1024 * 1024, // 50 MB
  allowedExtensions: ['.png', '.jpg', '.jpeg', '.gif'],
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif'],
  multiple: true,
  maxFiles: 10,
  overwrite: true
});

// Start HTTPS server if certificates exist
httpsApp.listen(httpsPort, () => {
  console.log(`🔒 HTTPS server started on port ${httpsPort}`);
  console.log(`📜 Certificate details:`);
  console.log(`   Certificate: ${sslConfig.certPath}`);
  console.log(`   Private Key: ${sslConfig.keyPath}`);
  console.log('✅ HTTPS support is now fully implemented!');
});

console.log(`\n🌐 Access your servers:`);
console.log(`   HTTP:  http://localhost:${httpPort}`);
console.log(`   HTTPS: https://localhost:${httpsPort}`);