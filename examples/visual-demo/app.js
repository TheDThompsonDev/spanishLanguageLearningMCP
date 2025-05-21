/**
 * Spanish Learning MCP - Visual Demo
 * 
 * This script handles the interactive demo for the Spanish Learning MCP,
 * showing how different user tiers affect the responses.
 */

// Configuration
const API_URL = '/api'; // This will be proxied to the MCP server by server.js
const DEMO_API_URL = '/demo-api'; // Demo-specific endpoints

// Sample user IDs for different tiers
const USERS = {
    free: 'free-user-123',
    basic: 'basic-user-456',
    premium: 'premium-user-789'
};

// DOM Elements
const tierCards = document.querySelectorAll('.tier-card');
const queryInput = document.getElementById('query-input');
const submitBtn = document.getElementById('submit-btn');
const advancedFeaturesToggle = document.getElementById('advanced-features');
const responseContainer = document.getElementById('response-container');
const logContainer = document.getElementById('log-container');
const statTier = document.getElementById('stat-tier');
const statContextSize = document.getElementById('stat-context-size');
const statProcessingTime = document.getElementById('stat-processing-time');
const statCacheHit = document.getElementById('stat-cache-hit');
const statRateLimit = document.getElementById('stat-rate-limit');

// Current state
let currentTier = 'free';
let queryCount = {
    free: 0,
    basic: 0,
    premium: 0
};
const rateLimits = {
    free: 2,
    basic: 5,
    premium: 20
};

// Initialize the demo
function init() {
    // Set up event listeners
    tierCards.forEach(card => {
        card.addEventListener('click', () => selectTier(card.dataset.tier));
    });
    
    submitBtn.addEventListener('click', handleSubmit);
    queryInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSubmit();
    });
    
    // Add initial log entry
    addLogEntry('Demo initialized', 'info');
    addLogEntry('Selected tier: Free', 'info');
    
    // Update stats display
    updateStats();
}

// Select a tier
function selectTier(tier) {
    currentTier = tier;
    
    // Update UI
    tierCards.forEach(card => {
        card.classList.remove('active');
        if (card.dataset.tier === tier) {
            card.classList.add('active');
        }
    });
    
    // Update stats
    updateStats();
    
    // Log the change
    addLogEntry(`Selected tier: ${tier.charAt(0).toUpperCase() + tier.slice(1)}`, 'info');
    
    // Enable/disable advanced features based on tier
    if (tier === 'premium') {
        advancedFeaturesToggle.disabled = false;
    } else {
        advancedFeaturesToggle.checked = false;
        advancedFeaturesToggle.disabled = true;
    }
}

// Handle form submission
async function handleSubmit() {
    const query = queryInput.value.trim();
    
    if (!query) {
        addLogEntry('Query cannot be empty', 'error');
        return;
    }
    
    // Check rate limit
    if (queryCount[currentTier] >= rateLimits[currentTier]) {
        addLogEntry(`Rate limit exceeded for ${currentTier} tier`, 'error');
        responseContainer.innerHTML = `
            <div class="alert alert-danger">
                <h4 class="alert-heading">Rate Limit Exceeded</h4>
                <p>You have exceeded the rate limit for the ${currentTier} tier (${rateLimits[currentTier]} queries per minute).</p>
                <p>Please wait or upgrade to a higher tier.</p>
            </div>
        `;
        return;
    }
    
    // Increment query count
    queryCount[currentTier]++;
    updateStats();
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading"></span> Processing...';
    responseContainer.innerHTML = `
        <div class="text-center p-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3">Processing your query...</p>
        </div>
    `;
    
    // Log the request
    addLogEntry(`Sending query: "${query}"`, 'info');
    
    try {
        // In a real implementation, this would call your actual API
        // For demo purposes, we'll simulate the API call
        const response = await simulateApiCall(query);
        
        // Update the response container
        displayResponse(response);
        
        // Update stats
        statProcessingTime.textContent = `${response.metadata.processingTimeMs}ms`;
        statCacheHit.textContent = response.metadata.cacheHit ? 'Yes' : 'No';
        
        // Log the success
        addLogEntry('Query processed successfully', 'success');
    } catch (error) {
        // Handle error
        responseContainer.innerHTML = `
            <div class="alert alert-danger">
                <h4 class="alert-heading">Error</h4>
                <p>${error.message}</p>
            </div>
        `;
        
        // Log the error
        addLogEntry(`Error: ${error.message}`, 'error');
    } finally {
        // Reset button state
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
    }
}

// Make API call to the MCP server through the proxy
async function simulateApiCall(query) {
    const startTime = Date.now();
    
    // Log API request
    addLogEntry(`API Request: ${currentTier} tier, ${advancedFeaturesToggle.checked ? 'advanced' : 'standard'} features`, 'info');
    
    // Check if advanced features are requested but not available
    if (advancedFeaturesToggle.checked && currentTier !== 'premium') {
        addLogEntry('Advanced features not available for this tier', 'warning');
        throw new Error('Advanced features are only available for premium tier users');
    }
    
    // Different context sizes based on tier
    const contextSizes = {
        free: 5,
        basic: 20,
        premium: 50
    };
    
    try {
        // First try to use the real API
        addLogEntry('Sending request to MCP server', 'info');
        
        const response = await fetch(`${API_URL}/mcp/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': USERS[currentTier]
            },
            body: JSON.stringify({
                query: query,
                contextType: 'vocabulary',
                maxItems: contextSizes[currentTier],
                includeExamples: true,
                useAdvancedFeatures: advancedFeaturesToggle.checked
            })
        });
        
        // If the API call fails, fall back to simulated responses
        if (!response.ok) {
            addLogEntry(`API error: ${response.status}. Falling back to simulated response.`, 'warning');
            return fallbackToSimulation(query, startTime);
        }
        
        const data = await response.json();
        addLogEntry('Received response from MCP server', 'success');
        
        // Add processing time if not provided
        if (!data.metadata?.processingTimeMs) {
            data.metadata = data.metadata || {};
            data.metadata.processingTimeMs = Date.now() - startTime;
        }
        
        return data;
    } catch (error) {
        // If there's an error (e.g., server not running), fall back to simulation
        addLogEntry(`API error: ${error.message}. Falling back to simulated response.`, 'warning');
        return fallbackToSimulation(query, startTime);
    }
}

// Fallback to simulated responses if the API is unavailable
async function fallbackToSimulation(query, startTime) {
    addLogEntry('Using simulated response', 'info');
    
    const contextSizes = {
        free: 5,
        basic: 20,
        premium: 50
    };
    
    const contextSize = contextSizes[currentTier];
    
    // Simulate cache hit (more likely for repeated queries)
    const cacheHit = Math.random() < 0.3;
    if (cacheHit) {
        addLogEntry('Cache hit! Using cached response', 'info');
    } else {
        addLogEntry(`Generating context with ${contextSize} items`, 'info');
        addLogEntry('Querying Claude with context', 'info');
    }
    
    // Generate a response based on the query and tier
    let response;
    
    if (query.toLowerCase().includes('hello') || query.toLowerCase().includes('hola')) {
        response = generateGreetingResponse(contextSize, advancedFeaturesToggle.checked);
    } else if (query.toLowerCase().includes('goodbye') || query.toLowerCase().includes('adios')) {
        response = generateGoodbyeResponse(contextSize, advancedFeaturesToggle.checked);
    } else {
        response = generateGenericResponse(query, contextSize, advancedFeaturesToggle.checked);
    }
    
    // Add metadata
    response.metadata = {
        contextType: 'vocabulary',
        itemCount: contextSize,
        processingTimeMs: Date.now() - startTime,
        cacheHit: cacheHit,
        tier: currentTier
    };
    
    // Add user info
    response.user = {
        id: USERS[currentTier],
        tier: currentTier
    };
    
    return response;
}

// Generate a response about greetings
function generateGreetingResponse(contextSize, advanced) {
    let response = {
        response: `
            <h3>Spanish Greetings</h3>
            <p>Here are some common ways to say hello in Spanish:</p>
            <ul>
                <li><strong>Hola</strong> - The most common greeting, used in any situation</li>
                <li><strong>Buenos días</strong> - Good morning (used until noon)</li>
                <li><strong>Buenas tardes</strong> - Good afternoon (used from noon until sunset)</li>
                <li><strong>Buenas noches</strong> - Good evening/night (used after sunset)</li>
        `
    };
    
    // Add more content based on tier
    if (contextSize >= 20) {
        response.response += `
                <li><strong>¿Qué tal?</strong> - How's it going?</li>
                <li><strong>¿Cómo estás?</strong> - How are you?</li>
                <li><strong>¿Qué pasa?</strong> - What's up?</li>
                <li><strong>¿Qué onda?</strong> - What's up? (colloquial, used in Latin America)</li>
        `;
    }
    
    if (contextSize >= 50) {
        response.response += `
                <li><strong>Encantado/a</strong> - Pleased to meet you</li>
                <li><strong>Mucho gusto</strong> - Nice to meet you</li>
                <li><strong>¿Qué hay de nuevo?</strong> - What's new?</li>
                <li><strong>¿Cómo te va?</strong> - How's it going for you?</li>
                <li><strong>Saludos</strong> - Greetings</li>
        `;
    }
    
    response.response += `</ul>`;
    
    // Add advanced content if requested
    if (advanced) {
        response.response += `
            <h4>Regional Variations</h4>
            <p>Greetings can vary by region in the Spanish-speaking world:</p>
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th>Country/Region</th>
                        <th>Common Greeting</th>
                        <th>Notes</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Spain</td>
                        <td>¿Qué tal?</td>
                        <td>Very common casual greeting</td>
                    </tr>
                    <tr>
                        <td>Mexico</td>
                        <td>¿Qué onda?</td>
                        <td>Colloquial, similar to "what's up?"</td>
                    </tr>
                    <tr>
                        <td>Argentina</td>
                        <td>¿Qué hacés?</td>
                        <td>Uses voseo form</td>
                    </tr>
                    <tr>
                        <td>Colombia</td>
                        <td>¿Quiubo?</td>
                        <td>Contraction of "¿Qué hubo?"</td>
                    </tr>
                </tbody>
            </table>
            
            <h4>Practice Conversation</h4>
            <div class="card mb-3">
                <div class="card-body">
                    <p><strong>Person A:</strong> ¡Hola! ¿Cómo estás?</p>
                    <p><strong>Person B:</strong> Muy bien, gracias. ¿Y tú?</p>
                    <p><strong>Person A:</strong> Bien también. ¿Qué has hecho hoy?</p>
                    <p><strong>Person B:</strong> Estuve estudiando español. ¡Es muy interesante!</p>
                </div>
            </div>
        `;
    }
    
    return response;
}

// Generate a response about goodbyes
function generateGoodbyeResponse(contextSize, advanced) {
    let response = {
        response: `
            <h3>Spanish Goodbyes</h3>
            <p>Here are some common ways to say goodbye in Spanish:</p>
            <ul>
                <li><strong>Adiós</strong> - Goodbye (formal)</li>
                <li><strong>Hasta luego</strong> - See you later</li>
                <li><strong>Hasta pronto</strong> - See you soon</li>
                <li><strong>Chao</strong> - Bye (informal)</li>
        `
    };
    
    // Add more content based on tier
    if (contextSize >= 20) {
        response.response += `
                <li><strong>Hasta mañana</strong> - See you tomorrow</li>
                <li><strong>Nos vemos</strong> - See you</li>
                <li><strong>Hasta la vista</strong> - Until we see each other again</li>
                <li><strong>Que tengas un buen día</strong> - Have a good day</li>
        `;
    }
    
    if (contextSize >= 50) {
        response.response += `
                <li><strong>Que te vaya bien</strong> - May things go well for you</li>
                <li><strong>Cuídate</strong> - Take care</li>
                <li><strong>Nos vemos pronto</strong> - See you soon</li>
                <li><strong>Hasta la próxima</strong> - Until next time</li>
                <li><strong>Me despido</strong> - I say goodbye (formal)</li>
        `;
    }
    
    response.response += `</ul>`;
    
    // Add advanced content if requested
    if (advanced) {
        response.response += `
            <h4>Contextual Goodbyes</h4>
            <p>Different situations call for different types of goodbyes:</p>
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th>Situation</th>
                        <th>Goodbye Phrase</th>
                        <th>Notes</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>At night</td>
                        <td>Que descanses</td>
                        <td>Rest well</td>
                    </tr>
                    <tr>
                        <td>Before a trip</td>
                        <td>Buen viaje</td>
                        <td>Have a good trip</td>
                    </tr>
                    <tr>
                        <td>On the phone</td>
                        <td>Hasta luego, hablamos</td>
                        <td>See you later, we'll talk</td>
                    </tr>
                    <tr>
                        <td>To someone staying</td>
                        <td>Que te diviertas</td>
                        <td>Have fun</td>
                    </tr>
                </tbody>
            </table>
            
            <h4>Practice Conversation</h4>
            <div class="card mb-3">
                <div class="card-body">
                    <p><strong>Person A:</strong> Bueno, tengo que irme ahora.</p>
                    <p><strong>Person B:</strong> ¿Ya te vas? Está bien.</p>
                    <p><strong>Person A:</strong> Sí, tengo una reunión. Nos vemos mañana.</p>
                    <p><strong>Person B:</strong> Claro, hasta mañana. Que te vaya bien en tu reunión.</p>
                    <p><strong>Person A:</strong> Gracias, igualmente. ¡Adiós!</p>
                </div>
            </div>
        `;
    }
    
    return response;
}

// Generate a generic response
function generateGenericResponse(query, contextSize, advanced) {
    return {
        response: `
            <h3>Spanish Learning</h3>
            <p>Your query was: "${query}"</p>
            <p>This is a simulated response for the ${currentTier} tier with ${contextSize} context items.</p>
            <p>In a real implementation, this would provide a detailed response about Spanish vocabulary or grammar based on your query.</p>
            ${advanced ? '<p>You are using advanced features, which provide more detailed explanations, regional variations, and interactive exercises.</p>' : ''}
            <hr>
            <p>To see different responses, try queries about "hello" or "goodbye" in Spanish.</p>
        `
    };
}

// Display the response
function displayResponse(response) {
    responseContainer.innerHTML = response.response;
}

// Add a log entry
function addLogEntry(message, type = 'info') {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    logEntry.innerHTML = `
        <span class="log-time">[${timeString}]</span>
        <span class="log-${type}">${message}</span>
    `;
    
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

// Update stats display
function updateStats() {
    statTier.textContent = currentTier.charAt(0).toUpperCase() + currentTier.slice(1);
    
    const contextSizes = {
        free: '5 items',
        basic: '20 items',
        premium: '50 items'
    };
    
    statContextSize.textContent = contextSizes[currentTier];
    statRateLimit.textContent = `${rateLimits[currentTier] - queryCount[currentTier]}/${rateLimits[currentTier]} remaining`;
}

// Reset rate limits every minute
setInterval(() => {
    queryCount = {
        free: 0,
        basic: 0,
        premium: 0
    };
    updateStats();
    addLogEntry('Rate limits reset', 'info');
}, 60000);

// Initialize the demo when the page loads
document.addEventListener('DOMContentLoaded', init);