import { Request, Response, NextFunction } from 'express';
import pino from 'pino';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  
  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (logger: pino.Logger) => {
  return (err: Error | AppError, req: Request, res: Response, next: NextFunction) => {
    const statusCode = 'statusCode' in err ? err.statusCode : 500;
    const isOperational = 'isOperational' in err ? err.isOperational : false;
    
    if (statusCode >= 500) {
      logger.error({ 
        err, 
        req: { 
          method: req.method, 
          url: req.url, 
          ip: req.ip 
        } 
      }, 'Server error');
    } else {
      logger.info({ 
        err, 
        req: { 
          method: req.method, 
          url: req.url, 
          ip: req.ip 
        } 
      }, 'Client error');
    }
    
    const responseBody = {
      error: {
        message: isOperational ? err.message : 'An unexpected error occurred',
        
        ...(process.env.NODE_ENV !== 'production' && { 
          stack: err.stack,
          isOperational
        })
      }
    };
    
    res.status(statusCode).json(responseBody);
  };
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: {
      message: `Cannot ${req.method} ${req.path}`
    }
  });
};

export const catchAsync = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

