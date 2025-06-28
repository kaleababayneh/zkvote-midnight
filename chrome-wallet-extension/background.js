// Background service worker for Midnight Wallet Extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Midnight Wallet Extension installed');
  
  // Initialize default data
  chrome.storage.local.set({
    walletData: {
      seed: null,
      address: null,
      balance: '0',
      lastUpdated: null
    },
    contractData: {
      address: null,
      counterValue: 0,
      deployed: false,
      lastUpdated: null
    },
    lastAction: null
  });
});

// Handle messages from popup, content scripts, and websites
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  switch (request.action) {
    case 'getWalletData':
      chrome.storage.local.get(['walletData']).then(result => {
        sendResponse(result.walletData);
      });
      return true;
      
    case 'updateWalletData':
      chrome.storage.local.set({ walletData: request.data }).then(() => {
        sendResponse({ success: true });
      });
      return true;
      
    case 'getContractData':
      chrome.storage.local.get(['contractData']).then(result => {
        sendResponse(result.contractData);
      });
      return true;
      
    case 'updateContractData':
      chrome.storage.local.set({ contractData: request.data }).then(() => {
        sendResponse({ success: true });
      });
      return true;
      
    case 'checkCLIConnection':
      checkCLIConnection().then(result => {
        sendResponse(result);
      });
      return true;

    // Website-triggered contract functions
    case 'deployContract':
      handleContractDeploy(request.params || {}).then(result => {
        updateLastAction('Deploy Contract');
        sendResponse(result);
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
      
    case 'incrementCounter':
      handleContractIncrement(request.params || {}).then(result => {
        updateLastAction('Increment Counter');
        sendResponse(result);
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
      
    case 'getContractState':
      handleGetContractState().then(result => {
        updateLastAction('Get Contract State');
        sendResponse(result);
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;

    case 'requestTokens':
      handleRequestTokens().then(result => {
        updateLastAction('Request Tokens');
        sendResponse(result);
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
});

// Handle external messages from websites
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  console.log('External message from:', sender.origin);
  console.log('Request:', request);

  // Verify sender is from allowed origins (add your website domain here)
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8080', 
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8080'
    // Add your website domain here when deployed
  ];

  if (!allowedOrigins.includes(sender.origin)) {
    sendResponse({ success: false, error: 'Unauthorized origin' });
    return;
  }

  // Handle the same actions as internal messages
  switch (request.action) {
    case 'deployContract':
      handleContractDeploy(request.params || {}).then(result => {
        updateLastAction('Deploy Contract (from website)');
        sendResponse(result);
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
      
    case 'incrementCounter':
      handleContractIncrement(request.params || {}).then(result => {
        updateLastAction('Increment Counter (from website)');
        sendResponse(result);
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
      
    case 'getContractState':
      handleGetContractState().then(result => {
        sendResponse(result);
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;

    case 'getWalletInfo':
      chrome.storage.local.get(['walletData']).then(result => {
        sendResponse({ success: true, data: result.walletData });
      });
      return true;

    case 'requestTokens':
      handleRequestTokens().then(result => {
        updateLastAction('Request Tokens (from website)');
        sendResponse(result);
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
      
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
  
  return true;
});

// Function to check CLI connection
async function checkCLIConnection() {
  try {
    const response = await fetch('http://localhost:3002/api/status', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    if (response.ok) {
      return { connected: true, status: 'CLI server is running' };
    } else {
      return { connected: false, status: 'CLI server not responding' };
    }
  } catch (error) {
    return { connected: false, status: 'CLI server not available' };
  }
}

// Contract function handlers
async function handleContractDeploy(params = {}) {
  try {
    console.log('Deploying contract via CLI...');
    const response = await fetch('http://localhost:3002/api/contract/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    
    if (response.ok) {
      const result = await response.json();
      
      // Update contract data in storage
      await chrome.storage.local.set({
        contractData: {
          address: result.contractAddress,
          deployed: true,
          lastUpdated: new Date().toISOString()
        }
      });
      
      return {
        success: true,
        contractAddress: result.contractAddress,
        message: 'Contract deployed successfully',
        timestamp: new Date().toISOString()
      };
    } else {
      throw new Error('Deploy request failed');
    }
  } catch (error) {
    console.error('Contract deployment error:', error);
    throw new Error(`Failed to deploy contract: ${error.message}`);
  }
}

async function handleContractIncrement(params = {}) {
  try {
    console.log('Incrementing counter via CLI...');
    const response = await fetch('http://localhost:3002/api/contract/increment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    
    if (response.ok) {
      const result = await response.json();
      return {
        success: true,
        txHash: result.txHash,
        message: 'Counter incremented successfully',
        timestamp: new Date().toISOString()
      };
    } else {
      throw new Error('Increment request failed');
    }
  } catch (error) {
    console.error('Contract increment error:', error);
    throw new Error(`Failed to increment counter: ${error.message}`);
  }
}

async function handleGetContractState() {
  try {
    console.log('Getting contract state via CLI...');
    const response = await fetch('http://localhost:3002/api/contract/state', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const result = await response.json();
      return {
        success: true,
        state: result,
        timestamp: new Date().toISOString()
      };
    } else {
      throw new Error('Get state request failed');
    }
  } catch (error) {
    console.error('Get contract state error:', error);
    throw new Error(`Failed to get contract state: ${error.message}`);
  }
}

async function handleRequestTokens() {
  try {
    console.log('Requesting tokens via CLI...');
    const response = await fetch('http://localhost:3002/api/faucet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const result = await response.json();
      return {
        success: true,
        message: 'Tokens requested successfully',
        timestamp: new Date().toISOString()
      };
    } else {
      throw new Error('Token request failed');
    }
  } catch (error) {
    console.error('Token request error:', error);
    throw new Error(`Failed to request tokens: ${error.message}`);
  }
}

// Update last action for popup display
async function updateLastAction(action) {
  await chrome.storage.local.set({ 
    lastAction: `${action} at ${new Date().toLocaleTimeString()}` 
  });
}

// Periodic check for CLI connection (every 30 seconds)
setInterval(async () => {
  const result = await checkCLIConnection();
  chrome.storage.local.set({ cliConnection: result });
}, 30000);

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // This is handled by the popup, but we can add additional logic here if needed
  console.log('Extension icon clicked');
});

// Listen for storage changes and update badge
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.walletData) {
    const walletData = changes.walletData.newValue;
    if (walletData && walletData.balance) {
      const balance = Number(walletData.balance);
      const tusdt = Math.floor(balance);
      
      // Update badge with balance (simplified)
      if (tusdt > 0) {
        chrome.action.setBadgeText({ text: tusdt.toString() });
        chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
      } else {
        chrome.action.setBadgeText({ text: '0' });
        chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
      }
    }
  }
});

// Handle network requests (if needed for CORS issues)
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  // Handle requests from web pages if needed
  console.log('External message received:', request);
});

// Keep service worker alive
const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20e3);
chrome.runtime.onStartup.addListener(keepAlive);
keepAlive();
