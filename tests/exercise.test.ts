/**
 * Exercise functionality tests for the Spanish Learning MCP Server
 * 
 * These tests validate that exercise features work correctly, including
 * exercise generation, checking, and tier-specific functionality.
 */
import request from 'supertest';
import { app } from '../server.js';
import { registerApiKey } from '../middleware/auth.js';

// Mock API keys for testing
const mockApiKeys = {
  free: registerApiKey('test-free-user-ex', 'free', 'Test Free User'),
  basic: registerApiKey('test-basic-user-ex', 'basic', 'Test Basic User'),
  premium: registerApiKey('test-premium-user-ex', 'premium', 'Test Premium User')
};

// Mock the MCP instance to avoid actual API calls during tests
jest.mock('../lib/mcp-module.js', () => {
  const original = jest.requireActual('../lib/mcp-module.js');
  
  return {
    ...original,
    createSpanishMcp: () => ({
      getContext: jest.fn().mockResolvedValue('Mocked context'),
      queryWithContext: jest.fn().mockResolvedValue(JSON.stringify({
        exercises: [
          {
            id: 'ex1',
            instruction: 'Translate this sentence',
            content: '¿Cómo te llamas?',
            correctAnswer: 'What is your name?',
            explanation: 'Basic greeting question'
          },
          {
            id: 'ex2',
            instruction: 'Choose the correct word',
            content: 'El niño ___ a la escuela.',
            options: ['va', 'vas', 'voy', 'vamos'],
            correctAnswer: 'va',
            explanation: 'Third person singular of ir'
          }
        ]
      })),
      config: { model: 'mocked-model' }
    })
  };
});

describe('Exercise Functionality Tests', () => {
  test('Exercise generation should return valid exercises', async () => {
    const response = await request(app)
      .post('/api/exercise/generate')
      .set('x-api-key', mockApiKeys.basic)
      .send({
        type: 'multiple_choice',
        difficultyLevel: 'beginner',
        count: 2
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('exerciseSetId');
    expect(response.body).toHaveProperty('exercises');
    expect(Array.isArray(response.body.exercises)).toBe(true);
  });
  
  test('Basic tier users cannot access premium exercise types', async () => {
    const response = await request(app)
      .post('/api/exercise/generate')
      .set('x-api-key', mockApiKeys.basic)
      .send({
        type: 'translation', // Premium only
        difficultyLevel: 'beginner',
        count: 2
      });
    
    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error');
  });
  
  test('Exercise answers can be checked with feedback', async () => {
    // First generate an exercise set
    const genResponse = await request(app)
      .post('/api/exercise/generate')
      .set('x-api-key', mockApiKeys.basic)
      .send({
        type: 'multiple_choice',
        difficultyLevel: 'beginner',
        count: 2
      });
    
    const exerciseSetId = genResponse.body.exerciseSetId;
    
    // Then check answers
    const checkResponse = await request(app)
      .post('/api/exercise/check')
      .set('x-api-key', mockApiKeys.basic)
      .send({
        exerciseId: exerciseSetId,
        answers: [
          { id: 'ex1', answer: 'What is your name?' },
          { id: 'ex2', answer: 'va' }
        ],
        timeTaken: 120
      });
    
    expect(checkResponse.status).toBe(200);
    expect(checkResponse.body).toHaveProperty('results');
    expect(Array.isArray(checkResponse.body.results)).toBe(true);
    expect(checkResponse.body.results.length).toBe(2);
    expect(checkResponse.body).toHaveProperty('score');
    expect(checkResponse.body.score).toHaveProperty('correct');
    expect(checkResponse.body.score).toHaveProperty('total');
    expect(checkResponse.body.score).toHaveProperty('percentage');
  });
  
  test('Premium users get more detailed exercise feedback', async () => {
    // Generate and check for premium user
    const genResponse = await request(app)
      .post('/api/exercise/generate')
      .set('x-api-key', mockApiKeys.premium)
      .send({
        type: 'vocabulary_matching',
        difficultyLevel: 'beginner',
        count: 2
      });
    
    const exerciseSetId = genResponse.body.exerciseSetId;
    
    const premiumResponse = await request(app)
      .post('/api/exercise/check')
      .set('x-api-key', mockApiKeys.premium)
      .send({
        exerciseId: exerciseSetId,
        answers: [
          { id: 'ex1', answer: 'What is your name?' },
          { id: 'ex2', answer: 'va' }
        ],
        timeTaken: 120
      });
    
    // Generate and check for basic user
    const basicGenResponse = await request(app)
      .post('/api/exercise/generate')
      .set('x-api-key', mockApiKeys.basic)
      .send({
        type: 'vocabulary_matching',
        difficultyLevel: 'beginner',
        count: 2
      });
    
    const basicExerciseSetId = basicGenResponse.body.exerciseSetId;
    
    const basicResponse = await request(app)
      .post('/api/exercise/check')
      .set('x-api-key', mockApiKeys.basic)
      .send({
        exerciseId: basicExerciseSetId,
        answers: [
          { id: 'ex1', answer: 'What is your name?' },
          { id: 'ex2', answer: 'va' }
        ],
        timeTaken: 120
      });
    
    // Premium users should get detailed feedback
    expect(premiumResponse.body).toHaveProperty('detailedFeedback');
    expect(premiumResponse.body.detailedFeedback).toHaveProperty('strengths');
    expect(premiumResponse.body.detailedFeedback).toHaveProperty('weaknesses');
    
    // Basic users should not get detailed feedback
    expect(basicResponse.body.detailedFeedback).toBeUndefined();
  });
  
  test('Premium users can access exercise history', async () => {
    const response = await request(app)
      .get('/api/exercise/history')
      .set('x-api-key', mockApiKeys.premium);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('history');
    expect(Array.isArray(response.body.history)).toBe(true);
    expect(response.body).toHaveProperty('summary');
    expect(response.body.summary).toHaveProperty('totalExercises');
    
    // Premium users should get more detailed history
    expect(response.body.summary).toHaveProperty('streakDays');
    expect(response.body.summary).toHaveProperty('strongestAreas');
  });
  
  test('Basic users get simpler exercise history', async () => {
    const response = await request(app)
      .get('/api/exercise/history')
      .set('x-api-key', mockApiKeys.basic);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('history');
    expect(Array.isArray(response.body.history)).toBe(true);
    expect(response.body).toHaveProperty('summary');
    expect(response.body.summary).toHaveProperty('totalExercises');
    
    // Basic users should not get detailed history info
    expect(response.body.summary.streakDays).toBeUndefined();
    expect(response.body.summary.strongestAreas).toBeUndefined();
  });
  
  test('Free tier users have limited exercise count', async () => {
    const freeResponse = await request(app)
      .post('/api/exercise/generate')
      .set('x-api-key', mockApiKeys.free)
      .send({
        type: 'multiple_choice',
        difficultyLevel: 'beginner',
        count: 10 // More than the free tier limit
      });
    
    const premiumResponse = await request(app)
      .post('/api/exercise/generate')
      .set('x-api-key', mockApiKeys.premium)
      .send({
        type: 'multiple_choice',
        difficultyLevel: 'beginner',
        count: 10
      });
    
    // Free tier should be limited
    expect(freeResponse.body.metadata.count).toBeLessThan(10);
    
    // Premium tier should get full count
    expect(premiumResponse.body.metadata.count).toBe(10);
  });
});

