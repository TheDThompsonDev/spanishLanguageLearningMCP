/**
 * Appwrite Authentication Demo for Spanish Learning MCP
 * 
 * This example demonstrates how to use Appwrite for authentication
 * with different user tiers.
 */

const { Client, Account, ID } = require('appwrite');
const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const API_URL = 'http://localhost:3000';
const GLOBAL_API_KEY = process.env.GLOBAL_API_KEY || 'default-api-key';
const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

const client = new Client();
client
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

const account = new Account(client);

async function makeSessionRequest(endpoint, method = 'GET', data = null) {
  try {
    const response = await axios({
      method,
      url: `${API_URL}${endpoint}`,
      data,
      withCredentials: true // Important for sending cookies
    });
    
    return response.data;
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    return null;
  }
}

async function makeApiKeyRequest(endpoint, method = 'GET', data = null, userId) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': GLOBAL_API_KEY,
      'x-user-id': userId
    };
    
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

async function createAppwriteUser(email, password, name, tier = 'free') {
  try {
    const user = await account.create(
      ID.unique(),
      email,
      password,
      name
    );
    
    console.log(`Created Appwrite user: ${user.$id}`);
    
    const result = await makeApiKeyRequest('/api/users', 'POST', {
      userId: user.$id,
      name,
      tier
    }, user.$id);
    
    if (result) {
      console.log(`Set user tier to ${tier}`);
    }
    
    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
}

async function loginWithAppwrite(email, password) {
  try {
    const session = await account.createSession(email, password);
    console.log('Session created:', session.$id);
    
    const user = await account.get();
    console.log(`Logged in as: ${user.name} (${user.$id})`);
    
    return user;
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
}

async function testWithSession() {
  console.log('\nTesting with session authentication:');
  console.log('\n1. Getting user profile:');
  const profileResult = await makeSessionRequest('/api/user-profile');
  
  if (profileResult) {
    console.log('Profile retrieved!');
    console.log(`User: ${profileResult.user.name}`);
    console.log(`Tier: ${profileResult.user.tier}`);
  }
  
  console.log('\n2. Making MCP query:');
  const queryResult = await makeSessionRequest('/api/mcp/query', 'POST', {
    query: 'How do I say hello in Spanish?',
    contextType: 'vocabulary',
    categories: ['greeting']
  });
  
  if (queryResult) {
    console.log('Query successful!');
    console.log(`Response length: ${queryResult.response?.length} characters`);
  }
}

async function testWithApiKey(userId) {
  console.log('\nTesting with API key authentication:');
  console.log('\n1. Making MCP query with API key:');
  const queryResult = await makeApiKeyRequest('/api/mcp/query', 'POST', {
    query: 'How do I say goodbye in Spanish?',
    contextType: 'vocabulary',
    categories: ['greeting']
  }, userId);
  
  if (queryResult) {
    console.log('Query successful!');
    console.log(`User tier: ${queryResult.user?.tier}`);
    console.log(`Response length: ${queryResult.response?.length} characters`);
  }
}

async function logout() {
  try {
    await account.deleteSession('current');
    console.log('Logged out successfully');
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
}

async function main() {
  console.log('Spanish Learning MCP - Appwrite Authentication Demo\n');
  
  if (!APPWRITE_PROJECT_ID) {
    console.error('Appwrite Project ID not configured. Please set NEXT_PUBLIC_APPWRITE_PROJECT_ID environment variable.');
    rl.close();
    return;
  }
  
  // Check server health
  try {
    const health = await axios.get(`${API_URL}/health`);
    if (health.data.status !== 'ok') {
      console.error('Server is not healthy');
      rl.close();
      return;
    }
    console.log('Server is running and healthy');
  } catch (error) {
    console.error('Server is not running or not accessible');
    rl.close();
    return;
  }
  
  while (true) {
    console.log('\nOptions:');
    console.log('1. Create a new user');
    console.log('2. Login with existing user');
    console.log('3. Test with API key');
    console.log('4. Exit');
    
    const choice = await new Promise(resolve => {
      rl.question('\nSelect an option (1-4): ', resolve);
    });
    
    switch (choice) {
      case '1': {
        const email = await new Promise(resolve => {
          rl.question('Email: ', resolve);
        });
        
        const password = await new Promise(resolve => {
          rl.question('Password: ', resolve);
        });
        
        const name = await new Promise(resolve => {
          rl.question('Name: ', resolve);
        });
        
        const tier = await new Promise(resolve => {
          rl.question('Tier (free, basic, premium): ', resolve);
        });
        
        await createAppwriteUser(email, password, name, tier);
        break;
      }
      
      case '2': {
        const email = await new Promise(resolve => {
          rl.question('Email: ', resolve);
        });
        
        const password = await new Promise(resolve => {
          rl.question('Password: ', resolve);
        });
        
        const user = await loginWithAppwrite(email, password);
        
        if (user) {
          await testWithSession();
          
          const logoutNow = await new Promise(resolve => {
            rl.question('\nLogout now? (y/n): ', resolve);
          });
          
          if (logoutNow.toLowerCase() === 'y') {
            await logout();
          }
        }
        break;
      }
      
      case '3': {
        const userId = await new Promise(resolve => {
          rl.question('User ID: ', resolve);
        });
        
        await testWithApiKey(userId);
        break;
      }
      
      case '4':
        console.log('Exiting...');
        rl.close();
        return;
      
      default:
        console.log('Invalid option. Please try again.');
    }
  }
}

// Run the demo
main().catch(console.error);