/**
 * Authentication and authorization tests for the Spanish Learning MCP Server
 * 
 * These tests validate that authentication works correctly and that
 * different user tiers have appropriate access levels to features.
 */
import request from 'supertest';
import { app } from '../server.js';
import { registerApiKey } from '../middleware/auth.js';

// Mock API keys for testing
const mockApiKeys = {
  free: registerApiKey('test-free-user', 'free', 'Test Free User'),
  basic: registerApiKey('test-basic-user', 'basic', 'Test Basic User'),
  premium: registerApiKey('test-premium-user', 'premium', 'Test Premium User'),
  // Invalid key for testing authentication failures
  invalid: 'invalid-api-key'
};

describe('Authentication Tests', () => {
  test('Public endpoints should be accessible without API key', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  test('Protected endpoints should require API key', async () => {
    const response = await request(app).get('/api/mcp/query');
    expect(response.status).toBe(401);
    expect(response.body.error).toBeTruthy();
  });

  test('Invalid API key should be rejected', async () => {
    const response = await request(app)
      .get('/api/context')
      .set('x-api-key', mockApiKeys.invalid);
    expect(response.status).toBe(403);
    expect(response.body.error).toBeTruthy();
  });

  test('Valid API key should grant access to protected endpoints', async () => {
    const response = await request(app)
      .get('/api/context')
      .set('x-api-key', mockApiKeys.free);
    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
  });
});

describe('User Tier Access Tests', () => {
  test('Free tier user should have limited access to conversation topics', async () => {
    const response = await request(app)
      .get('/api/conversation/topics')
      .set('x-api-key', mockApiKeys.free);

    expect(response.status).toBe(200);
    expect(response.body.tier).toBe('free');
    expect(response.body.topics).toHaveProperty('beginner');
    expect(response.body.topics).not.toHaveProperty('intermediate');
    expect(response.body.topics).not.toHaveProperty('advanced');
  });

  test('Basic tier user should have access to intermediate conversation topics', async () => {
    const response = await request(app)
      .get('/api/conversation/topics')
      .set('x-api-key', mockApiKeys.basic);

    expect(response.status).toBe(200);
    expect(response.body.tier).toBe('basic');
    expect(response.body.topics).toHaveProperty('beginner');
    expect(response.body.topics).toHaveProperty('intermediate');
    expect(response.body.topics).not.toHaveProperty('advanced');
  });

  test('Premium tier user should have full access to all conversation topics', async () => {
    const response = await request(app)
      .get('/api/conversation/topics')
      .set('x-api-key', mockApiKeys.premium);

    expect(response.status).toBe(200);
    expect(response.body.tier).toBe('premium');
    expect(response.body.topics).toHaveProperty('beginner');
    expect(response.body.topics).toHaveProperty('intermediate');
    expect(response.body.topics).toHaveProperty('advanced');
  });

  test('Free tier user should be blocked from advanced conversation difficulties', async () => {
    const response = await request(app)
      .post('/api/conversation/start')
      .set('x-api-key', mockApiKeys.free)
      .send({
        topic: 'test-topic',
        difficultyLevel: 'advanced'
      });

    expect(response.status).toBe(403);
    expect(response.body.error).toBeTruthy();
  });

  test('Basic tier user should be blocked from advanced conversation difficulties', async () => {
    const response = await request(app)
      .post('/api/conversation/start')
      .set('x-api-key', mockApiKeys.basic)
      .send({
        topic: 'test-topic',
        difficultyLevel: 'advanced'
      });

    expect(response.status).toBe(403);
    expect(response.body.error).toBeTruthy();
  });

  test('Premium tier user should have access to advanced conversation difficulties', async () => {
    // This test is mocking the conversation service to avoid actual API calls
    const response = await request(app)
      .post('/api/conversation/start')
      .set('x-api-key', mockApiKeys.premium)
      .send({
        topic: 'test-topic',
        difficultyLevel: 'advanced'
      });

    // Should not get a 403 error
    expect(response.status).not.toBe(403);
  });

  test('Free tier user should have limited exercise types', async () => {
    const response = await request(app)
      .get('/api/exercise/types')
      .set('x-api-key', mockApiKeys.free);

    expect(response.status).toBe(200);
    // Check for limited exercise types for free tier
    const availableTypes = response.body.exerciseTypes.map(t => t.id);
    expect(availableTypes).toContain('vocabulary_matching');
    expect(availableTypes).toContain('multiple_choice');
    expect(availableTypes).not.toContain('translation');
  });

  test('Premium tier user should have all exercise types', async () => {
    const response = await request(app)
      .get('/api/exercise/types')
      .set('x-api-key', mockApiKeys.premium);

    expect(response.status).toBe(200);
    // Check for premium exercise types
    const availableTypes = response.body.exerciseTypes.map(t => t.id);
    expect(availableTypes).toContain('vocabulary_matching');
    expect(availableTypes).toContain('multiple_choice');
    expect(availableTypes).toContain('translation');
    expect(availableTypes).toContain('conversation_practice');
  });
});

