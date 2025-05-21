/**
 * Conversation functionality tests for the Spanish Learning MCP Server
 * 
 * These tests validate that conversation features work correctly,
 * including starting and continuing conversations.
 */
import request from 'supertest';
import { app } from '../server.js';
import { registerApiKey } from '../middleware/auth.js';

// Mock API keys for testing
const mockApiKeys = {
  free: registerApiKey('test-free-user-conv', 'free', 'Test Free User'),
  basic: registerApiKey('test-basic-user-conv', 'basic', 'Test Basic User'),
  premium: registerApiKey('test-premium-user-conv', 'premium', 'Test Premium User')
};

// Mock the MCP instance to avoid actual API calls during tests
jest.mock('../lib/mcp-module.js', () => {
  const original = jest.requireActual('../lib/mcp-module.js');
  
  return {
    ...original,
    createSpanishMcp: () => ({
      getContext: jest.fn().mockResolvedValue('Mocked context'),
      queryWithContext: jest.fn().mockResolvedValue('Mocked conversation response'),
      config: { model: 'mocked-model' }
    })
  };
});

describe('Conversation Functionality Tests', () => {
  test('Starting a conversation should return a valid conversation ID', async () => {
    const response = await request(app)
      .post('/api/conversation/start')
      .set('x-api-key', mockApiKeys.basic)
      .send({
        topic: 'test-topic',
        difficultyLevel: 'beginner',
        participantCount: 1
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('conversationId');
    expect(response.body.conversationId).toMatch(/^conv_/);
    expect(response.body).toHaveProperty('conversation');
    expect(response.body).toHaveProperty('metadata');
  });
  
  test('Continuing a conversation requires a valid conversation ID', async () => {
    // First start a conversation
    const startResponse = await request(app)
      .post('/api/conversation/start')
      .set('x-api-key', mockApiKeys.basic)
      .send({
        topic: 'test-topic',
        difficultyLevel: 'beginner'
      });
    
    const conversationId = startResponse.body.conversationId;
    
    // Then try to continue it
    const continueResponse = await request(app)
      .post('/api/conversation/continue')
      .set('x-api-key', mockApiKeys.basic)
      .send({
        conversationId,
        userMessage: 'Hello, this is a test message'
      });
    
    expect(continueResponse.status).toBe(200);
    expect(continueResponse.body).toHaveProperty('message');
    expect(continueResponse.body.conversationId).toBe(conversationId);
  });
  
  test('Invalid conversation ID should return 404', async () => {
    const response = await request(app)
      .post('/api/conversation/continue')
      .set('x-api-key', mockApiKeys.basic)
      .send({
        conversationId: 'invalid-id',
        userMessage: 'This should fail'
      });
    
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
  });
  
  test('Users cannot access conversations they do not own', async () => {
    // First user starts a conversation
    const startResponse = await request(app)
      .post('/api/conversation/start')
      .set('x-api-key', mockApiKeys.free)
      .send({
        topic: 'test-topic',
        difficultyLevel: 'beginner'
      });
    
    const conversationId = startResponse.body.conversationId;
    
    // Second user tries to continue it
    const continueResponse = await request(app)
      .post('/api/conversation/continue')
      .set('x-api-key', mockApiKeys.basic) // Different user
      .send({
        conversationId,
        userMessage: 'This should fail'
      });
    
    expect(continueResponse.status).toBe(403);
    expect(continueResponse.body).toHaveProperty('error');
  });
  
  test('Conversation history should contain all messages', async () => {
    // First start a conversation
    const startResponse = await request(app)
      .post('/api/conversation/start')
      .set('x-api-key', mockApiKeys.basic)
      .send({
        topic: 'test-topic',
        difficultyLevel: 'beginner'
      });
    
    const conversationId = startResponse.body.conversationId;
    
    // Add a few messages
    await request(app)
      .post('/api/conversation/continue')
      .set('x-api-key', mockApiKeys.basic)
      .send({
        conversationId,
        userMessage: 'First test message'
      });
      
    await request(app)
      .post('/api/conversation/continue')
      .set('x-api-key', mockApiKeys.basic)
      .send({
        conversationId,
        userMessage: 'Second test message'
      });
    
    // Get conversation history
    const historyResponse = await request(app)
      .get(`/api/conversation/${conversationId}`)
      .set('x-api-key', mockApiKeys.basic);
    
    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body.conversation).toHaveProperty('messages');
    expect(historyResponse.body.conversation.messages.length).toBeGreaterThanOrEqual(3); // Initial + 2 exchanges
    expect(historyResponse.body.conversation.messageCount).toBeGreaterThanOrEqual(3);
  });
  
  test('Users should be able to see their conversation history list', async () => {
    // Start a couple of conversations
    await request(app)
      .post('/api/conversation/start')
      .set('x-api-key', mockApiKeys.premium)
      .send({
        topic: 'history-test-1',
        difficultyLevel: 'beginner'
      });
      
    await request(app)
      .post('/api/conversation/start')
      .set('x-api-key', mockApiKeys.premium)
      .send({
        topic: 'history-test-2',
        difficultyLevel: 'intermediate'
      });
    
    // Get history list
    const historyResponse = await request(app)
      .get('/api/conversation/history')
      .set('x-api-key', mockApiKeys.premium);
    
    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body).toHaveProperty('conversations');
    expect(Array.isArray(historyResponse.body.conversations)).toBe(true);
    expect(historyResponse.body.conversations.length).toBeGreaterThanOrEqual(2);
    
    // Verify each history item has the necessary properties
    historyResponse.body.conversations.forEach(item => {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('topic');
      expect(item).toHaveProperty('messageCount');
      expect(item).toHaveProperty('preview');
    });
  });
  
  test('Users should be able to delete their conversations', async () => {
    // First start a conversation
    const startResponse = await request(app)
      .post('/api/conversation/start')
      .set('x-api-key', mockApiKeys.premium)
      .send({
        topic: 'delete-test',
        difficultyLevel: 'beginner'
      });
    
    const conversationId = startResponse.body.conversationId;
    
    // Then delete it
    const deleteResponse = await request(app)
      .delete(`/api/conversation/${conversationId}`)
      .set('x-api-key', mockApiKeys.premium);
    
    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.success).toBe(true);
    
    // Try to access it after deletion
    const getResponse = await request(app)
      .get(`/api/conversation/${conversationId}`)
      .set('x-api-key', mockApiKeys.premium);
    
    expect(getResponse.status).toBe(404);
  });
  
  test('Premium users should get more detailed conversation outputs', async () => {
    // First test with a basic user
    const basicResponse = await request(app)
      .post('/api/conversation/continue')
      .set('x-api-key', mockApiKeys.basic)
      .send({
        conversationId: (await request(app)
          .post('/api/conversation/start')
          .set('x-api-key', mockApiKeys.basic)
          .send({
            topic: 'premium-test',
            difficultyLevel: 'beginner'
          })).body.conversationId,
        userMessage: 'Test with error',
        includeCorrections: true,
        includeAlternatives: true
      });
    
    // Then test with a premium user
    const premiumResponse = await request(app)
      .post('/api/conversation/continue')
      .set('x-api-key', mockApiKeys.premium)
      .send({
        conversationId: (await request(app)
          .post('/api/conversation/start')
          .set('x-api-key', mockApiKeys.premium)
          .send({
            topic: 'premium-test',
            difficultyLevel: 'beginner'
          })).body.conversationId,
        userMessage: 'Test with error',
        includeCorrections: true,
        includeAlternatives: true
      });
    
    // Premium user should have includeAlternatives in metadata
    expect(premiumResponse.body.metadata).toHaveProperty('includeAlternatives', true);
    
    // Basic user should not have includeAlternatives in metadata
    expect(basicResponse.body.metadata.includeAlternatives).toBeFalsy();
  });
});

