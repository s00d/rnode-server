import { createApp, Router, Request, Response } from 'rnode-server';

const app = createApp();
const port = 4546;

// Create API router
const apiRouter = Router();

// GET route for retrieving data
apiRouter.get('/data', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Data retrieved successfully',
    timestamp: new Date().toISOString(),
    params: req.getParams()
  });
});

// POST route for creating data
apiRouter.post('/data', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Data created successfully',
    receivedData: req.body,
    timestamp: new Date().toISOString()
  });
});

// PUT route for updating data
apiRouter.put('/data/{id}', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Data updated successfully',
    id: req.params.id,
    updatedData: req.body,
    timestamp: new Date().toISOString()
  });
});

// DELETE route for deleting data
apiRouter.delete('/data/{id}', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Data deleted successfully',
    id: req.params.id,
    timestamp: new Date().toISOString()
  });
});

// Simple test route
app.get('/hello', (req: Request, res: Response) => {
  res.json({
    message: 'Hello from RNode server!',
    timestamp: new Date().toISOString()
  });
});

// Register API router
app.useRouter('/api', apiRouter);

// Load static files
app.static('./public');

// Start server
app.listen(port, () => {
  console.log(`🚀 RNode server started on port ${port}`);
  console.log(`📝 Available routes:`);
  console.log(`   GET  /hello - greeting`);
  console.log(`   GET  /api/data - get data`);
  console.log(`   POST /api/data - create data`);
  console.log(`   PUT  /api/data/:id - update data`);
  console.log(`   DELETE /api/data/:id - delete data`);
  console.log(`🌐 Open http://localhost:${port}/hello for testing`);
});
