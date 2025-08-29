"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.basicCorsOptions = exports.app = void 0;
const rnode_server_1 = require("rnode-server");
const cors_1 = __importDefault(require("cors"));
// ===== SIMPLE CORS CONFIGURATION =====
// Basic CORS options - with useful parameters
const basicCorsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            console.log('🔒 No origin - allowing request');
            return callback(null, true);
        }
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:5173',
            'http://localhost:8080',
            'https://yourdomain.com',
            'https://app.yourdomain.com'
        ];
        if (allowedOrigins.includes(origin)) {
            console.log(`✅ Origin ${origin} is allowed`);
            callback(null, true);
        }
        else {
            console.log(`❌ Origin ${origin} is blocked`);
            callback(new Error(`Origin ${origin} is not allowed`));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Origin',
        'X-Requested-With',
        'Accept',
        'X-API-Key',
        'X-CSRF-Token',
        'X-Forwarded-For',
        'X-Real-IP'
    ],
    exposedHeaders: [
        'X-Total-Count',
        'X-Page-Count',
        'X-API-Version',
        'X-Request-ID',
        'X-Response-Time'
    ],
    credentials: true,
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204
};
exports.basicCorsOptions = basicCorsOptions;
// ===== MAIN APPLICATION =====
const app = (0, rnode_server_1.createApp)();
exports.app = app;
const port = 4547;
// Apply CORS middleware FIRST (before any other middleware)
console.log('🔒 Registering CORS middleware...');
app.useExpress((0, cors_1.default)(basicCorsOptions));
console.log('✅ CORS middleware registered');
// Check what middleware was actually registered
console.log('🔍 App middlewares after CORS:', app.getMiddlewares());
// ===== ROUTES =====
// Test route
app.get('/cors-test', (req, res) => {
    console.log('🔍 /cors-test route called');
    console.log('🔍 Request origin:', req.headers.origin);
    res.json({
        message: 'CORS is working!',
        timestamp: new Date().toISOString(),
        origin: req.headers.origin,
        method: req.method,
        headers: req.headers
    });
});
// Start server
app.listen(port, () => {
    console.log(`🚀 CORS Server started on port ${port}`);
    console.log(`🔒 CORS enabled for:`);
    // Check if origins is an array before using forEach
    if (Array.isArray(basicCorsOptions.origin)) {
        basicCorsOptions.origin.forEach((origin) => {
            if (typeof origin === 'string') {
                console.log(`   ✅ ${origin}`);
            }
            else if (typeof origin === 'boolean') {
                console.log(`   ✅ ${origin ? 'All origins' : 'No origins'}`);
            }
            else {
                console.log(`   ✅ ${origin.source}`);
            }
        });
    }
    console.log(`\n🔗 Available endpoints:`);
    console.log(`   GET    /cors-test - Test CORS headers`);
    console.log(`\n💡 Test CORS with:`);
    console.log(`   curl -H "Origin: http://localhost:3000" http://localhost:${port}/cors-test`);
    console.log(`   curl -H "Origin: http://blocked.com" http://localhost:${port}/cors-test`);
    console.log(`\n🔧 CORS Features:`);
    console.log(`   • Origin validation`);
    console.log(`   • Preflight OPTIONS support`);
    console.log(`   • Custom headers exposure`);
    console.log(`   • Credentials support`);
    console.log(`   • 24h preflight caching`);
});
