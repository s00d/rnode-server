"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRouter = void 0;
const rnode_server_1 = require("rnode-server");
exports.apiRouter = (0, rnode_server_1.Router)();
// GET route for retrieving data
exports.apiRouter.get('/data', (req, res) => {
    res.json({
        success: true,
        message: 'Data retrieved successfully',
        timestamp: new Date().toISOString(),
        params: req.getParams()
    });
});
// POST route for creating data
exports.apiRouter.post('/data', (req, res) => {
    res.json({
        success: true,
        message: 'Data created successfully',
        receivedData: req.body,
        timestamp: new Date().toISOString()
    });
});
// PUT route for updating data
exports.apiRouter.put('/data/{id}', (req, res) => {
    res.json({
        success: true,
        message: 'Data updated successfully',
        id: req.params.id,
        updatedData: req.body,
        timestamp: new Date().toISOString()
    });
});
// DELETE route for deleting data
exports.apiRouter.delete('/data/{id}', (req, res) => {
    res.json({
        success: true,
        message: 'Data deleted successfully',
        id: req.params.id,
        timestamp: new Date().toISOString()
    });
});
