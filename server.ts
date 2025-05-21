import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { createSpanishMcp, ContextType, ContextOptions } from './lib/mcp-module.js';

import {
  apiKeyAuth,
  AuthenticatedRequest,
  registerUser,
  updateUserTier,
  removeUser
} from './middleware/auth.js';
import { createTieredRateLimiter, createStrictRateLimiter } from './middleware/rate-limit.js';
import { errorHandler, notFoundHandler, AppError } from './middleware/error.js';

dotenv.config();

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

const app = express();
const PORT = process.env.PORT || 3000;

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  logger.fatal('ANTHROPIC_API_KEY environment variable is required');
  process.exit(1);
}

const mcp = createSpanishMcp(apiKey, {
  useAppwrite: true,
});

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(pinoHttp({ logger }));

const apiRateLimiter = createTieredRateLimiter();
app.use('/api', apiRateLimiter);

const conversationRateLimiter = createTieredRateLimiter({
  windowMs: 60 * 1000,
  max: (req) => {
    const tier = (req as any).user?.tier || 'free';
    return tier === 'premium' ? 20 : tier === 'basic' ? 10 : 5;
  }
});

logger.info('Initialized conversation rate limiter with tiered limits');

const exerciseRateLimiter = createTieredRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: (req) => {
    const tier = (req as any).user?.tier || 'free';
    return tier === 'premium' ? 15 : tier === 'basic' ? 8 : 3;
  }
});

const strictRateLimiter = createStrictRateLimiter(60 * 1000, 5);
app.use('/api/keys', strictRateLimiter);

import healthRoutes from './routes/health.js';
import mcpRoutes, { initMcpRoutes } from './routes/mcp.js';
import contextRoutes, { initContextRoutes } from './routes/context.js';
import exerciseRoutes, { initExerciseRoutes } from './routes/exercise.js';
import conversationRoutes, { initConversationRoutes, cleanupConversationResources } from './routes/conversation.js';

app.use('/health', healthRoutes);

app.post('/api/users', strictRateLimiter, (req: Request, res: Response) => {
  const { userId, name, tier = 'free' } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  if (!req.headers['x-admin-key'] || req.headers['x-admin-key'] !== process.env.ADMIN_API_KEY) {
    return res.status(403).json({ error: 'Admin API key required' });
  }
  
  registerUser(userId, tier as 'free' | 'basic' | 'premium', name);
  
  res.status(201).json({
    message: 'User registered successfully',
    userId,
    tier,
    apiKey: process.env.GLOBAL_API_KEY || 'default-api-key',
    usage: 'Include both x-api-key and x-user-id headers in your requests'
  });
});

app.put('/api/users/:userId/tier', strictRateLimiter, (req: Request, res: Response) => {
  const { userId } = req.params;
  const { tier } = req.body;
  
  if (!tier || !['free', 'basic', 'premium'].includes(tier)) {
    return res.status(400).json({ error: 'Valid tier (free, basic, premium) is required' });
  }
  
  if (!req.headers['x-admin-key'] || req.headers['x-admin-key'] !== process.env.ADMIN_API_KEY) {
    return res.status(403).json({ error: 'Admin API key required' });
  }
  
  const success = updateUserTier(userId, tier as 'free' | 'basic' | 'premium');
  
  if (!success) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.status(200).json({ message: 'User tier updated successfully', userId, tier });
});

app.use('/api/mcp', apiKeyAuth, initMcpRoutes(mcp));
app.use('/api/context', apiKeyAuth, initContextRoutes(mcp));

logger.info('Initializing conversation routes with MCP integration');
app.use('/api/conversation', apiKeyAuth, conversationRateLimiter, initConversationRoutes(mcp));

logger.info('Initializing exercise routes with MCP integration');
app.use('/api/exercise', apiKeyAuth, exerciseRateLimiter, initExerciseRoutes(mcp));

app.use(errorHandler(logger));

app.use(notFoundHandler);

const startServer = () => {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Health check available at http://localhost:${PORT}/health`);
    
    logger.info('Available API endpoints:');
    logger.info('- /health - Server health check (public)');
    logger.info('- /api/mcp/* - MCP query endpoints (authenticated)');
    logger.info('- /api/context/* - Context retrieval endpoints (authenticated)');
    logger.info('- /api/conversation/* - Conversation endpoints (authenticated, requires basic/premium tier)');
    logger.info('- /api/exercise/* - Exercise endpoints (authenticated, some features require premium tier)');
    
    logger.info(`Server environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`MCP model configured: ${mcp.config?.model || 'default'}`);
    logger.info('Server startup complete');
  });
  
  process.on('uncaughtException', (error) => {
    logger.error({ error }, 'Uncaught exception detected');
    shutdownGracefully('Uncaught Exception', 1);
  });
};

const shutdownGracefully = (signal: string, exitCode: number = 0): void => {
  logger.info(`${signal} received, shutting down gracefully`);
  
  logger.info('Initiating conversation resource cleanup');
  cleanupConversationResources();
  
  setTimeout(() => {
    logger.info('Shutdown complete');
    process.exit(exitCode);
  }, 1000);
};

process.on('SIGTERM', () => shutdownGracefully('SIGTERM'));
process.on('SIGINT', () => shutdownGracefully('SIGINT'));

if (require.main === module) {
  startServer();
}

export { app, startServer };

