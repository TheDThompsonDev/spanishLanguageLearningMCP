# Single API Key Authentication

This document explains how to use the single API key authentication system in the Spanish Learning MCP Server.

## Overview

Instead of requiring each user to have their own API key, this system uses a single global API key combined with user identification. This approach:

1. Simplifies API key management
2. Allows changing user tiers without issuing new API keys
3. Maintains security while improving usability

## How It Works

1. A single `GLOBAL_API_KEY` is used for all regular users
2. Each user has an ID and an associated tier level (free, basic, premium)
3. API requests include both the API key and the user ID
4. The server identifies the user and applies the appropriate tier restrictions

## Setting Up

1. Set the `GLOBAL_API_KEY` environment variable in your `.env` file:

   ```
   GLOBAL_API_KEY=your-secure-global-key
   ADMIN_API_KEY=your-secure-admin-key
   ```

2. Register users with their tier levels using the admin API:

   ```bash
   curl -X POST http://localhost:3000/api/users \
     -H "Content-Type: application/json" \
     -H "x-admin-key: your-admin-key" \
     -d '{
       "userId": "user123",
       "name": "Example User",
       "tier": "basic"
     }'
   ```

3. Share the global API key with all users, along with their unique user ID

## Making API Requests

When making requests to the API, include both the global API key and the user ID in the headers:

```bash
curl -X POST http://localhost:3000/api/mcp/query \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-global-api-key" \
  -H "x-user-id: user123" \
  -d '{
    "query": "How do I say hello in Spanish?",
    "contextType": "vocabulary"
  }'
```

## Changing User Tiers

To change a user's tier level, use the admin API:

```bash
curl -X PUT http://localhost:3000/api/users/user123/tier \
  -H "Content-Type: application/json" \
  -H "x-admin-key: your-admin-key" \
  -d '{
    "tier": "premium"
  }'
```

The user can continue using the same global API key, but will now have access to premium features.

## Tier-Based Restrictions

The system automatically applies different restrictions based on the user's tier:

- **Free tier**: Limited context size, basic features only
- **Basic tier**: Medium context size, access to conversation features
- **Premium tier**: Large context size, access to all features including advanced options

These restrictions are applied server-side, so users cannot bypass them even with the global API key.

## Security Considerations

1. Keep the `GLOBAL_API_KEY` and `ADMIN_API_KEY` secure
2. Use HTTPS for all API requests in production
3. Consider implementing additional security measures like rate limiting by IP address

## Example Implementation

Check out the `examples/single-api-key-demo.js` file for a complete example of how to use this authentication system.

## Benefits Over Multiple API Keys

1. **Simplified Management**: Only one API key to distribute and manage
2. **Flexible Tier Changes**: Change user tiers without issuing new API keys
3. **Consistent User Experience**: Users don't need to update their API key when their tier changes
4. **Centralized Control**: All user tiers are managed server-side
5. **Reduced Overhead**: Fewer API keys to track and validate

This approach provides the same level of access control as individual API keys while being more user-friendly and easier to manage.
