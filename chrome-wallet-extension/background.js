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
    }
  });
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getWalletData':
      chrome.storage.local.get(['walletData']).then(result => {
        sendResponse(result.walletData);
      });
      return true; // Keep message channel open for async response
      
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
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
});

// Function to check CLI connection
async function checkCLIConnection() {
  try {
    const response = await fetch('http://localhost:3001/api/status', {
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
      const tusdt = Math.floor(balance / 1_000_000);
      
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
