/**
 * Rate limiting tests for the Spanish Learning MCP Server
 * 
 * These tests validate that rate limiting is working correctly
 * for different endpoints and user tiers.
 */
import request from 'supertest';
import { app } from '../server.js';
import { registerApiKey } from '../middleware/auth.js';

// Mock API keys for testing
const mockApiKeys = {
  free: registerApiKey('test-free-user-rate', 'free', 'Test Free User'),
  basic: registerApiKey('test-basic-user-rate', 'basic', 'Test Basic User'),
  premium: registerApiKey('test-premium-user-rate', 'premium', 'Test Premium User')
};

// Helper function to make repeated requests
const makeRepeatedRequests = async (
  endpoint: string, 
  apiKey: string, 
  count: number,
  method: 'get' | 'post' = 'get',
  body?: any
) => {
  const responses = [];
  
  for (let i = 0; i < count; i++) {
    let req = request(app)[method](endpoint)
      .set('x-api-key', apiKey);
      
    if (body && method === 'post') {
      req = req.send(body);
    }
    
    responses.push(await req);
  }
  
  return responses;
};

describe('Rate Limiting Tests', () => {
  test('Free tier should have stricter rate limits than premium', async () => {
    // Make multiple quick requests to the same endpoint
    const freeResponses = await makeRepeatedRequests(
      '/api/conversation/topics',
      mockApiKeys.free,
      6 // Try to exceed the free tier limit (5)
    );
    
    const premiumResponses = await makeRepeatedRequests(
      '/api/conversation/topics',
      mockApiKeys.premium,
      10 // Should be within premium tier limit
    );
    
    // Check if free tier got rate limited
    const freeRateLimited = freeResponses.some(r => r.status === 429);
    expect(freeRateLimited).toBe(true);
    
    // Check if premium tier did not get rate limited
    const premiumRateLimited = premiumResponses.some(r => r.status === 429);
    expect(premiumRateLimited).toBe(false);
  });
  
  test('Exercise endpoints should have stricter rate limits', async () => {
    // Make multiple requests to exercise generation endpoint
    const exerciseResponses = await makeRepeatedRequests(
      '/api/exercise/types',
      mockApiKeys.basic,
      10, // Should exceed basic tier limit for exercises
      'get'
    );
    
    // Make same number of requests to a regular endpoint
    const regularResponses = await makeRepeatedRequests(
      '/api/conversation/topics',
      mockApiKeys.basic,
      10, // Should be within basic tier limit for conversation
      'get'
    );
    
    // Check if exercise endpoint got rate limited sooner
    const exerciseRateLimited = exerciseResponses.some(r => r.status === 429);
    const regularRateLimited = regularResponses.some(r => r.status === 429);
    
    expect(exerciseRateLimited).toBe(true);
    expect(regularRateLimited).toBe(false);
  });
  
  test('API key generation should have very strict rate limits', async () => {
    // Make multiple requests to the API key endpoint
    // Note: We're using a regular endpoint here as we can't actually test the admin API key
    // generation without exposing the admin API key in tests
    
    const responses = await makeRepeatedRequests(
      '/api/keys',
      mockApiKeys.premium,
      6, // Should exceed the strict rate limit
      'post',
      { userId: 'test-user' }
    );
    
    // Check for rate limiting
    const rateLimited = responses.some(r => r.status === 429);
    expect(rateLimited).toBe(true);
  });
});

