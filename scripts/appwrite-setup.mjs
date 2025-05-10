/**
 * Appwrite Setup Script
 * 
 * This script sets up the Appwrite collections and indexes for the Spanish Learning App.
 * It creates the necessary database, collections, and attributes.
 */

import { Client, Databases, ID, Permission, Role } from 'node-appwrite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Enable __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const config = {
  endpoint: process.env.APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1',
  projectId: process.env.APPWRITE_PROJECT_ID || '681d86f800324e0f157d',
  apiKey: process.env.APPWRITE_API_KEY || '',
};

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '681d8c0400133cfa6128';
const COLLECTIONS = {
  VOCABULARY: process.env.APPWRITE_VOCABULARY_COLLECTION_ID || '681d8c0e003633624604',
  GRAMMAR: process.env.APPWRITE_GRAMMAR_COLLECTION_ID || 'grammar',
  USER_PROGRESS: process.env.APPWRITE_USER_PROGRESS_COLLECTION_ID || 'user_progress',
};

const client = new Client();
client
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);

const databases = new Databases(client);

/**
 * Create a database ONLY if it doesn't exist
 */
async function createDatabase() {
  try {
    console.log('Checking if database exists...');
    
    try {
      await databases.get(DATABASE_ID);
      console.log(`Database already exists with ID: ${DATABASE_ID}`);
    } catch (error) {
      console.log('Database does not exist, creating...');
      await databases.create(DATABASE_ID, 'Spanish Learning App', [Permission.read(Role.any())]);
      console.log(`Database created with ID: ${DATABASE_ID}`);
    }
  } catch (error) {
    console.error('Error creating database:', error);
    throw error;
  }
}

/**
 * Create the Vocabulary collection ONLY if it doesn't exist
 */
async function createVocabularyCollection() {
  try {
    console.log('Attempting to create Vocabulary collection...');
    
    try {
      await databases.createCollection(
        DATABASE_ID,
        COLLECTIONS.VOCABULARY,
        'Vocabulary',
        [
          Permission.read(Role.any()),
          Permission.create(Role.users()),
          Permission.update(Role.users()),
          Permission.delete(Role.users()),
        ]
      );
      console.log(`Vocabulary collection created with ID: ${COLLECTIONS.VOCABULARY}`);
    } catch (error) {
      if (error.type === 'collection_already_exists' || error.code === 409) {
        console.log(`Vocabulary collection already exists with ID: ${COLLECTIONS.VOCABULARY}`);
      } else {
        throw error;
      }
    }
      console.log('Creating attributes for Vocabulary collection...');
      try {
        await databases.createStringAttribute(
          DATABASE_ID,
          COLLECTIONS.VOCABULARY,
          'word',
          255,
          true
        );
        console.log('Created word attribute');
      } catch (error) {
        if (error.code === 409) {
          console.log('word attribute already exists');
        } else {
          throw error;
        }
      }
      
      try {
        await databases.createStringAttribute(
          DATABASE_ID,
          COLLECTIONS.VOCABULARY,
          'translation',
          255,
          true
        );
        console.log('Created translation attribute');
      } catch (error) {
        if (error.code === 409) {
          console.log('translation attribute already exists');
        } else {
          throw error;
        }
      }
      
      try {
        await databases.createStringAttribute(
          DATABASE_ID,
          COLLECTIONS.VOCABULARY,
          'usageExamples',
          255,
          false,
          undefined,
          true
        );
        console.log('Created usageExamples attribute');
      } catch (error) {
        if (error.code === 409) {
          console.log('usageExamples attribute already exists');
        } else {
          throw error;
        }
      }
      
      try {
        await databases.createEnumAttribute(
          DATABASE_ID,
          COLLECTIONS.VOCABULARY,
          'category',
          [
            'noun',
            'verb',
            'adjective',
            'adverb',
            'preposition',
            'conjunction',
            'pronoun',
            'interjection',
            'article',
            'other'
          ],
          true
        );
        console.log('Created category attribute');
      } catch (error) {
        if (error.code === 409) {
          console.log('category attribute already exists');
        } else {
          throw error;
        }
      }
      
      try {
        await databases.createEnumAttribute(
          DATABASE_ID,
          COLLECTIONS.VOCABULARY,
          'difficultyLevel',
          ['beginner', 'intermediate', 'advanced'],
          true
        );
        console.log('Created difficultyLevel attribute');
      } catch (error) {
        if (error.code === 409) {
          console.log('difficultyLevel attribute already exists');
        } else {
          throw error;
        }
      }
      
      try {
        await databases.createStringAttribute(
          DATABASE_ID,
          COLLECTIONS.VOCABULARY,
          'notes',
          2000,
          false
        );
        console.log('Created notes attribute');
      } catch (error) {
        if (error.code === 409) {
          console.log('notes attribute already exists');
        } else {
          throw error;
        }
      }
      
      try {
        await databases.createIndex(
          DATABASE_ID,
          COLLECTIONS.VOCABULARY,
          'word_index',
          'key',
          ['word'],
          ['ASC']
        );
        console.log('Created word_index');
      } catch (error) {
        if (error.code === 409) {
          console.log('word_index already exists');
        } else if (error.type === 'index_invalid' || error.code === 400) {
          console.log('Could not create word_index due to length limitations');
        } else {
          throw error;
        }
      }
      
      try {
        await databases.createIndex(
          DATABASE_ID,
          COLLECTIONS.VOCABULARY,
          'category_difficulty_index',
          'key',
          ['category', 'difficultyLevel'],
          ['ASC', 'ASC']
        );
        console.log('Created category_difficulty_index');
      } catch (error) {
        if (error.code === 409) {
          console.log('category_difficulty_index already exists');
        } else if (error.type === 'index_invalid' || error.code === 400) {
          console.log('Could not create category_difficulty_index due to length limitations');
        } else {
          throw error;
        }
      }
      
      console.log('Vocabulary collection attributes and indexes created successfully');
  } catch (error) {
    console.error('Error creating Vocabulary collection:', error);
    throw error;
  }
}

/**
 * Create the Grammar collection if it doesn't exist
 */
async function createGrammarCollection() {
  try {
    console.log('Attempting to create Grammar collection...');
    
    try {
      await databases.createCollection(
        DATABASE_ID,
        COLLECTIONS.GRAMMAR,
        'Grammar',
        [
          Permission.read(Role.any()),
          Permission.create(Role.users()),
          Permission.update(Role.users()),
          Permission.delete(Role.users()),
        ]
      );
      console.log(`Grammar collection created with ID: ${COLLECTIONS.GRAMMAR}`);
    } catch (error) {
      if (error.type === 'collection_already_exists' || error.code === 409) {
        console.log(`Grammar collection already exists with ID: ${COLLECTIONS.GRAMMAR}`);
      } else {
        throw error;
      }
    }
      console.log('Creating attributes for Grammar collection...');
      
      try {
        await databases.createStringAttribute(
          DATABASE_ID,
          COLLECTIONS.GRAMMAR,
          'title',
          255,
          true
        );
        console.log('Created title attribute');
      } catch (error) {
        if (error.code === 409) {
          console.log('title attribute already exists');
        } else {
          throw error;
        }
      }
      
      try {
        await databases.createEnumAttribute(
          DATABASE_ID,
          COLLECTIONS.GRAMMAR,
          'category',
          [
            'verb_tense',
            'verb_conjugation',
            'pronouns',
            'articles',
            'prepositions',
            'adjectives',
            'adverbs',
            'sentence_structure',
            'questions',
            'negation',
            'other'
          ],
          true
        );
        console.log('Created category attribute');
      } catch (error) {
        if (error.code === 409) {
          console.log('category attribute already exists');
        } else {
          throw error;
        }
      }
      
      try {
        await databases.createStringAttribute(
          DATABASE_ID,
          COLLECTIONS.GRAMMAR,
          'explanation',
          5000,
          true
        );
        console.log('Created explanation attribute');
      } catch (error) {
        if (error.code === 409) {
          console.log('explanation attribute already exists');
        } else {
          throw error;
        }
      }
      
      try {
        await databases.createStringAttribute(
          DATABASE_ID,
          COLLECTIONS.GRAMMAR,
          'examples',
          5000,
          true,
          undefined,
          true
        );
        console.log('Created examples attribute');
      } catch (error) {
        if (error.code === 409) {
          console.log('examples attribute already exists');
        } else {
          throw error;
        }
      }
      
      try {
        await databases.createEnumAttribute(
          DATABASE_ID,
          COLLECTIONS.GRAMMAR,
          'difficultyLevel',
          ['beginner', 'intermediate', 'advanced'],
          true
        );
        console.log('Created difficultyLevel attribute');
      } catch (error) {
        if (error.code === 409) {
          console.log('difficultyLevel attribute already exists');
        } else {
          throw error;
        }
      }
      
      try {
        await databases.createStringAttribute(
          DATABASE_ID,
          COLLECTIONS.GRAMMAR,
          'exerciseTemplates',
          10000,
          false,
          undefined,
          true
        );
        console.log('Created exerciseTemplates attribute');
      } catch (error) {
        if (error.code === 409) {
          console.log('exerciseTemplates attribute already exists');
        } else {
          throw error;
        }
      }
      
      try {
        await databases.createStringAttribute(
          DATABASE_ID,
          COLLECTIONS.GRAMMAR,
          'relatedVocabulary',
          255,
          false,
          undefined,
          true
        );
        console.log('Created relatedVocabulary attribute');
      } catch (error) {
        if (error.code === 409) {
          console.log('relatedVocabulary attribute already exists');
        } else {
          throw error;
        }
      }
      
      try {
        await databases.createStringAttribute(
          DATABASE_ID,
          COLLECTIONS.GRAMMAR,
          'tags',
          255,
          false,
          undefined,
          true
        );
        console.log('Created tags attribute');
      } catch (error) {
        if (error.code === 409) {
          console.log('tags attribute already exists');
        } else {
          throw error;
        }
      }
      
      try {
        await databases.createIndex(
          DATABASE_ID,
          COLLECTIONS.GRAMMAR,
          'title_index',
          'key',
          ['title'],
          ['ASC']
        );
        console.log('Created title_index');
      } catch (error) {
        if (error.code === 409) {
          console.log('title_index already exists');
        } else if (error.type === 'index_invalid' || error.code === 400) {
          console.log('Could not create title_index due to length limitations');
        } else {
          throw error;
        }
      }
      
      try {
        await databases.createIndex(
          DATABASE_ID,
          COLLECTIONS.GRAMMAR,
          'category_difficulty_index',
          'key',
          ['category', 'difficultyLevel'],
          ['ASC', 'ASC']
        );
        console.log('Created category_difficulty_index');
      } catch (error) {
        if (error.code === 409) {
          console.log('category_difficulty_index already exists');
        } else if (error.type === 'index_invalid' || error.code === 400) {
          console.log('Could not create category_difficulty_index due to length limitations');
        } else {
          throw error;
        }
      }
      
      console.log('Grammar collection attributes and indexes created successfully');
  } catch (error) {
    console.error('Error creating Grammar collection:', error);
    throw error;
  }
}

/**
 * Create the UserProgress collection if it doesn't exist
 */
async function createUserProgressCollection() {
  try {
    console.log('Attempting to create UserProgress collection...');
    
    try {
      await databases.createCollection(
        DATABASE_ID,
        COLLECTIONS.USER_PROGRESS,
        'User Progress',
        [
          Permission.read(Role.user('userId')),
          Permission.create(Role.users()),
          Permission.update(Role.user('userId')),
          Permission.delete(Role.user('userId')),
        ]
      );
      console.log(`UserProgress collection created with ID: ${COLLECTIONS.USER_PROGRESS}`);
    } catch (error) {
      if (error.type === 'collection_already_exists' || error.code === 409) {
        console.log(`UserProgress collection already exists with ID: ${COLLECTIONS.USER_PROGRESS}`);
      } else {
        throw error;
      }
    }
      console.log('Creating attributes for UserProgress collection...');
      
      try {
        await databases.createStringAttribute(
          DATABASE_ID,
          COLLECTIONS.USER_PROGRESS,
          'userId',
          255,
          true
        );
        console.log('Created userId attribute');
      } catch (error) {
        if (error.code === 409) {
          console.log('userId attribute already exists');
        } else if (error.type === 'attribute_limit_exceeded' || error.code === 400) {
          console.log('Could not create userId attribute due to attribute limit');
        } else {
          throw error;
        }
      }
      
      try {
        await databases.createStringAttribute(
          DATABASE_ID,
          COLLECTIONS.USER_PROGRESS,
          'vocabularyProgress',
          10000,
          false
        );
        console.log('Created vocabularyProgress attribute');
      } catch (error) {
        if (error.code === 409) {
          console.log('vocabularyProgress attribute already exists');
        } else if (error.type === 'attribute_limit_exceeded' || error.code === 400) {
          console.log('Could not create vocabularyProgress attribute due to attribute limit');
        } else {
          throw error;
        }
      }
      
      try {
        await databases.createStringAttribute(
          DATABASE_ID,
          COLLECTIONS.USER_PROGRESS,
          'grammarProgress',
          10000,
          false
        );
        console.log('Created grammarProgress attribute');
      } catch (error) {
        if (error.code === 409) {
          console.log('grammarProgress attribute already exists');
        } else if (error.type === 'attribute_limit_exceeded' || error.code === 400) {
          console.log('Could not create grammarProgress attribute due to attribute limit');
        } else {
          throw error;
        }
      }
      
      try {
        await databases.createIndex(
          DATABASE_ID,
          COLLECTIONS.USER_PROGRESS,
          'userId_index',
          'key',
          ['userId'],
          ['ASC']
        );
        console.log('Created userId_index');
      } catch (error) {
        if (error.code === 409) {
          console.log('userId_index already exists');
        } else if (error.type === 'index_invalid' || error.code === 400) {
          console.log('Could not create userId_index due to length limitations');
        } else {
          throw error;
        }
      }
      
      console.log('UserProgress collection attributes and indexes created successfully');
  } catch (error) {
    console.error('Error creating UserProgress collection:', error);
    throw error;
  }
}

/**
 * Main function to run the setup
 */
async function main() {
  try {
    console.log('Starting Appwrite setup...');
    
    if (!config.apiKey) {
      throw new Error('APPWRITE_API_KEY is required. Please set it in your .env file.');
    }
    
    console.log(`Using existing database with ID: ${DATABASE_ID}`);
    await createVocabularyCollection();
    await createGrammarCollection();
    await createUserProgressCollection();
    
    console.log('Appwrite setup completed successfully!');
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

main();