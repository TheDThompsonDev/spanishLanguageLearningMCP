import { Request, Response, NextFunction } from 'express';
import { rateLimit, Options, Store } from 'express-rate-limit';
import { AuthenticatedRequest } from './auth';

class EnhancedMemoryStore extends Store {
  private hits: Record<string, { count: number, resetTime: number }> = {};
  private interval: NodeJS.Timeout;
  
  constructor() {
    super();
    
    this.interval = setInterval(() => {
      const now = Date.now();
      for (const key in this.hits) {
        if (this.hits[key].resetTime <= now) {
          delete this.hits[key];
        }
      }
    }, 5 * 60 * 1000);
  }
  
  cleanup(): void {
    clearInterval(this.interval);
  }
  
  async increment(key: string): Promise<{ totalHits: number, resetTime: number }> {
    const now = Date.now();
    
    if (!this.hits[key] || this.hits[key].resetTime <= now) {
      this.hits[key] = { 
        count: 1, 
        resetTime: now + this.windowMs 
      };
    } else {
      this.hits[key].count += 1;
    }
    
    return {
      totalHits: this.hits[key].count,
      resetTime: this.hits[key].resetTime
    };
  }
  
  async decrement(key: string): Promise<void> {
    if (this.hits[key] && this.hits[key].count > 0) {
      this.hits[key].count -= 1;
    }
  }
  
  async resetKey(key: string): Promise<void> {
    delete this.hits[key];
  }
}

export const createTieredRateLimiter = (options: Partial<Options> = {}) => {
  const store = new EnhancedMemoryStore();
  
  const defaultOptions: Partial<Options> = {
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests', message: 'Please try again later' }
  };
  
  const tierLimits = {
    free: 20,
    basic: 100,
    premium: 300
  };
  
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user || { tier: 'free' };
    const limit = tierLimits[user.tier];
    
    const rateLimiter = rateLimit({
      ...defaultOptions,
      ...options,
      windowMs: 15 * 60 * 1000,
      max: limit,
      store,
      keyGenerator: (request) => {
        return request.user?.id ? `${request.user.id}` : request.ip;
      }
    });
    
    rateLimiter(req, res, next);
  };
};

export const createStrictRateLimiter = (windowMs = 60 * 1000, maxRequests = 5) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: { 
      error: 'Too many requests for sensitive operations', 
      message: 'Please try again later' 
    }
  });
};

