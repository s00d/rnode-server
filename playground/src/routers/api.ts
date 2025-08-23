import { Router, Request, Response } from 'rnode-server';

export const apiRouter = Router();

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
