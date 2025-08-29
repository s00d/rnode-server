"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commonRouter = void 0;
const rnode_server_1 = require("rnode-server");
exports.commonRouter = (0, rnode_server_1.Router)();
// Simple test route
exports.commonRouter.get('hello', (req, res) => {
    res.json({
        message: 'Hello from RNode server!',
        timestamp: new Date().toISOString()
    });
});
// Secure endpoint
exports.commonRouter.get('secure', (req, res) => {
    res.json({
        message: 'This is a secure endpoint',
        secure: true,
        timestamp: new Date().toISOString(),
        clientIP: req.getHeader('x-forwarded-for') || '127.0.0.1'
    });
});
