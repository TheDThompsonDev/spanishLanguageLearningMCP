/**
 * Single API Key Demo for Spanish Learning MCP
 * 
 * This example demonstrates how to use the single API key approach
 * with different user tiers.
 */

// Import required modules
const axios = require('axios');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Configuration
const API_URL = 'http://localhost:3000';
const GLOBAL_API_KEY = process.env.GLOBAL_API_KEY || 'default-api-key';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

// Available users with different tiers
const users = {
  'free-user': { id: 'free-user', tier: 'free' },
  'basic-user': { id: 'basic-user', tier: 'basic' },
  'premium-user': { id: 'premium-user', tier: 'premium' }
};

// Helper function to make API requests
async function makeRequest(endpoint, method = 'GET', data = null, userId = null, adminKey = false) {
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (userId) {
      headers['x-api-key'] = GLOBAL_API_KEY;
      headers['x-user-id'] = userId;
    }
    
    if (adminKey) {
      headers['x-admin-key'] = ADMIN_API_KEY;
    }
    
    const response = await axios({
      method,
      url: `${API_URL}${endpoint}`,
      data,
      headers
    });
    
    return response.data;
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    return null;
  }
}

// Register users (admin only)
async function registerUsers() {
  if (!ADMIN_API_KEY) {
    console.error('Admin API key is required to register users');
    return;
  }
  
  console.log('Registering users with different tiers...');
  
  for (const [id, user] of Object.entries(users)) {
    const result = await makeRequest('/api/users', 'POST', {
      userId: id,
      name: `${user.tier.charAt(0).toUpperCase() + user.tier.slice(1)} User`,
      tier: user.tier
    }, null, true);
    
    if (result) {
      console.log(`Registered ${id} with ${user.tier} tier`);
    }
  }
  
  console.log('User registration complete');
}

// Test API with different users
async function testWithUser(userId) {
  const user = users[userId];
  if (!user) {
    console.error(`Unknown user: ${userId}`);
    return;
  }
  
  console.log(`\nTesting with ${userId} (${user.tier} tier):`);
  
  // Test basic vocabulary query
  console.log('\n1. Basic vocabulary query:');
  const vocabResult = await makeRequest('/api/mcp/query', 'POST', {
    query: 'How do I say hello in Spanish?',
    contextType: 'vocabulary',
    categories: ['greeting'],
    maxItems: 50 // Will be limited based on tier
  }, userId);
  
  if (vocabResult) {
    console.log('Response received!');
    console.log(`User tier: ${vocabResult.user?.tier}`);
    console.log(`Response length: ${vocabResult.response?.length} characters`);
  }
  
  // Test premium features
  if (user.tier !== 'premium') {
    console.log('\n2. Attempting to access premium features:');
    const premiumResult = await makeRequest('/api/mcp/query/advanced', 'POST', {
      query: 'Create a conversation practice about ordering food',
      contextType: 'conversation',
      temperature: 0.7,
      maxTokens: 2000
    }, userId);
    
    if (premiumResult) {
      console.log('Access granted (unexpected for non-premium user)');
    } else {
      console.log('Access denied (expected for non-premium user)');
    }
  } else {
    console.log('\n2. Using premium features:');
    const premiumResult = await makeRequest('/api/mcp/query/advanced', 'POST', {
      query: 'Create a conversation practice about ordering food',
      contextType: 'conversation',
      temperature: 0.7,
      maxTokens: 2000
    }, userId);
    
    if (premiumResult) {
      console.log('Premium feature access granted!');
      console.log(`Response length: ${premiumResult.response?.length} characters`);
    }
  }
}

// Main function
async function main() {
  console.log('Spanish Learning MCP - Single API Key Demo\n');
  
  // Check server health
  const health = await makeRequest('/health');
  if (!health || health.status !== 'ok') {
    console.error('Server is not running or not healthy');
    rl.close();
    return;
  }
  
  console.log('Server is running and healthy');
  
  // Register users if needed
  const registerResponse = await new Promise(resolve => {
    rl.question('Do you want to register test users? (y/n): ', resolve);
  });
  
  if (registerResponse.toLowerCase() === 'y') {
    await registerUsers();
  }
  
  // Test with different users
  while (true) {
    console.log('\nAvailable users:');
    Object.entries(users).forEach(([id, user]) => {
      console.log(`- ${id} (${user.tier} tier)`);
    });
    
    const userId = await new Promise(resolve => {
      rl.question('\nSelect a user ID to test (or "exit" to quit): ', resolve);
    });
    
    if (userId.toLowerCase() === 'exit') {
      break;
    }
    
    if (users[userId]) {
      await testWithUser(userId);
    } else {
      console.log('Invalid user ID. Please try again.');
    }
  }
  
  rl.close();
}

// Run the demo
main().catch(console.error);