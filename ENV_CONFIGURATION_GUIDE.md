# Environment Variable Configuration Guide

This guide explains how to configure environment variables for automated deployment without manual seed phrase prompts.

## Quick Setup

1. **Auto-generate (Recommended):**
   ```bash
   npm run generate-key
   ```
   This automatically generates both seed and address and updates your .env file.

2. **Manual setup:**
   ```bash
   cp .env.example .env
   ```

3. **Edit the .env file:**
   ```bash
   # Add your wallet seed phrase
   WALLET_SEED=your-64-character-hex-seed-phrase-here
   
   # Optionally add wallet address (auto-detected if not provided)
   WALLET_ADDRESS=mn_shield-addr_test1...
   
   # Optional: Set wallet cache directory
   SYNC_CACHE=./wallet-cache
   ```

4. **Deploy automatically:**
   ```bash
   npm run deploy         # Testnet deployment with no prompts
   npm run deploy:join    # Join existing contract with no prompts
   ```

5. **Request testnet tokens:**
   ```bash
   npm run request-faucet # Get tokens for deployment (manual web step required)
   ```

## Environment Variables

### WALLET_SEED
- **Purpose**: Your wallet seed phrase for automated authentication
- **Format**: 64-character hexadecimal string
- **Example**: `WALLET_SEED=0123456789abcdef...`
- **Security**: Keep this private! Add .env to .gitignore

### WALLET_ADDRESS (Optional)
- **Purpose**: Your wallet address for reference/debugging
- **Format**: Midnight network address starting with `mn_shield-addr_`
- **Example**: `WALLET_ADDRESS=mn_shield-addr_test1...`
- **Note**: Auto-generated from seed if not provided

### SYNC_CACHE (Optional)
- **Purpose**: Directory for wallet state caching to speed up subsequent runs
- **Default**: Not set (no caching)
- **Example**: `SYNC_CACHE=./wallet-cache`

## Usage Examples

### Automated Testnet Deployment
```bash
# Set environment variable
echo "WALLET_SEED=your-seed-here" > .env

# Deploy without prompts
npm run deploy
```

### Interactive Mode (No Environment Variables)
```bash
# Remove or don't set WALLET_SEED
npm run wallet
# Will prompt: "Enter your wallet seed: "
```

### Mixed Mode
```bash
# Set WALLET_SEED for automation
# But still get deployment choice prompts
npm run wallet
```

## Security Best Practices

1. **Never commit .env files**
   ```bash
   # Already in .gitignore
   echo ".env" >> .gitignore
   ```

2. **Use different seeds for different environments**
   - Development: Low-value test seed
   - Production: Secure, high-value seed

3. **Rotate seeds regularly**
   - Generate new seeds periodically
   - Update .env file with new seed

## Troubleshooting

### "No WALLET_SEED found in environment variables"
- Check that .env file exists in project root
- Verify WALLET_SEED is set in .env file
- Ensure no extra spaces: `WALLET_SEED=value` (not `WALLET_SEED = value`)

### "Invalid seed phrase"
- Ensure seed is 64-character hexadecimal
- Check for typos or missing characters
- Use lowercase letters for hex digits

### "Wallet balance is 0"
- Ensure your wallet has testnet tokens
- Check that you're connecting to the correct network
- Verify seed phrase corresponds to funded wallet

## Integration with CI/CD

For automated deployments in CI/CD pipelines:

```yaml
# GitHub Actions example
env:
  WALLET_SEED: ${{ secrets.WALLET_SEED }}
  
steps:
  - name: Deploy to testnet
    run: npm run deploy
```

Set `WALLET_SEED` as a repository secret in your CI/CD platform.
