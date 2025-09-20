#!/usr/bin/env node

/**
 * Script to register the server's IP address with bunq API on deployment
 * This should be run after deployment to ensure the new server IP is whitelisted
 */

const https = require('https')
const http = require('http')

// Get the base URL from environment variables
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL 
	? `https://${process.env.VERCEL_URL}` 
	: 'http://localhost:3000'

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

// Main execution
async function registerIp() {
	try {
		const url = `${baseUrl}/api/bunq/register-ip`
		console.log(`📡 Making request to: ${url}`)
		
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
		console.error('This might be expected if the server is not yet running or environment variables are not set')
		
		// Don't fail the deployment if IP registration fails
		// This allows the deployment to continue even if bunq registration fails
		console.log('⚠️  Continuing deployment despite IP registration failure')
		process.exit(0)
	}
}

// Add delay to allow server to start up if this is run immediately after deployment
setTimeout(registerIp, 5000)
