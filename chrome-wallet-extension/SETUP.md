# 🌙 Midnight Wallet Extension - Complete Setup Guide

Perfect! I've created exactly what you wanted - a Chrome extension that works **behind the scenes** while your website handles the UI for contract interactions.

## 🎯 **How It Works**

```
Your Website → Chrome Extension (Hidden) → Bridge Server → CLI → Midnight Network
```

**The Flow:**
1. ✅ User visits your website
2. ✅ Website has buttons for "Deploy Contract", "Increment Counter", etc.
3. ✅ When clicked, website sends message to Chrome Extension
4. ✅ Extension handles the request through bridge server
5. ✅ Bridge server executes CLI commands
6. ✅ Results returned back to website

**The extension popup only shows:**
- Wallet balance and address
- Request tokens button
- Connection status
- **NO contract function buttons** (as requested)

## 🚀 **Quick Setup (3 Steps)**

### **Step 1: Start the Bridge Server**
```bash
cd chrome-wallet-extension
npm install
npm start
```

### **Step 2: Load Extension in Chrome**
1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `chrome-wallet-extension` folder

### **Step 3: Test with Sample Website**
```bash
cd sample-website
./start-website.sh
```
Then open http://localhost:8080 in Chrome

## 📁 **File Structure**

```
chrome-wallet-extension/
├── manifest.json              # Extension config
├── popup.html                # Simple wallet display (no contract buttons)
├── popup.js                  # Wallet functionality only
├── background.js             # Handles website messages
├── enhanced-bridge.js        # Connects to your CLI
├── sample-website/           # Example website with buttons
│   ├── index.html           # Website UI with contract buttons
│   ├── app.js               # Sends messages to extension
│   └── start-website.sh     # Launch website
└── README.md
```

## 🔗 **Website Integration**

Your website can call these functions:

```javascript
// Deploy contract
chrome.runtime.sendMessage(extensionId, {
    action: 'deployContract',
    params: {}
});

// Increment counter
chrome.runtime.sendMessage(extensionId, {
    action: 'incrementCounter', 
    params: {}
});

// Get contract state
chrome.runtime.sendMessage(extensionId, {
    action: 'getContractState',
    params: {}
});

// Request tokens
chrome.runtime.sendMessage(extensionId, {
    action: 'requestTokens',
    params: {}
});
```

## 🛠 **Extension Capabilities**

**✅ What the Extension Does (Hidden):**
- Connects to your CLI through bridge server
- Executes `npm run deploy` when website requests deploy
- Executes `npm run faucet` when website requests tokens
- Handles all contract interactions
- Manages wallet state

**✅ What the Extension Shows (Popup):**
- Current wallet balance
- Wallet address (with copy button)
- "Request Tokens" button
- Connection status to CLI
- Last action performed

**❌ What's NOT in Extension Popup:**
- Deploy contract button
- Increment counter button
- Any contract-specific functions

## 🌐 **Creating Your Website**

Use the sample website as a template. Key parts:

```html
<!-- Your website buttons -->
<button onclick="deployContract()">🚀 Deploy Contract</button>
<button onclick="incrementCounter()">➕ Increment Counter</button>
```

```javascript
// Your website JavaScript
async function deployContract() {
    const response = await chrome.runtime.sendMessage(extensionId, {
        action: 'deployContract'
    });
    
    if (response.success) {
        console.log('Contract deployed:', response.contractAddress);
    }
}
```

## 📋 **Bridge Server API**

The extension communicates with your CLI through these endpoints:

- `POST /api/contract/deploy` → Runs `npm run deploy`
- `POST /api/contract/increment` → Executes increment function
- `POST /api/faucet` → Runs `npm run faucet`
- `GET /api/balance` → Runs `npm run balance`
- `GET /api/wallet` → Gets wallet info from `.env`

## 🔧 **Testing the Setup**

1. **Start bridge server:** `npm start` (in chrome-wallet-extension/)
2. **Load extension:** Chrome → Extensions → Load unpacked
3. **Start website:** `./start-website.sh` (in sample-website/)
4. **Test flow:** 
   - Open website in Chrome
   - Click "Deploy Contract" → Extension handles it → CLI executes
   - Click "Increment Counter" → Extension handles it → CLI executes

## 🎨 **Customizing for Your Needs**

**Add More Contract Functions:**

1. **In bridge server** (`enhanced-bridge.js`):
```javascript
async function handleYourFunction(params) {
    // Execute your CLI command
    const response = await fetch('http://localhost:3001/api/contract/yourfunction', {
        method: 'POST',
        body: JSON.stringify(params)
    });
    return response.json();
}
```

2. **In background script** (`background.js`):
```javascript
case 'yourFunction':
    handleYourFunction(request.params).then(result => {
        sendResponse(result);
    });
    return true;
```

3. **In your website:**
```javascript
async function yourFunction() {
    const response = await chrome.runtime.sendMessage(extensionId, {
        action: 'yourFunction',
        params: { /* your params */ }
    });
}
```

## 🔐 **Security**

- Extension only accepts messages from localhost (dev) - update `manifest.json` for production
- All sensitive operations stay in CLI
- No private keys in extension
- Bridge server only on localhost

## 🚀 **Next Steps**

1. **Test the setup** with the sample website
2. **Create your own website** with your desired UI
3. **Add your contract functions** to the bridge server
4. **Style your website** however you want
5. **Deploy your website** when ready

The extension is now a **pure background service** that your website can call - exactly as you requested! 🎉

---

**Need help?** Check the logs in:
- Chrome Extension: `chrome://extensions/` → Click extension details → Inspect views: service worker
- Bridge Server: Terminal output
- Website: Browser console
