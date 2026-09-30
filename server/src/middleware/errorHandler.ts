import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

// Centralized error handler — every error in the app funnels through here
// so the client always gets a consistent JSON shape: { error: string }
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.flatten().fieldErrors,
    });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
