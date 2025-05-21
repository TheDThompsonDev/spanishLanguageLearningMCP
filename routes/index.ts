/**
 * Central export for all routes
 */
import healthRoutes from './health.js';
import mcpRoutes, { initMcpRoutes } from './mcp.js';
import contextRoutes, { initContextRoutes } from './context.js';

export {
  healthRoutes,
  mcpRoutes,
  initMcpRoutes,
  contextRoutes,
  initContextRoutes
};

