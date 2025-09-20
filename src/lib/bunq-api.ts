
import crypto from 'crypto'
import { networkInterfaces } from 'os'

export interface BunqPaymentRequest {
	amount_inquired: {
		value: string
		currency: string
	}
	counterparty_alias: {
		type: 'EMAIL' | 'PHONE_NUMBER'
		value: string
	}
	description: string
	allow_bunqme: boolean
	redirect_url?: string
}

export interface BunqMeTabRequest {
	bunqme_tab_entry: {
		amount_inquired: {
			value: string
			currency: string
		}
		description: string
		redirect_url?: string
	}
}

export interface BunqPaymentResponse {
	id: number
	amount: {
		value: string
		currency: string
	}
	description: string
	bunqme_share_url?: string
	status: string
}

export interface BunqMeTabResponse {
	id: number
	created: string
	updated: string
	time_expiry: string | null
	monetary_account_id: number
	bunqme_tab_share_url: string
	bunqme_tab_entry: {
		amount_inquired: {
			value: string
			currency: string
		}
		description: string
		redirect_url?: string
	}[]
}

export interface BunqApiContext {
	sessionToken: string
	userId: number
	monetaryAccountId: number
}

interface BunqApiResponse {
	Response: Array<{
		Id?: { id: number };
		Token?: { token: string };
		RequestInquiry?: BunqPaymentResponse;
		BunqMeTab?: BunqMeTabResponse;
		UserPerson?: { id: number };
		MonetaryAccountBank?: { id: number };
	}>;
}

/**
 * Get the server's external IP address using a public service
 */
export async function getExternalIpAddress(): Promise<string> {
	try {
		// Try multiple services in case one is down
		const services = [
			'https://api.ipify.org?format=text',
			'https://icanhazip.com',
			'https://ifconfig.me/ip'
		]

		for (const service of services) {
			try {
				// Create a timeout promise
				const timeoutPromise = new Promise<never>((_, reject) => {
					setTimeout(() => reject(new Error('Request timeout')), 5000)
				})
				
				// Race between fetch and timeout
				const response = await Promise.race([
					fetch(service, {
						headers: {
							'User-Agent': 'nijverhoek-deelauto/1.0'
						}
					}),
					timeoutPromise
				])
				
				if (response.ok) {
					const ip = (await response.text()).trim()
					// Validate IP format
					if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip)) {
						console.log(`External IP address detected: ${ip}`)
						return ip
					}
				}
			} catch (error) {
				console.warn(`Failed to get IP from ${service}:`, error)
				continue
			}
		}
		
		// Fallback to local IP detection
		console.warn('Could not get external IP, falling back to local IP detection')
		return getLocalIpAddress()
	} catch (error) {
		console.error('Error getting external IP address:', error)
		return getLocalIpAddress()
	}
}

/**
 * Get the server's local IP address (fallback)
 */
function getLocalIpAddress(): string {
	const nets = networkInterfaces()
	const results: string[] = []

	for (const name of Object.keys(nets)) {
		const netInfo = nets[name]
		if (!netInfo) continue

		for (const net of netInfo) {
			// Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
			if (net.family === 'IPv4' && !net.internal) {
				results.push(net.address)
			}
		}
	}

	return results.length > 0 ? results[0] : 'Unknown'
}

class BunqApiClient {
	private baseUrl: string
	private apiKey: string | null = null
	private privateKey: string | null = null
	private context: BunqApiContext | null = null
	private initialized = false

	constructor() {
		// Use correct sandbox URL if not specified
		this.baseUrl = process.env.BUNQ_API_BASE_URL || 'https://api.bunq.com'
		
		// Fix common incorrect sandbox URLs
		if (this.baseUrl.includes('sandbox.public.api.bunq.com')) {
			this.baseUrl = 'https://public-api.sandbox.bunq.com'
		}
	}

	/**
	 * Initialize environment variables and validate them
	 */
	private initializeEnvironment(): void {
		if (this.initialized) return

		this.apiKey = process.env.BUNQ_API_KEY || ''
		this.privateKey = process.env.BUNQ_PRIVATE_KEY_FOR_SIGNING || ''
		
		console.log('BunqApiClient initialized with:', {
			baseUrl: this.baseUrl,
			hasApiKey: !!this.apiKey,
			apiKeyLength: this.apiKey.length,
			hasPrivateKey: !!this.privateKey,
			privateKeyLength: this.privateKey.length,
			privateKeyStartsWith: this.privateKey ? this.privateKey.substring(0, 30) + '...' : 'N/A',
			hasInstallationToken: !!process.env.BUNQ_INSTALLATION_RESPONSE_TOKEN,
			installationTokenLength: process.env.BUNQ_INSTALLATION_RESPONSE_TOKEN?.length || 0
		})
		
		if (!this.apiKey) {
			throw new Error('BUNQ_API_KEY environment variable is required')
		}
		
		if (!process.env.BUNQ_INSTALLATION_RESPONSE_TOKEN) {
			throw new Error('BUNQ_INSTALLATION_RESPONSE_TOKEN environment variable is required')
		}

		if (!this.privateKey) {
			throw new Error('BUNQ_PRIVATE_KEY_FOR_SIGNING environment variable is required')
		}

		this.initialized = true
	}

	/**
	 * Initialize bunq API context (session only, installation and device registration done manually)
	 */
	async initializeContext(): Promise<BunqApiContext> {
		try {
			// Initialize environment variables first
			this.initializeEnvironment()
			
			console.log('Starting bunq context initialization...')
			
			// Optional: Register IP address if in production environment
			// This is a fallback in case the deployment script doesn't run
			if (process.env.NODE_ENV === 'production' && process.env.BUNQ_AUTO_REGISTER_IP === 'true') {
				console.log('Auto-registering IP address for production environment...')
				try {
					const ipResult = await this.registerServerIpAddress()
					if (ipResult.success) {
						console.log('✅ IP auto-registration successful during context initialization')
					} else {
						console.warn('⚠️ IP auto-registration failed during context initialization:', ipResult.message)
					}
				} catch (error) {
					console.warn('⚠️ IP auto-registration error during context initialization:', error)
					// Don't fail context initialization if IP registration fails
				}
			}
			
			// Step 1: Start session using pre-configured installation token
			console.log('Step 1: Starting session...')
			const sessionResponse = await this.startSession()
			console.log('Session response:', JSON.stringify(sessionResponse, null, 2))
			
			// Extract session token
			const sessionToken = sessionResponse.Response?.[1]?.Token?.token
			if (!sessionToken) {
				throw new Error('Session token not found in response')
			}

			// Step 2: Get user and monetary account info
			console.log('Step 2: Getting user info...')
			const userInfo = await this.getUserInfo(sessionToken)
			console.log('User info:', userInfo)
			const userId = userInfo.id
			
			console.log('Step 3: Getting monetary account...')
			const monetaryAccountId = await this.getMonetaryAccountId(sessionToken, userId)
			console.log('Monetary account ID:', monetaryAccountId)

			this.context = {
				sessionToken,
				userId,
				monetaryAccountId
			}

			console.log('Bunq context initialized successfully')
			return this.context
		} catch (error) {
			console.error('Error initializing bunq context:', error)
			console.error('Error details:', {
				message: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined
			})
			throw new Error(`Failed to initialize bunq API context: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	}


	/**
	 * Create a signature for bunq API requests using the private key
	 */
	private createSignature(data: string): string {
		if (!this.privateKey) {
			throw new Error('Private key not initialized')
		}

		try {
			let formattedPrivateKey = this.privateKey

			// Handle different private key formats
			if (this.privateKey.includes('\\n')) {
				// Fix escaped newlines in private key (common issue with environment variables)
				formattedPrivateKey = this.privateKey.replace(/\\n/g, '\n')
			} else if (!this.privateKey.includes('\n') && !this.privateKey.startsWith('-----BEGIN')) {
				// If it's a base64 encoded key without proper formatting, decode it
				try {
					formattedPrivateKey = Buffer.from(this.privateKey, 'base64').toString('utf-8')
				} catch {
					// If base64 decoding fails, assume it's already in the correct format
					console.log('Private key is not base64 encoded, using as-is')
				}
			}

			// Ensure the key has proper PEM headers if missing
			if (!formattedPrivateKey.includes('-----BEGIN')) {
				console.warn('Private key missing PEM headers, this may cause issues')
			}
			
			// Create SHA256 signature using the private key
			const sign = crypto.createSign('SHA256')
			sign.update(data, 'utf8')
			sign.end()
			
			// Sign with the private key and encode as base64
			const signature = sign.sign(formattedPrivateKey, 'base64')
			return signature
		} catch (error) {
			console.error('Error creating signature:', error)
			console.error('Private key length:', this.privateKey?.length)
			console.error('Private key starts with:', this.privateKey?.substring(0, 50))
			console.error('Private key format check:', {
				hasNewlines: this.privateKey.includes('\n'),
				hasEscapedNewlines: this.privateKey.includes('\\n'),
				hasPemHeaders: this.privateKey.includes('-----BEGIN')
			})
			throw new Error(`Failed to create request signature: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	}

	/**
	 * Start session using pre-configured installation token
	 */
	private async startSession(): Promise<BunqApiResponse> {
		const installationToken = process.env.BUNQ_INSTALLATION_RESPONSE_TOKEN
		
		if (!installationToken) {
			throw new Error('BUNQ_INSTALLATION_RESPONSE_TOKEN environment variable is not set')
		}

		if (!this.apiKey) {
			throw new Error('API key not initialized')
		}

		const requestBody = {
			secret: this.apiKey
		}

		const requestBodyString = JSON.stringify(requestBody)
		const signature = this.createSignature(requestBodyString)

		console.log('Starting session with:', {
			url: `${this.baseUrl}/v1/session-server`,
			hasInstallationToken: !!installationToken,
			hasApiKey: !!this.apiKey,
			hasSignature: !!signature
		})

		const response = await fetch(`${this.baseUrl}/v1/session-server`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'User-Agent': 'nijverhoek-deelauto/1.0',
				'X-Bunq-Client-Request-Id': this.generateRequestId(),
				'X-Bunq-Geolocation': '0 0 0 0 NL',
				'X-Bunq-Language': 'nl_NL',
				'X-Bunq-Region': 'nl_NL',
				'X-Bunq-Client-Authentication': installationToken,
				'X-Bunq-Client-Signature': signature
			},
			body: requestBodyString
		})

		if (!response.ok) {
			const errorText = await response.text()
			console.error('Session start failed:', {
				status: response.status,
				statusText: response.statusText,
				errorBody: errorText
			})
      // Console.log the fetch command as a cURL command:
      console.log(`curl -X POST ${this.baseUrl}/v1/session-server -H "Content-Type: application/json" -H "User-Agent: nijverhoek-deelauto/1.0" -H "X-Bunq-Client-Request-Id: ${this.generateRequestId()}" -H "X-Bunq-Geolocation: 0 0 0 0 NL" -H "X-Bunq-Language: en_US" -H "X-Bunq-Region: nl_NL" -H "X-Bunq-Client-Authentication: ${installationToken}" -H "X-Bunq-Client-Signature: ${signature}" -d '${requestBodyString}'`)
      // Console.log server IP address of this app:
      const serverIp = await getExternalIpAddress()
      console.log(`Server IP address: ${serverIp}`)
			throw new Error(`Session start failed: ${response.status} ${response.statusText} - ${errorText}`)
		}

		return response.json()
	}

	/**
	 * Get user information
	 */
	private async getUserInfo(sessionToken: string): Promise<{ id: number }> {
		const response = await fetch(`${this.baseUrl}/v1/user`, {
			method: 'GET',
			headers: {
				'X-Bunq-Client-Authentication': sessionToken,
				'X-Bunq-Client-Request-Id': this.generateRequestId(),
				'X-Bunq-Geolocation': '0 0 0 0 NL',
				'X-Bunq-Language': 'en_US',
				'X-Bunq-Region': 'nl_NL'
			}
		})

		if (!response.ok) {
			throw new Error(`Get user info failed: ${response.statusText}`)
		}

		const data = await response.json() as BunqApiResponse
		return data.Response[0].UserPerson!
	}

	/**
	 * Get monetary account ID - use configured account for payment requests
	 */
	private async getMonetaryAccountId(sessionToken: string, userId: number): Promise<number> {
		// Check if specific account ID is configured via environment variable
		const configuredAccountId = process.env.BUNQ_ACCOUNT_ID_FOR_REQUESTS
		if (configuredAccountId) {
			const accountId = parseInt(configuredAccountId, 10)
			if (!isNaN(accountId)) {
				console.log(`Using configured monetary account ID: ${accountId}`)
				return accountId
			} else {
				console.warn(`Invalid BUNQ_ACCOUNT_ID_FOR_REQUESTS value: ${configuredAccountId}. Must be a number.`)
			}
		}

		// Fallback: fetch the available monetary accounts
		console.log('No specific account ID configured, fetching available accounts...')
		const response = await fetch(`${this.baseUrl}/v1/user/${userId}/monetary-account`, {
			method: 'GET',
			headers: {
				'X-Bunq-Client-Authentication': sessionToken,
				'X-Bunq-Client-Request-Id': this.generateRequestId(),
				'X-Bunq-Geolocation': '0 0 0 0 NL',
				'X-Bunq-Language': 'en_US',
				'X-Bunq-Region': 'nl_NL'
			}
		})

		if (!response.ok) {
			throw new Error(`Get monetary account failed: ${response.statusText}`)
		}

		const data = await response.json() as BunqApiResponse
		console.log('Available monetary accounts:', JSON.stringify(data, null, 2))
		
		// Return the first monetary account ID as fallback
		return data.Response[0].MonetaryAccountBank!.id
	}

	/**
	 * Create a payment request (bunq.me link)
	 */
	async createPaymentRequest(paymentData: BunqPaymentRequest): Promise<BunqPaymentResponse> {
		if (!this.context) {
			await this.initializeContext()
		}

		if (!this.context) {
			throw new Error('Failed to initialize bunq context')
		}

		const { sessionToken, userId, monetaryAccountId } = this.context

		const response = await fetch(
			`${this.baseUrl}/v1/user/${userId}/monetary-account/${monetaryAccountId}/request-inquiry`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Bunq-Client-Authentication': sessionToken,
					'X-Bunq-Client-Request-Id': this.generateRequestId(),
					'X-Bunq-Geolocation': '0 0 0 0 NL',
					'X-Bunq-Language': 'en_US',
					'X-Bunq-Region': 'nl_NL'
				},
				body: JSON.stringify(paymentData)
			}
		)

		if (!response.ok) {
			const errorText = await response.text()
			throw new Error(`Payment request creation failed: ${response.statusText} - ${errorText}`)
		}

		const data = await response.json() as BunqApiResponse
		console.log('Bunq payment request response:', JSON.stringify(data, null, 2))
		
		// Check if we have the expected response structure with ID
		if (!data.Response || !data.Response[0] || !data.Response[0].Id || !data.Response[0].Id.id) {
			console.error('Unexpected response structure:', data)
			throw new Error('Unexpected response structure from bunq API')
		}
		
		const requestId = data.Response[0].Id.id
		console.log('Created request inquiry with ID:', requestId)
		
		// Now fetch the full RequestInquiry object to get the bunqme_share_url
		return await this.getRequestInquiryDetails(requestId)
	}

	/**
	 * Create a BunqMeTab (universal payment link that works for all users)
	 */
	async createBunqMeTab(tabData: BunqMeTabRequest): Promise<BunqMeTabResponse> {
		if (!this.context) {
			await this.initializeContext()
		}

		if (!this.context) {
			throw new Error('Failed to initialize bunq context')
		}

		const { sessionToken, userId, monetaryAccountId } = this.context

		const response = await fetch(
			`${this.baseUrl}/v1/user/${userId}/monetary-account/${monetaryAccountId}/bunqme-tab`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Bunq-Client-Authentication': sessionToken,
					'X-Bunq-Client-Request-Id': this.generateRequestId(),
					'X-Bunq-Geolocation': '0 0 0 0 NL',
					'X-Bunq-Language': 'en_US',
					'X-Bunq-Region': 'nl_NL'
				},
				body: JSON.stringify(tabData)
			}
		)

		if (!response.ok) {
			const errorText = await response.text()
			throw new Error(`BunqMeTab creation failed: ${response.statusText} - ${errorText}`)
		}

		const data = await response.json() as BunqApiResponse
		console.log('Bunq BunqMeTab response:', JSON.stringify(data, null, 2))
		
		// Check if we have the expected response structure
		if (!data.Response || !data.Response[0] || !data.Response[0].BunqMeTab) {
			console.error('Unexpected BunqMeTab response structure:', data)
			throw new Error('Unexpected BunqMeTab response structure from bunq API')
		}
		
		return data.Response[0].BunqMeTab
	}

	/**
	 * Get request inquiry details by ID
	 */
	private async getRequestInquiryDetails(requestId: number): Promise<BunqPaymentResponse> {
		if (!this.context) {
			throw new Error('Bunq context not initialized')
		}

		const { sessionToken, userId, monetaryAccountId } = this.context

		const response = await fetch(
			`${this.baseUrl}/v1/user/${userId}/monetary-account/${monetaryAccountId}/request-inquiry/${requestId}`,
			{
				method: 'GET',
				headers: {
					'X-Bunq-Client-Authentication': sessionToken,
					'X-Bunq-Client-Request-Id': this.generateRequestId(),
					'X-Bunq-Geolocation': '0 0 0 0 NL',
					'X-Bunq-Language': 'en_US',
					'X-Bunq-Region': 'nl_NL'
				}
			}
		)

		if (!response.ok) {
			const errorText = await response.text()
			throw new Error(`Get request inquiry details failed: ${response.statusText} - ${errorText}`)
		}

		const data = await response.json() as BunqApiResponse
		console.log('Request inquiry details:', JSON.stringify(data, null, 2))
		
		if (!data.Response || !data.Response[0] || !data.Response[0].RequestInquiry) {
			console.error('Unexpected request inquiry details structure:', data)
			throw new Error('Unexpected request inquiry details structure from bunq API')
		}
		
		return data.Response[0].RequestInquiry
	}

	/**
	 * Check the status of a payment request by ID
	 */
	async checkPaymentRequestStatus(requestId: number): Promise<BunqPaymentResponse> {
		if (!this.context) {
			await this.initializeContext()
		}

		if (!this.context) {
			throw new Error('Failed to initialize bunq context')
		}

		return await this.getRequestInquiryDetails(requestId)
	}

	/**
	 * Register the server's IP address with bunq API for device-server
	 */
	async registerServerIpAddress(): Promise<{ success: boolean; ipAddress: string; message: string }> {
		try {
			// Initialize environment variables
			this.initializeEnvironment()

			// Get the server's external IP address
			const ipAddress = await getExternalIpAddress()
			console.log(`Registering IP address with bunq: ${ipAddress}`)

			const installationToken = process.env.BUNQ_INSTALLATION_RESPONSE_TOKEN
			if (!installationToken) {
				throw new Error('BUNQ_INSTALLATION_RESPONSE_TOKEN environment variable is required')
			}

			if (!this.apiKey) {
				throw new Error('BUNQ_API_KEY environment variable is required')
			}

			// Prepare the device-server registration request
			const requestBody = {
				description: "Nijverhoek Deelauto",
				secret: this.apiKey,
				permitted_ips: [ipAddress]
			}

			const requestBodyString = JSON.stringify(requestBody)

			console.log('Registering device-server with bunq API...')
			const response = await fetch(`${this.baseUrl}/v1/device-server`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'User-Agent': 'nijverhoek-deelauto/1.0',
					'X-Bunq-Client-Authentication': installationToken
				},
				body: requestBodyString
			})

			if (!response.ok) {
				const errorText = await response.text()
				console.error('Device-server registration failed:', {
					status: response.status,
					statusText: response.statusText,
					errorBody: errorText
				})
				
				// Log the curl command for debugging
				console.log(`curl -L --request POST --url '${this.baseUrl}/v1/device-server' --header 'User-Agent: nijverhoek-deelauto/1.0' --header 'X-Bunq-Client-Authentication: ${installationToken}' --header 'Content-Type: application/json' --data '${requestBodyString}'`)
				
				throw new Error(`Device-server registration failed: ${response.status} ${response.statusText} - ${errorText}`)
			}

			const responseData = await response.json()
			console.log('Device-server registration successful:', JSON.stringify(responseData, null, 2))

			return {
				success: true,
				ipAddress,
				message: `Successfully registered IP address ${ipAddress} with bunq API`
			}

		} catch (error) {
			console.error('Error registering server IP address:', error)
			const ipAddress = await getExternalIpAddress().catch(() => 'Unknown')
			
			return {
				success: false,
				ipAddress,
				message: `Failed to register IP address: ${error instanceof Error ? error.message : 'Unknown error'}`
			}
		}
	}

	/**
	 * Generate a unique request ID
	 */
	private generateRequestId(): string {
		return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
	}
}

// Export singleton instance
export const bunqApi = new BunqApiClient()

/**
 * Helper function to create a bunq payment request for the deelauto system
 * Checks user preference to decide between direct bunq user request or universal payment URL
 */
export async function createBunqPaymentRequest(
	amount: number,
	description: string,
	userEmail: string,
	redirectUrl?: string
): Promise<{ paymentUrl: string | null; requestId: number; isBunqUserRequest: boolean }> {
	try {
		// Import here to avoid circular dependency
		const { connectToDatabase } = await import('./mongodb')
		const { User } = await import('../types/models')
		
		// Look up the user to check their preference
		const { db } = await connectToDatabase()
		const user = await db.collection('Users').findOne({
			email_address: userEmail
		}) as any // Type assertion to avoid import issues
		
		const shouldUseBunqUserRequest = user?.use_bunq_user_request === true
		
		if (shouldUseBunqUserRequest) {
			// Create direct bunq user request (original RequestInquiry method)
			console.log(`Creating direct bunq user request for ${userEmail}`)
			
			const paymentRequest: BunqPaymentRequest = {
				amount_inquired: {
					value: amount.toFixed(2),
					currency: 'EUR'
				},
				counterparty_alias: {
					type: 'EMAIL',
					value: userEmail
				},
				description,
				allow_bunqme: true,
				redirect_url: redirectUrl
			}

			const response = await bunqApi.createPaymentRequest(paymentRequest)
			console.log('Direct bunq user request response:', JSON.stringify(response, null, 2))
			
			// For bunq users, bunqme_share_url will be null - this is expected
			return {
				paymentUrl: response.bunqme_share_url || null,
				requestId: response.id,
				isBunqUserRequest: true
			}
		} else {
			// Create universal payment URL (BunqMeTab method)
			console.log(`Creating universal payment URL for ${userEmail}`)
			
			const bunqMeTabRequest: BunqMeTabRequest = {
				bunqme_tab_entry: {
					amount_inquired: {
						value: amount.toFixed(2),
						currency: 'EUR'
					},
					description,
					redirect_url: redirectUrl
				}
			}

			const response = await bunqApi.createBunqMeTab(bunqMeTabRequest)
			console.log('BunqMeTab response:', JSON.stringify(response, null, 2))
			
			if (!response.bunqme_tab_share_url) {
				console.error('No bunqme_tab_share_url in response:', response)
				throw new Error('No payment URL returned from bunq')
			}

			return {
				paymentUrl: response.bunqme_tab_share_url,
				requestId: response.id,
				isBunqUserRequest: false
			}
		}
	} catch (error) {
		console.error('Error creating bunq payment request:', error)
		throw new Error('Failed to create bunq payment request')
	}
}

/**
 * Helper function to check bunq payment status and return normalized status
 */
export async function checkBunqPaymentStatus(requestId: number): Promise<string> {
	try {
		const response = await bunqApi.checkPaymentRequestStatus(requestId)
		console.log('Bunq payment status check response:', JSON.stringify(response, null, 2))
		
		// Normalize bunq status to our internal status format
		const bunqStatus = response.status?.toUpperCase()
		
		switch (bunqStatus) {
			case 'PENDING':
				return 'PENDING'
			case 'ACCEPTED':
			case 'SETTLED':
				return 'ACCEPTED'
			case 'REJECTED':
			case 'CANCELLED':
				return 'REJECTED'
			default:
				console.warn('Unknown bunq status:', bunqStatus)
				return bunqStatus || 'UNKNOWN'
		}
	} catch (error) {
		console.error('Error checking bunq payment status:', error)
		throw new Error('Failed to check bunq payment status')
	}
}

/**
 * Helper function to register server IP address with bunq API
 */
export async function registerBunqServerIp(): Promise<{ success: boolean; ipAddress: string; message: string }> {
	return await bunqApi.registerServerIpAddress()
}
