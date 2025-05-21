/**
 * Health check routes for the Spanish Learning MCP Server
 */
import express, { Request, Response } from 'express';

const router = express.Router();

/**
 * Health check endpoint
 * GET /health
 */
router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

export default router;

