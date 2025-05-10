/**
 * Appwrite client configuration and database helpers
 * Optimized for Spanish Learning MCP core functionality
 */
import { Client, Databases, Query, Models } from 'appwrite';

let client: Client;
let databases: Databases;

export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
export const COLLECTIONS = {
  VOCABULARY: process.env.NEXT_PUBLIC_APPWRITE_VOCABULARY_COLLECTION_ID,
  GRAMMAR: process.env.NEXT_PUBLIC_APPWRITE_GRAMMAR_COLLECTION_ID,
};

export enum WordCategory {
  NOUN = 'noun',
  VERB = 'verb',
  ADJECTIVE = 'adjective',
  ADVERB = 'adverb',
  PREPOSITION = 'preposition',
  CONJUNCTION = 'conjunction',
  PRONOUN = 'pronoun',
  INTERJECTION = 'interjection',
  ARTICLE = 'article',
  OTHER = 'other'
}

export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced'
}

export enum GrammarCategory {
  VERB_TENSE = 'verb_tense',
  VERB_CONJUGATION = 'verb_conjugation',
  PRONOUNS = 'pronouns',
  ARTICLES = 'articles',
  PREPOSITIONS = 'prepositions',
  ADJECTIVES = 'adjectives',
  ADVERBS = 'adverbs',
  SENTENCE_STRUCTURE = 'sentence_structure',
  QUESTIONS = 'questions',
  NEGATION = 'negation',
  OTHER = 'other'
}

export interface UsageExample {
  spanish: string;
  english: string;
  explanation?: string;
}

export interface VocabularyModel extends Models.Document {
  word: string;
  translation: string;
  usageExamples: UsageExample[];
  category: WordCategory;
  difficultyLevel: DifficultyLevel;
  notes?: string;
}

export interface Example {
  spanish: string;
  english: string;
  explanation?: string;
}

export interface GrammarModel extends Models.Document {
  title: string;
  category: GrammarCategory;
  explanation: string;
  examples: Example[];
  difficultyLevel: DifficultyLevel;
  relatedVocabulary: string[]; // Array of vocabulary document IDs because we can't store full objects in Appwrite
  tags: string[];
}

/**
 * Helper functions for converting UsageExample objects to/from strings for Appwrite storage
 */

export const parseUsageExamples = (exampleStrings: string[]): UsageExample[] => {
  return exampleStrings.map(str => {
    try {
      return JSON.parse(str) as UsageExample;
    } catch (e) {
      console.error('Error parsing usage example:', e);
      return { spanish: 'Error parsing example', english: 'Error parsing example' };
    }
  });
};

/**
 * Initialize the Appwrite client
 */
export const initAppwrite = () => {
  if (!client) {
    client = new Client();
    
    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
    
    if (!projectId) {
      console.warn('Appwrite Project ID not found in environment variables');
      return { client: null, databases: null };
    }
    
    client
      .setEndpoint(endpoint)
      .setProject(projectId);
      
    databases = new Databases(client);
  }
  
  return { client, databases };
};

/**
 * Core data retrieval functions for MCP
 */

export const getVocabularyItems = async (
  filters: { 
    category?: WordCategory; 
    difficultyLevel?: DifficultyLevel; 
    searchTerm?: string; 
  } = {},
  pagination: { limit?: number; offset?: number } = {}
) => {
  const { databases } = initAppwrite();
  
  if (!databases || !DATABASE_ID || !COLLECTIONS.VOCABULARY) {
    console.warn('Appwrite not properly configured');
    return { items: [], meta: { total: 0, limit: 0, offset: 0, hasMoreItems: false } };
  }
  
  const queries: string[] = [];
  
  if (filters.category) {
    queries.push(Query.equal('category', filters.category));
  }
  
  if (filters.difficultyLevel) {
    queries.push(Query.equal('difficultyLevel', filters.difficultyLevel));
  }
  
  if (filters.searchTerm) {
    queries.push(Query.search('word', filters.searchTerm));
    queries.push(Query.search('translation', filters.searchTerm));
  }
  
  const limit = pagination.limit || 10;
  const offset = pagination.offset || 0;
  queries.push(Query.limit(limit));
  queries.push(Query.offset(offset));
  
  try {
    const response = await databases.listDocuments<VocabularyModel>(
      DATABASE_ID,
      COLLECTIONS.VOCABULARY,
      queries
    );
    
    const itemsWithParsedExamples = response.documents.map(doc => ({
      ...doc,
      usageExamples: parseUsageExamples(doc.usageExamples as unknown as string[])
    }));

    return {
      items: itemsWithParsedExamples,
      meta: {
        total: response.total,
        limit,
        offset,
        hasMoreItems: offset + limit < response.total
      }
    };
  } catch (error) {
    console.error('Error fetching vocabulary items:', error);
    return { items: [], meta: { total: 0, limit, offset, hasMoreItems: false } };
  }
};

export const getGrammarRules = async (
  filters: { 
    category?: GrammarCategory; 
    difficultyLevel?: DifficultyLevel; 
    tag?: string; 
    searchTerm?: string; 
  } = {},
  pagination: { limit?: number; offset?: number } = {}
) => {
  const { databases } = initAppwrite();
  
  if (!databases || !DATABASE_ID || !COLLECTIONS.GRAMMAR) {
    console.warn('Appwrite not properly configured');
    return { items: [], meta: { total: 0, limit: 0, offset: 0, hasMoreItems: false } };
  }
  
  const queries: string[] = [];
  
  if (filters.category) {
    queries.push(Query.equal('category', filters.category));
  }
  
  if (filters.difficultyLevel) {
    queries.push(Query.equal('difficultyLevel', filters.difficultyLevel));
  }
  
  if (filters.tag) {
    queries.push(Query.search('tags', filters.tag));
  }
  
  if (filters.searchTerm) {
    queries.push(Query.search('title', filters.searchTerm));
    queries.push(Query.search('explanation', filters.searchTerm));
  }
  
  const limit = pagination.limit || 10;
  const offset = pagination.offset || 0;
  queries.push(Query.limit(limit));
  queries.push(Query.offset(offset));
  
  try {
    const response = await databases.listDocuments<GrammarModel>(
      DATABASE_ID,
      COLLECTIONS.GRAMMAR,
      queries
    );
    
    return {
      items: response.documents,
      meta: {
        total: response.total,
        limit,
        offset,
        hasMoreItems: offset + limit < response.total
      }
    };
  } catch (error) {
    console.error('Error fetching grammar rules:', error);
    return { items: [], meta: { total: 0, limit, offset, hasMoreItems: false } };
  }
};
