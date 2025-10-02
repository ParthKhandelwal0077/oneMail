import { Request, Response } from 'express';

export const notFound = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `The requested route ${req.originalUrl} does not exist on this server`,
    availableEndpoints: {
      auth: '/api/auth',
      emails: '/api/emails',
      sync: '/api/sync'
    }
  });
};
