/**
 * Cleanup functionality tests for the Spanish Learning MCP Server
 * 
 * These tests validate that the cleanup functionality works correctly,
 * preventing memory leaks and properly managing server resources.
 */
import { 
  cleanupConversationResources, 
  cleanupOldConversations,
  CONVERSATION_MAX_AGE_MS,
  getConversationStore,  // Exported for testing
  setMockDate,           // For testing time-based cleanup
  getCleanupInterval,    // For testing interval functionality
  setCleanupInterval     // For testing interval functionality
} from '../routes/conversation.js';
import { registerApiKey } from '../middleware/auth.js';
import request from 'supertest';
import { app } from '../server.js';

// Mock API keys for testing
const mockApiKeys = {
  basic: registerApiKey('test-basic-user-cleanup', 'basic', 'Test Basic User')
};

describe('Conversation Cleanup Tests', () => {
  beforeEach(() => {
    // Reset the conversation store before each test
    const store = getConversationStore();
    store.clear();
  });
  
  afterAll(() => {
    // Clean up resources after all tests
    cleanupConversationResources();
  });
  
  test('Old conversations should be cleaned up after exceeding maximum age', async () => {
    // Create a conversation
    const response = await request(app)
      .post('/api/conversation/start')
      .set('x-api-key', mockApiKeys.basic)
      .send({
        topic: 'cleanup-test',
        difficultyLevel: 'beginner'
      });
    
    const conversationId = response.body.conversationId;
    
    // Verify the conversation exists
    const store = getConversationStore();
    expect(store.has(conversationId)).toBe(true);
    
    // Simulate time passing (more than the max age)
    const oldDate = new Date(Date.now() - (CONVERSATION_MAX_AGE_MS + 60000));
    const conversation = store.get(conversationId);
    conversation.createdAt = oldDate;
    store.set(conversationId, conversation);
    
    // Run the cleanup process
    const cleanupCount = cleanupOldConversations();
    
    // Verify the conversation was cleaned up
    expect(cleanupCount).toBeGreaterThan(0);
    expect(store.has(conversationId)).toBe(false);
  });
  
  test('Recent conversations should not be cleaned up', async () => {
    // Create a conversation
    const response = await request(app)
      .post('/api/conversation/start')
      .set('x-api-key', mockApiKeys.basic)
      .send({
        topic: 'recent-test',
        difficultyLevel: 'beginner'
      });
    
    const conversationId = response.body.conversationId;
    
    // Verify the conversation exists
    const store = getConversationStore();
    expect(store.has(conversationId)).toBe(true);
    
    // Run the cleanup process
    const cleanupCount = cleanupOldConversations();
    
    // Verify the conversation was not cleaned up
    expect(cleanupCount).toBe(0);
    expect(store.has(conversationId)).toBe(true);
  });
  
  test('Conversation cleanup should handle empty store', () => {
    // Ensure store is empty
    const store = getConversationStore();
    store.clear();
    
    // Run the cleanup process
    const cleanupCount = cleanupOldConversations();
    
    // Verify no errors and zero count
    expect(cleanupCount).toBe(0);
  });
  
  test('Shutdown cleanup should clear all conversations', async () => {
    // Create multiple conversations
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/conversation/start')
        .set('x-api-key', mockApiKeys.basic)
        .send({
          topic: `shutdown-test-${i}`,
          difficultyLevel: 'beginner'
        });
    }
    
    // Verify conversations exist
    const store = getConversationStore();
    expect(store.size).toBe(3);
    
    // Run the shutdown cleanup
    cleanupConversationResources();
    
    // Verify all conversations were cleared
    expect(store.size).toBe(0);
  });
  
  test('Cleanup should handle errors gracefully', async () => {
    // Create a conversation
    const response = await request(app)
      .post('/api/conversation/start')
      .set('x-api-key', mockApiKeys.basic)
      .send({
        topic: 'error-test',
        difficultyLevel: 'beginner'
      });
    
    const conversationId = response.body.conversationId;
    
    // Corrupt the conversation to cause an error during cleanup
    const store = getConversationStore();
    const conversation = store.get(conversationId);
    // @ts-ignore - deliberately corrupt the data
    conversation.createdAt = 'invalid-date';
    store.set(conversationId, conversation);
    
    // Run the cleanup process - should not throw
    expect(() => {
      cleanupOldConversations();
    }).not.toThrow();
    
    // The corrupted conversation should still be there
    expect(store.has(conversationId)).toBe(true);
  });
  
  test('Memory usage should remain stable after multiple operations and cleanup', async () => {
    // Create a benchmark for memory usage
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Create many conversations
    const conversationIds = [];
    for (let i = 0; i < 10; i++) {
      const response = await request(app)
        .post('/api/conversation/start')
        .set('x-api-key', mockApiKeys.basic)
        .send({
          topic: `memory-test-${i}`,
          difficultyLevel: 'beginner'
        });
      
      conversationIds.push(response.body.conversationId);
      
      // Add messages to each conversation
      for (let j = 0; j < 5; j++) {
        await request(app)
          .post('/api/conversation/continue')
          .set('x-api-key', mockApiKeys.basic)
          .send({
            conversationId: response.body.conversationId,
            userMessage: `Test message ${j}`
          });
      }
    }
    
    // Run cleanup to remove all conversations
    cleanupConversationResources();
    
    // Check memory usage after cleanup
    const finalMemory = process.memoryUsage().heapUsed;
    
    // Memory should not have increased dramatically
    // This is a rough test - exact memory usage depends on environment
    // In real tests, we'd use more precise memory measurement
    expect(finalMemory).toBeLessThan(initialMemory * 2);
  });
  
  // Additional error test cases
  describe('Error Handling Tests', () => {
    test('Cleanup should handle invalid date formats', () => {
      // Get store and create a conversation with invalid date
      const store = getConversationStore();
      const conversationId = `conv_${Date.now()}_invalid_date`;
      
      store.set(conversationId, {
        id: conversationId,
        topic: 'Invalid Date Test',
        userId: 'test-user',
        createdAt: 'not-a-date', // Invalid date format
        messages: []
      });
      
      // Cleanup should not throw
      expect(() => {
        cleanupOldConversations();
      }).not.toThrow();
      
      // The conversation should still exist since we couldn't process its date
      expect(store.has(conversationId)).toBe(true);
    });
    
    test('Cleanup should handle missing required fields', () => {
      // Get store and create a conversation with missing fields
      const store = getConversationStore();
      const conversationId = `conv_${Date.now()}_missing_fields`;
      
      store.set(conversationId, {
        id: conversationId,
        // Missing topic, userId, etc.
        messages: []
      });
      
      // Cleanup should not throw
      expect(() => {
        cleanupOldConversations();
      }).not.toThrow();
      
      // The conversation should still exist
      expect(store.has(conversationId)).toBe(true);
    });
    
    test('Cleanup should handle null values', () => {
      // Get store and create a conversation with null values
      const store = getConversationStore();
      const conversationId = `conv_${Date.now()}_null_values`;
      
      store.set(conversationId, {
        id: conversationId,
        topic: null,
        userId: 'test-user',
        createdAt: null,
        messages: null
      });
      
      // Cleanup should not throw
      expect(() => {
        cleanupOldConversations();
      }).not.toThrow();
      
      // The conversation should still exist
      expect(store.has(conversationId)).toBe(true);
    });
  });
  
  // Memory tests with large payloads and concurrent operations
  describe('Memory Stress Tests', () => {
    test('Memory usage with large messages', async () => {
      // Create a benchmark for memory usage
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create a conversation with large messages
      const largeString = 'A'.repeat(100000); // 100KB string
      
      const response = await request(app)
        .post('/api/conversation/start')
        .set('x-api-key', mockApiKeys.basic)
        .send({
          topic: 'large-message-test',
          difficultyLevel: 'beginner'
        });
      
      const conversationId = response.body.conversationId;
      
      // Get store and add large messages directly
      const store = getConversationStore();
      const conversation = store.get(conversationId);
      
      // Add 10 large messages
      for (let i = 0; i < 10; i++) {
        conversation.messages.push({
          role: 'user',
          content: `${largeString} - message ${i}`,
          timestamp: new Date()
        });
      }
      
      store.set(conversationId, conversation);
      
      // Run cleanup
      cleanupConversationResources();
      
      // Check memory usage
      const finalMemory = process.memoryUsage().heapUsed;
      
      // Memory should be freed after cleanup
      // This is a very rough test as GC behavior can vary
      expect(finalMemory).toBeLessThan(initialMemory + (10 * 100000 * 2));
    });
    
    test('Memory cleanup with concurrent operations', async () => {
      // Get store and create multiple conversations
      const store = getConversationStore();
      
      // Create 50 conversations concurrently
      const promises = [];
      for (let i = 0; i < 50; i++) {
        const conversationId = `conv_${Date.now()}_concurrent_${i}`;
        const isOld = i % 2 === 0; // Make half the conversations old
        
        store.set(conversationId, {
          id: conversationId,
          topic: `Concurrent Test ${i}`,
          userId: 'test-user',
          createdAt: isOld ? 
            new Date(Date.now() - (CONVERSATION_MAX_AGE_MS + 60000)) : 
            new Date(),
          messages: [
            {
              role: 'system',
              content: `Initial message for concurrent test ${i}`,
              timestamp: new Date()
            }
          ]
        });
        
        // For every 10th conversation, make it invalid to test error handling
        if (i % 10 === 0) {
          store.set(conversationId, {
            id: conversationId,
            createdAt: 'invalid-date'
          });
        }
      }
      
      // Run cleanup
      const cleanupCount = cleanupOldConversations();
      
      // Should have cleaned up roughly half (minus the invalid ones)
      expect(cleanupCount).toBeGreaterThan(20);
      expect(store.size).toBeLessThan(30);
    });
    
    test('No memory leaks during rapid operations', async () => {
      // Run garbage collection if available (Node with --expose-gc flag)
      if (global.gc) {
        global.gc();
      }
      
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Rapid creation and deletion
      for (let i = 0; i < 100; i++) {
        // Create
        const response = await request(app)
          .post('/api/conversation/start')
          .set('x-api-key', mockApiKeys.basic)
          .send({
            topic: `rapid-test-${i}`,
            difficultyLevel: 'beginner'
          });
        
        const conversationId = response.body.conversationId;
        
        // Delete immediately
        await request(app)
          .delete(`/api/conversation/${conversationId}`)
          .set('x-api-key', mockApiKeys.basic);
      }
      
      // Run cleanup
      cleanupConversationResources();
      
      // Run garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      
      // Memory should be relatively stable
      // This is a rough test since we can't control GC precisely
      expect(finalMemory).toBeLessThan(initialMemory * 1.5);
    });
  });
  
  // Cleanup interval tests
  describe('Cleanup Interval Tests', () => {
    // Save original setTimeout and setInterval
    const originalSetTimeout = global.setTimeout;
    const originalSetInterval = global.setInterval;
    const originalClearInterval = global.clearInterval;
    
    // Mock timer functions
    beforeEach(() => {
      jest.useFakeTimers();
    });
    
    // Restore original functions
    afterEach(() => {
      jest.useRealTimers();
      global.setTimeout = originalSetTimeout;
      global.setInterval = originalSetInterval;
      global.clearInterval = originalClearInterval;
    });
    
    test('Cleanup interval should run at expected intervals', () => {
      // Mock cleanupOldConversations to track calls
      const originalCleanup = cleanupOldConversations;
      const mockCleanup = jest.fn();
      
      // Override the cleanup function temporarily
      global.cleanupOldConversations = mockCleanup;
      
      // Create a new interval
      const intervalId = setInterval(cleanupOldConversations, 3600000); // 1 hour
      setCleanupInterval(intervalId);
      
      // Fast-forward time by 1 hour
      jest.advanceTimersByTime(3600000);
      
      // Should have been called once
      expect(mockCleanup).toHaveBeenCalledTimes(1);
      
      // Fast-forward by another hour
      jest.advanceTimersByTime(3600000);
      
      // Should have been called twice
      expect(mockCleanup).toHaveBeenCalledTimes(2);
      
      // Restore original function
      global.cleanupOldConversations = originalCleanup;
      
      // Clear the interval
      clearInterval(intervalId);
    });
    
    test('Cleanup interval should be cancelled on shutdown', () => {
      // Create a spy on clearInterval
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      // Create a new interval
      const intervalId = setInterval(cleanupOldConversations, 3600000);
      setCleanupInterval(intervalId);
      
      // Run cleanup resources which should cancel the interval
      cleanupConversationResources();
      
      // The interval should have been cleared
      expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);
      
      // Reset the spy
      clearIntervalSpy.mockRestore();
    });
  });
});

