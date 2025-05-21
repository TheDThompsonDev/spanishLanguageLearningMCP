# Appwrite Authentication for Spanish Learning MCP

This document explains how to use Appwrite for authentication and tier-based access control in the Spanish Learning MCP Server.

## Overview

Instead of using custom API keys, this implementation leverages Appwrite's authentication system combined with a database collection for storing user tier information. This approach:

1. Provides robust user authentication with Appwrite's security features
2. Stores user tier information in an Appwrite collection
3. Maintains a single global API key for API clients that can't use session cookies
4. Allows changing user tiers without issuing new API keys

## How It Works

1. Users authenticate through Appwrite's authentication system
2. User tier information is stored in an Appwrite collection
3. The server checks the user's tier when processing requests
4. API clients can use either session cookies or a global API key + user ID

## Setting Up

### 1. Configure Appwrite

1. Create an Appwrite project
2. Set up a database with the following collections:

   - Vocabulary collection
   - Grammar collection
   - User tiers collection

3. For the user tiers collection, create these attributes:

   - `userId` (string, required) - The Appwrite user ID
   - `tier` (enum["free", "basic", "premium"], required) - The user's tier level
   - `updatedAt` (integer, required) - Timestamp of the last update

4. Create an index on the `userId` field for faster queries

### 2. Configure Environment Variables

Add the following variables to your `.env` file:

```
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_appwrite_project_id
NEXT_PUBLIC_APPWRITE_DATABASE_ID=your_appwrite_database_id
NEXT_PUBLIC_APPWRITE_VOCABULARY_COLLECTION_ID=your_vocabulary_collection_id
NEXT_PUBLIC_APPWRITE_GRAMMAR_COLLECTION_ID=your_grammar_collection_id
NEXT_PUBLIC_APPWRITE_USER_TIERS_COLLECTION_ID=your_user_tiers_collection_id

# Global API Key (for API clients)
GLOBAL_API_KEY=your_secure_global_key
```

### 3. Initialize Appwrite in Your Application

```javascript
import {
  initAppwrite,
  ensureUserTiersCollection,
} from "./lib/appwrite-auth.js";

// Initialize Appwrite
initAppwrite();

// Ensure the user tiers collection exists
ensureUserTiersCollection();
```

## Authentication Methods

### 1. Web Application Authentication (Session Cookies)

For web applications, users can authenticate using Appwrite's session cookies:

```javascript
import { login, logout, getCurrentUser } from "./lib/appwrite-auth.js";

// Login
const user = await login("user@example.com", "password");
if (user) {
  console.log(`Logged in as ${user.name} with ${user.tier} tier`);
}

// Get current user
const currentUser = await getCurrentUser();
if (currentUser) {
  console.log(`Current user: ${currentUser.name}`);
}

// Logout
await logout();
```

### 2. API Authentication (Global API Key + User ID)

For API clients that can't use session cookies, use the global API key and user ID:

```bash
curl -X POST http://localhost:3000/api/mcp/query \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_global_api_key" \
  -H "x-user-id: appwrite_user_id" \
  -d '{
    "query": "How do I say hello in Spanish?",
    "contextType": "vocabulary"
  }'
```

## User Management

### Creating a New User

```javascript
import { createUser } from "./lib/appwrite-auth.js";

// Create a new user with premium tier
const user = await createUser(
  "user@example.com",
  "secure-password",
  "John Doe",
  "premium"
);

if (user) {
  console.log(`Created user ${user.id} with ${user.tier} tier`);
}
```

### Updating a User's Tier

```javascript
import { setUserTier } from "./lib/appwrite-auth.js";

// Update a user's tier
const success = await setUserTier("user-id", "premium");
if (success) {
  console.log("User tier updated successfully");
}
```

## Middleware Usage

The authentication middleware can be used in Express routes:

```javascript
import { appwriteAuth, apiKeyAuth, requireTier } from "./middleware/auth.js";

// Route with session-based authentication
app.use("/api/user-profile", appwriteAuth, (req, res) => {
  res.json({ user: req.user });
});

// Route with API key authentication
app.use("/api/mcp/query", apiKeyAuth, (req, res) => {
  // Process the request with user tier information
  const tier = req.user.tier;
  // ...
});

// Route that requires premium tier
app.use(
  "/api/premium-feature",
  apiKeyAuth,
  requireTier("premium"),
  (req, res) => {
    res.json({ message: "Premium feature accessed successfully" });
  }
);
```

## Benefits Over Custom API Keys

1. **Robust Authentication**: Leverages Appwrite's secure authentication system
2. **Flexible Tier Management**: Change user tiers without issuing new API keys
3. **Multiple Authentication Methods**: Support for both session cookies and API key authentication
4. **Centralized User Management**: All user data is stored in Appwrite
5. **Scalability**: Appwrite handles the authentication infrastructure

This approach provides a more robust and scalable authentication system while maintaining the flexibility of the single API key approach for API clients.
