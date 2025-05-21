# Spanish Learning MCP - Visual Demo

This is a visual demonstration of the Spanish Learning MCP (Model Context Protocol) with Appwrite authentication and tier-based access control.

## Overview

This demo shows how the Spanish Learning MCP works with different user tiers:

- **Free Tier**: Limited context size (5 items), basic features only, 2 queries per minute
- **Basic Tier**: Medium context size (20 items), access to conversation features, 5 queries per minute
- **Premium Tier**: Large context size (50 items), access to all features, 20 queries per minute

The demo visualizes:

- Different context sizes based on tier
- Access to premium features
- Rate limiting based on tier
- Behind-the-scenes API calls and processing

## Getting Started

### Prerequisites

- Node.js and npm installed
- Spanish Learning MCP server running (see main project README)

### Running the Demo

#### Option 1: Using the Demo Server (Recommended)

The demo server provides a proxy to the MCP server and handles static file serving:

1. Start the Spanish Learning MCP server:

   ```bash
   npm run dev
   ```

2. Install required dependencies:

   ```bash
   npm install express cors http-proxy-middleware
   ```

3. Start the demo server:

   ```bash
   node examples/visual-demo/server.js
   ```

4. Navigate to http://localhost:8080 in your browser

#### Option 2: Using a Simple HTTP Server

If you prefer not to use the demo server:

1. Start the Spanish Learning MCP server:

   ```bash
   npm run dev
   ```

2. Open the demo in a web browser:

   ```bash
   # Using a simple HTTP server
   npx http-server examples/visual-demo

   # Or with Python
   cd examples/visual-demo
   python -m http.server 8000
   ```

3. Navigate to http://localhost:8000 (or the port specified by your HTTP server)

   Note: With this option, the demo will use simulated responses instead of connecting to the real API.

## Using the Demo

1. **Select a User Tier**:

   - Click on one of the tier cards (Free, Basic, or Premium)
   - Notice how the stats update to reflect the selected tier

2. **Enter a Query**:

   - Type a Spanish learning query in the input field
   - Try queries about "hello" or "goodbye" for specific responses
   - For Premium tier, you can toggle "Use advanced features"

3. **Submit the Query**:

   - Click the Submit button or press Enter
   - Watch the system logs to see what's happening behind the scenes
   - Observe how the response changes based on the selected tier

4. **Observe Tier Differences**:

   - Free tier: Limited information
   - Basic tier: More vocabulary and examples
   - Premium tier: Comprehensive information with regional variations and practice conversations

5. **Test Rate Limiting**:
   - Submit multiple queries quickly to see rate limiting in action
   - Notice how different tiers have different rate limits
   - Rate limits reset every minute

## Technical Details

This demo consists of:

- `index.html`: The user interface with tier selection, query input, and response display
- `app.js`: JavaScript code that handles user interactions and API calls
- `server.js`: Express server that serves the demo and proxies API requests
- `README.md`: This documentation file

The demo uses:

- Bootstrap 5 for styling
- Vanilla JavaScript for functionality
- Express.js for the demo server
- HTTP proxy middleware to connect to the MCP server

## How It Works

1. **Demo Server**: The `server.js` file creates an Express server that:

   - Serves the static HTML, CSS, and JavaScript files
   - Proxies API requests to the MCP server
   - Adds the necessary headers for authentication

2. **API Integration**: The demo tries to connect to the real MCP API first:

   - If successful, it uses the real responses
   - If the API is unavailable, it falls back to simulated responses

3. **Tier-Based Access**: The demo shows how different user tiers get:
   - Different context sizes
   - Access to different features
   - Different rate limits

## Customizing the Demo

You can customize this demo by:

1. Modifying the tier levels and features in `index.html`
2. Changing the simulated responses in `app.js`
3. Updating the API URL and endpoints to match your deployment
4. Adding more visualization features like charts or animations

## Using for Presentations

This demo is designed to be used in presentations to explain how the Spanish Learning MCP works with different user tiers. You can:

1. Walk through the different tiers and their features
2. Show how the context size affects the quality of responses
3. Demonstrate how premium features provide additional value
4. Explain the rate limiting system and its benefits

The system logs and stats panel make it easy to explain what's happening behind the scenes, making this an effective tool for technical demonstrations.
