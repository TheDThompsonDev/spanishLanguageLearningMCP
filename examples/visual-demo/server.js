/**
 * Visual Demo Server for Spanish Learning MCP
 * 
 * This server provides:
 * 1. Static file serving for the visual demo
 * 2. API proxy to the main MCP server
 * 3. User management for the demo
 */

const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

// Create Express app
const app = express();
const PORT = process.env.PORT || 8080;

// Sample users for the demo
const USERS = {
  'free-user-123': { id: 'free-user-123', name: 'Free User', tier: 'free' },
  'basic-user-456': { id: 'basic-user-456', name: 'Basic User', tier: 'basic' },
  'premium-user-789': { id: 'premium-user-789', name: 'Premium User', tier: 'premium' }
};

// MCP server URL
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3000';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// API proxy for MCP server
app.use('/api', createProxyMiddleware({
  target: MCP_SERVER_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api' // No rewrite needed if paths match
  },
  onProxyReq: (proxyReq, req, res) => {
    // Add the global API key and user ID to the request
    const userId = req.headers['x-user-id'];
    if (userId) {
      proxyReq.setHeader('x-api-key', process.env.GLOBAL_API_KEY || 'default-api-key');
      proxyReq.setHeader('x-user-id', userId);
    }
  }
}));

// User management API
app.get('/demo-api/users', (req, res) => {
  res.json(Object.values(USERS));
});

app.get('/demo-api/users/:userId', (req, res) => {
  const user = USERS[req.params.userId];
  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Health check endpoint
app.get('/demo-api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Visual Demo Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
  console.log(`Proxying API requests to ${MCP_SERVER_URL}`);
});