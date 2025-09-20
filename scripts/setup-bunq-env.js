#!/usr/bin/env node

/**
 * Setup script for bunq environment configuration
 * 
 * This script helps you set up the required environment variables
 * for the bunq API integration based on your specifications.
 */

console.log('🚀 Bunq Environment Setup Guide')
console.log('===============================')
console.log('')

console.log('📋 Required Environment Variables:')
console.log('')

console.log('1️⃣  BUNQ_API_KEY')
console.log('   Description: Your bunq API key (secret)')
console.log('   Example: sandbox_12345678901234567890123456789012')
console.log('   How to get: From bunq app → Profile → Security & Settings → Developers → API Keys')
console.log('')

console.log('2️⃣  BUNQ_API_BASE_URL')
console.log('   Description: The bunq API base URL')
console.log('   Production: https://api.bunq.com')
console.log('   Sandbox: https://public-api.sandbox.bunq.com')
console.log('')

console.log('3️⃣  BUNQ_CLIENT_PUBLIC_KEY')
console.log('   Description: Your RSA public key (PEM format)')
console.log('   Example: -----BEGIN PUBLIC KEY-----\\nMIIBIjANBgkq...\\n-----END PUBLIC KEY-----')
console.log('   How to generate: openssl genrsa -out private.pem 2048 && openssl rsa -in private.pem -pubout -out public.pem')
console.log('')

console.log('4️⃣  BUNQ_PRIVATE_KEY_FOR_SIGNING')
console.log('   Description: Your RSA private key (PEM format) for signing requests')
console.log('   Example: -----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkq...\\n-----END PRIVATE KEY-----')
console.log('   Security: Keep this secret! Never commit to version control.')
console.log('')

console.log('5️⃣  BUNQ_ACCOUNT_ID_FOR_REQUESTS')
console.log('   Description: The monetary account ID to use for payment requests')
console.log('   Example: 13089216')
console.log('   How to find: Check your bunq app or use the bunq API to list accounts')
console.log('')

console.log('🔧 Setup Steps:')
console.log('')

console.log('Step 1: Generate RSA Key Pair')
console.log('   openssl genrsa -out bunq_private.pem 2048')
console.log('   openssl rsa -in bunq_private.pem -pubout -out bunq_public.pem')
console.log('')

console.log('Step 2: Create .env.local file with:')
console.log('   BUNQ_API_KEY=your_api_key_here')
console.log('   BUNQ_API_BASE_URL=https://public-api.sandbox.bunq.com')
console.log('   BUNQ_CLIENT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\\nYOUR_PUBLIC_KEY_HERE\\n-----END PUBLIC KEY-----"')
console.log('   BUNQ_PRIVATE_KEY_FOR_SIGNING="-----BEGIN PRIVATE KEY-----\\nYOUR_PRIVATE_KEY_HERE\\n-----END PRIVATE KEY-----"')
console.log('   BUNQ_ACCOUNT_ID_FOR_REQUESTS=13089216')
console.log('')

console.log('Step 3: Test the setup')
console.log('   curl -X POST http://localhost:3000/api/test-bunq-flow')
console.log('')

console.log('🔄 Authentication Flow:')
console.log('')
console.log('When you create a payment request, the system will automatically:')
console.log('1. 📝 Register your public key with bunq (Installation)')
console.log('2. 🖥️  Register your server IP address (Device Registration)')
console.log('3. 🔐 Start a signed session (Session Start)')
console.log('4. 💰 Create the payment request using account ID', process.env.BUNQ_ACCOUNT_ID_FOR_REQUESTS || '13089216')
console.log('')

console.log('📞 Support:')
console.log('- Bunq API Documentation: https://doc.bunq.com/')
console.log('- Test endpoint: /api/test-bunq-flow')
console.log('- Payment creation: /api/payments')
console.log('')

console.log('⚠️  Security Notes:')
console.log('- Never commit private keys to version control')
console.log('- Use different keys for sandbox and production')
console.log('- Store keys securely in environment variables')
console.log('- Rotate keys regularly in production')
console.log('')

console.log('✅ Setup complete! Make sure to set all environment variables before testing.')
