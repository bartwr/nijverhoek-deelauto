#!/usr/bin/env node

/**
 * Script to register the server's IP address with bunq API after deployment
 * 
 * This script should be run AFTER deployment is complete and publicly accessible.
 * 
 * Usage:
 *   npm run register-bunq-ip                    # Use environment URL
 *   node scripts/register-bunq-ip.js <URL>      # Use specific URL
 * 
 * Example:
 *   node scripts/register-bunq-ip.js https://your-app.vercel.app
 */

const https = require('https')
const http = require('http')

// Get the base URL from command line args or environment variables
const baseUrl = process.argv[2] || 
	process.env.NEXT_PUBLIC_BASE_URL || 
	(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
	'http://localhost:3000'

console.log('🚀 Starting bunq IP registration...')
console.log(`Base URL: ${baseUrl}`)

// Function to make HTTP request
function makeRequest(url) {
	return new Promise((resolve, reject) => {
		const client = url.startsWith('https') ? https : http
		
		const req = client.request(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'User-Agent': 'nijverhoek-deelauto-deployment/1.0'
			},
			timeout: 30000
		}, (res) => {
			let data = ''
			
			res.on('data', (chunk) => {
				data += chunk
			})
			
			res.on('end', () => {
				try {
					const result = JSON.parse(data)
					resolve({ status: res.statusCode, data: result })
				} catch (error) {
					resolve({ status: res.statusCode, data: { error: 'Invalid JSON response', raw: data } })
				}
			})
		})
		
		req.on('error', (error) => {
			reject(error)
		})
		
		req.on('timeout', () => {
			req.destroy()
			reject(new Error('Request timeout'))
		})
		
		req.end()
	})
}

// Function to check if the deployment is accessible
async function checkDeploymentAccessibility() {
	try {
		const url = `${baseUrl}/api/bunq/register-ip`
		console.log(`🔍 Checking if deployment is accessible: ${url}`)
		
		const response = await makeRequest(url)
		
		// Check if we got the authentication page (HTML response)
		if (response.status === 401 && response.data.raw && response.data.raw.includes('Authentication Required')) {
			console.error('❌ Deployment is protected by Vercel deployment protection!')
			console.error('🔒 The deployment is not yet publicly accessible.')
			console.error('')
			console.error('💡 Solutions:')
			console.error('   1. Wait for deployment protection to be disabled')
			console.error('   2. Run this script manually after deployment is complete')
			console.error('   3. Use the Vercel bypass token if available')
			console.error('')
			console.error('📖 More info: https://vercel.com/docs/deployment-protection')
			return false
		}
		
		return true
	} catch (error) {
		console.error('💥 Error checking deployment accessibility:', error.message)
		return false
	}
}

// Main execution
async function registerIp() {
	try {
		// First check if the deployment is accessible
		const isAccessible = await checkDeploymentAccessibility()
		if (!isAccessible) {
			console.log('⚠️  Skipping IP registration due to accessibility issues')
			process.exit(1)
		}
		
		const url = `${baseUrl}/api/bunq/register-ip`
		console.log(`📡 Making IP registration request to: ${url}`)
		
		const response = await makeRequest(url)
		
		if (response.status === 200 && response.data.success) {
			console.log('✅ IP registration successful!')
			console.log(`🌐 Registered IP: ${response.data.ipAddress}`)
			console.log(`📝 Message: ${response.data.message}`)
			process.exit(0)
		} else {
			console.error('❌ IP registration failed!')
			console.error(`Status: ${response.status}`)
			console.error('Response:', JSON.stringify(response.data, null, 2))
			process.exit(1)
		}
	} catch (error) {
		console.error('💥 Error during IP registration:', error.message)
		console.error('')
		console.error('💡 This script should be run AFTER deployment is complete and publicly accessible.')
		console.error('   Try running it manually with the deployed URL:')
		console.error(`   node scripts/register-bunq-ip.js ${baseUrl}`)
		process.exit(1)
	}
}

// Run the IP registration
registerIp()
