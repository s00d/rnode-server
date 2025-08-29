"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const rnode_server_1 = require("rnode-server");
const api_1 = require("./routers/api");
const common_1 = require("./routers/common");
const users_1 = require("./routers/users");
const auth_api_1 = require("./routers/auth_api");
const templates_1 = require("./routers/templates");
const static_1 = require("./routers/static");
const multipart_1 = require("./routers/multipart");
const cors_1 = require("./routers/cors");
const path = __importStar(require("path"));
const httpPort = 4599;
const httpsPort = 4600;
// SSL configuration
const sslConfig = {
    certPath: path.join(__dirname, '../ssl/server.crt'),
    keyPath: path.join(__dirname, '../ssl/server.key')
};
// Create HTTP server
const httpApp = (0, rnode_server_1.createApp)({ logLevel: 'debug' });
httpApp.useRouter('/', common_1.commonRouter);
httpApp.useRouter('/api/users', users_1.usersRouter);
httpApp.useRouter('/api/auth', auth_api_1.authApiRouter);
httpApp.useRouter('/api', api_1.apiRouter);
httpApp.useRouter('/templates', templates_1.templatesRouter);
httpApp.useRouter('/static', static_1.staticRouter);
httpApp.useRouter('/multipart', multipart_1.multipartRouter);
httpApp.useRouter('/cors', cors_1.corsRouter);
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
httpApp.get('/hello', (req, res) => {
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
let httpsApp = (0, rnode_server_1.createApp)({ ssl: sslConfig });
httpsApp.useRouter('/', common_1.commonRouter);
httpsApp.useRouter('/api/users', users_1.usersRouter);
httpsApp.useRouter('/api/auth', auth_api_1.authApiRouter);
httpsApp.useRouter('/api', api_1.apiRouter);
httpsApp.useRouter('/templates', templates_1.templatesRouter);
httpsApp.useRouter('/static', static_1.staticRouter);
httpsApp.useRouter('/multipart', multipart_1.multipartRouter);
httpsApp.useRouter('/cors', cors_1.corsRouter);
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
