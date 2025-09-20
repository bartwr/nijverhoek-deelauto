#!/usr/bin/env node

/**
 * Setup script for automatic IP registration after deployments
 * 
 * This script helps configure automatic IP registration using multiple methods:
 * 1. GitHub Actions (recommended for GitHub + Vercel)
 * 2. Vercel Deployment Hooks
 * 3. Manual webhook setup
 */

console.log('🚀 Setting up automatic IP registration...')
console.log('')

console.log('📋 Setup Options Available:')
console.log('')

console.log('1️⃣  GitHub Actions (Recommended)')
console.log('   ✅ Already configured in .github/workflows/register-bunq-ip.yml')
console.log('   📝 Required GitHub Secrets:')
console.log('      - BUNQ_API_KEY')
console.log('      - BUNQ_INSTALLATION_RESPONSE_TOKEN') 
console.log('      - BUNQ_API_BASE_URL')
console.log('      - NEXT_PUBLIC_BASE_URL')
console.log('')

console.log('2️⃣  Vercel Deployment Hooks')
console.log('   ✅ Webhook endpoint created: /api/deployment/webhook')
console.log('   📝 Setup steps:')
console.log('      1. Go to your Vercel project settings')
console.log('      2. Navigate to "Git" → "Deploy Hooks"')
console.log('      3. Add a new hook:')
console.log('         - Name: "Bunq IP Registration"')
console.log('         - URL: https://your-app.vercel.app/api/deployment/webhook')
console.log('         - Events: "deployment.succeeded"')
console.log('')

console.log('3️⃣  Manual GitHub Workflow Trigger')
console.log('   📝 You can manually trigger IP registration anytime:')
console.log('      gh workflow run register-bunq-ip.yml')
console.log('   📝 Or with a specific URL:')
console.log('      gh workflow run register-bunq-ip.yml -f deployment_url=https://your-app.vercel.app')
console.log('')

console.log('🔧 Next Steps:')
console.log('')
console.log('For GitHub Actions:')
console.log('1. Add the required secrets to your GitHub repository')
console.log('2. Push these changes to trigger the workflow setup')
console.log('3. The workflow will automatically run after successful deployments')
console.log('')

console.log('For Vercel Hooks:')
console.log('1. Set up the deployment hook in Vercel dashboard')
console.log('2. Test with a new deployment')
console.log('')

console.log('🧪 Testing:')
console.log('After setup, you can test by:')
console.log('1. Making a deployment')
console.log('2. Checking the Actions tab (for GitHub Actions)')
console.log('3. Checking Vercel function logs (for webhooks)')
console.log('4. Manually triggering: npm run register-bunq-ip')
console.log('')

console.log('✅ Setup files created successfully!')
console.log('📁 Files added:')
console.log('   - .github/workflows/register-bunq-ip.yml')
console.log('   - src/app/api/deployment/webhook/route.ts')
console.log('   - vercel.json')
console.log('   - scripts/setup-auto-ip-registration.js')
