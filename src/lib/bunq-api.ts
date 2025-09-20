import crypto from 'crypto'

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

export interface BunqApiContext {
	sessionToken: string
	userId: number
	monetaryAccountId: number
	installationToken: string
}

interface BunqApiResponse {
	Response: Array<{
		Id?: { id: number }
		Token?: { token: string }
		RequestInquiry?: BunqPaymentResponse
		UserPerson?: { id: number }
		MonetaryAccountBank?: { id: number }
		Installation?: {
			token: { token: string }
			server_public_key: { server_public_key: string }
		}
	}>
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
		
		throw new Error('Could not determine external IP address')
	} catch (error) {
		console.error('Error getting external IP address:', error)
		throw error
	}
}

class BunqApiClient {
	private baseUrl: string
	private apiKey: string | null = null
	private clientPublicKey: string | null = null
	private privateKey: string | null = null
	private accountId: number | null = null
	private context: BunqApiContext | null = null
	private initialized = false

	constructor() {
		this.baseUrl = process.env.BUNQ_API_BASE_URL || 'https://api.bunq.com'
	}

	/**
	 * Initialize environment variables and validate them
	 */
	private initializeEnvironment(): void {
		if (this.initialized) return

		this.apiKey = process.env.BUNQ_API_KEY || ''
		this.clientPublicKey = process.env.BUNQ_CLIENT_PUBLIC_KEY || ''
		this.privateKey = process.env.BUNQ_PRIVATE_KEY_FOR_SIGNING || ''
		this.accountId = process.env.BUNQ_ACCOUNT_ID_FOR_REQUESTS ? 
			parseInt(process.env.BUNQ_ACCOUNT_ID_FOR_REQUESTS, 10) : null
		
		console.log('BunqApiClient initialized with:', {
			baseUrl: this.baseUrl,
			hasApiKey: !!this.apiKey,
			hasClientPublicKey: !!this.clientPublicKey,
			hasPrivateKey: !!this.privateKey,
			accountId: this.accountId
		})
		
		if (!this.apiKey) {
			throw new Error('BUNQ_API_KEY environment variable is required')
		}
		
		if (!this.clientPublicKey) {
			throw new Error('BUNQ_CLIENT_PUBLIC_KEY environment variable is required')
		}

		if (!this.privateKey) {
			throw new Error('BUNQ_PRIVATE_KEY_FOR_SIGNING environment variable is required')
		}

		if (!this.accountId) {
			throw new Error('BUNQ_ACCOUNT_ID_FOR_REQUESTS environment variable is required')
		}

		this.initialized = true
	}

	/**
	 * Step 1: Installation - Register client public key with bunq
	 */
	async performInstallation(): Promise<string> {
		this.initializeEnvironment()
		
		console.log('Step 1: Performing bunq installation...')
		
		const requestBody = {
			client_public_key: this.clientPublicKey
		}

		const response = await fetch(`${this.baseUrl}/v1/installation`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'User-Agent': 'nijverhoek-deelauto/1.0'
			},
			body: JSON.stringify(requestBody)
		})

		if (!response.ok) {
			const errorText = await response.text()
			console.error('Installation failed:', {
				status: response.status,
				statusText: response.statusText,
				errorBody: errorText
			})
			throw new Error(`Installation failed: ${response.status} ${response.statusText} - ${errorText}`)
		}

		const data = await response.json() as BunqApiResponse
		console.log('Installation response:', JSON.stringify(data, null, 2))
		
		// Extract installation token from response
		const installationToken = data.Response?.[1]?.Token?.token
		if (!installationToken) {
			throw new Error('Installation token not found in response')
		}

		console.log('✅ Installation successful, token:', installationToken)
		return installationToken
	}

	/**
	 * Step 2: Device registration - Register this server with bunq
	 */
	async performDeviceRegistration(installationToken: string): Promise<void> {
		console.log('Step 2: Performing device registration...')
		
		// Get the server's external IP address
		const ipAddress = await getExternalIpAddress()
		console.log(`Registering with IP address: ${ipAddress}`)

		const requestBody = {
			description: "Nijverhoek Deelauto",
			secret: this.apiKey,
			permitted_ips: [ipAddress]
		}

		const response = await fetch(`${this.baseUrl}/v1/device-server`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'User-Agent': 'nijverhoek-deelauto/1.0',
				'X-Bunq-Client-Authentication': installationToken
			},
			body: JSON.stringify(requestBody)
		})

		if (!response.ok) {
			const errorText = await response.text()
			console.error('Device registration failed:', {
				status: response.status,
				statusText: response.statusText,
				errorBody: errorText
			})
			
			// Log the curl command for debugging
			console.log(`curl -L --request POST --url '${this.baseUrl}/v1/device-server' --header 'User-Agent: nijverhoek-deelauto/1.0' --header 'X-Bunq-Client-Authentication: ${installationToken}' --header 'Content-Type: application/json' --data '${JSON.stringify(requestBody)}'`)
			
			throw new Error(`Device registration failed: ${response.status} ${response.statusText} - ${errorText}`)
		}

		const responseData = await response.json()
		console.log('✅ Device registration successful:', JSON.stringify(responseData, null, 2))
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
			throw new Error(`Failed to create request signature: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	}

	/**
	 * Step 3: Start session with signature
	 */
	async startSession(installationToken: string): Promise<string> {
		console.log('Step 3: Starting session with signature...')
		
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
			
			// Log the curl command for debugging
			console.log(`curl -L --request POST --url '${this.baseUrl}/v1/session-server' --header 'User-Agent: nijverhoek-deelauto/1.0' --header 'X-Bunq-Client-Request-Id: ${this.generateRequestId()}' --header 'X-Bunq-Geolocation: 0 0 0 0 NL' --header 'X-Bunq-Language: nl_NL' --header 'X-Bunq-Region: nl_NL' --header 'X-Bunq-Client-Authentication: ${installationToken}' --header 'X-Bunq-Client-Signature: ${signature}' --data '${requestBodyString}'`)
			
			throw new Error(`Session start failed: ${response.status} ${response.statusText} - ${errorText}`)
		}

		const data = await response.json() as BunqApiResponse
		console.log('Session response:', JSON.stringify(data, null, 2))
		
		// Extract session token
		const sessionToken = data.Response?.[1]?.Token?.token
		if (!sessionToken) {
			throw new Error('Session token not found in response')
		}

		console.log('✅ Session started successfully')
		return sessionToken
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
				'X-Bunq-Language': 'nl_NL',
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
	 * Initialize bunq API context with complete authentication flow
	 */
	async initializeContext(): Promise<BunqApiContext> {
		try {
			this.initializeEnvironment()
			
			console.log('🚀 Starting complete bunq authentication flow...')
			
			// Step 1: Installation
			const installationToken = await this.performInstallation()
			
			// Step 2: Device registration
			await this.performDeviceRegistration(installationToken)
			
			// Step 3: Start session
			const sessionToken = await this.startSession(installationToken)
			
			// Step 4: Get user info
			console.log('Step 4: Getting user info...')
			const userInfo = await this.getUserInfo(sessionToken)
			const userId = userInfo.id
			console.log('User ID:', userId)

			this.context = {
				sessionToken,
				userId,
				monetaryAccountId: this.accountId!,
				installationToken
			}

			console.log('✅ Bunq context initialized successfully')
			return this.context
		} catch (error) {
			console.error('❌ Error initializing bunq context:', error)
			throw new Error(`Failed to initialize bunq API context: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
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

		console.log('Creating payment request for:', {
			userId,
			monetaryAccountId,
			amount: paymentData.amount_inquired.value,
			description: paymentData.description
		})

		const response = await fetch(
			`${this.baseUrl}/v1/user/${userId}/monetary-account/${monetaryAccountId}/request-inquiry`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Bunq-Client-Authentication': sessionToken,
					'X-Bunq-Client-Request-Id': this.generateRequestId(),
					'X-Bunq-Geolocation': '0 0 0 0 NL',
					'X-Bunq-Language': 'nl_NL',
					'X-Bunq-Region': 'nl_NL'
				},
				body: JSON.stringify(paymentData)
			}
		)

		if (!response.ok) {
			const errorText = await response.text()
			console.error('Payment request creation failed:', {
				status: response.status,
				statusText: response.statusText,
				errorBody: errorText
			})
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
					'X-Bunq-Language': 'nl_NL',
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
 */
export async function createBunqPaymentRequest(
	amount: number,
	description: string,
	userEmail: string,
	redirectUrl?: string
): Promise<{ paymentUrl: string; requestId: number }> {
	try {
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
		console.log('Payment request response:', JSON.stringify(response, null, 2))
		
		if (!response.bunqme_share_url) {
			console.error('No bunqme_share_url in response:', response)
			throw new Error('No payment URL returned from bunq')
		}

		return {
			paymentUrl: response.bunqme_share_url,
			requestId: response.id
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