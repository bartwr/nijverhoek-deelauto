
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
	installationToken: string
	deviceToken: string
	sessionToken: string
	userId: number
	monetaryAccountId: number
}

interface BunqApiResponse {
	Response: Array<{
		Id?: { id: number };
		Token?: { token: string };
		RequestInquiry?: BunqPaymentResponse;
		UserPerson?: { id: number };
		MonetaryAccountBank?: { id: number };
	}>;
}

class BunqApiClient {
	private baseUrl: string
	private apiKey: string
	private context: BunqApiContext | null = null

	constructor() {
		// Use correct sandbox URL if not specified
		this.baseUrl = process.env.BUNQ_API_BASE_URL || 'https://api.bunq.com'
		
		// Fix common incorrect sandbox URLs
		if (this.baseUrl.includes('sandbox.public.api.bunq.com')) {
			this.baseUrl = 'https://public-api.sandbox.bunq.com'
		}
		
		this.apiKey = process.env.BUNQ_API_KEY || ''
		
		console.log('BunqApiClient initialized with:', {
			baseUrl: this.baseUrl,
			hasApiKey: !!this.apiKey,
			apiKeyLength: this.apiKey.length,
			hasClientPublicKey: !!process.env.BUNQ_CLIENT_PUBLIC_KEY,
			clientPublicKeyLength: process.env.BUNQ_CLIENT_PUBLIC_KEY?.length || 0
		})
		
		if (!this.apiKey) {
			throw new Error('BUNQ_API_KEY environment variable is required')
		}
		
		if (!process.env.BUNQ_CLIENT_PUBLIC_KEY) {
			throw new Error('BUNQ_CLIENT_PUBLIC_KEY environment variable is required')
		}
	}

	/**
	 * Initialize bunq API context (installation, device registration, session)
	 */
	async initializeContext(): Promise<BunqApiContext> {
		try {
			console.log('Starting bunq context initialization...')
			
		// Step 1: Create installation
		console.log('Step 1: Creating installation...')
		const installationResponse = await this.createInstallation()
		console.log('Installation response:', JSON.stringify(installationResponse, null, 2))
		
		// Extract installation token - bunq API returns it in Response[1].Token.token
		const installationToken = installationResponse.Response?.[1]?.Token?.token
		if (!installationToken) {
			throw new Error('Installation token not found in response')
		}

		// Step 2: Register device
		console.log('Step 2: Registering device...')
		const deviceResponse = await this.registerDevice(installationToken)
		console.log('Device response:', JSON.stringify(deviceResponse, null, 2))
		
		// Extract device ID (device registration returns ID, not token)
		const deviceId = deviceResponse.Response?.[0]?.Id?.id
		if (!deviceId) {
			throw new Error('Device ID not found in response')
		}
		console.log('Device registered with ID:', deviceId)

		// Step 3: Start session
		console.log('Step 3: Starting session...')
		const sessionResponse = await this.startSession(installationToken)
		console.log('Session response:', JSON.stringify(sessionResponse, null, 2))
		
		// Extract session token
		const sessionToken = sessionResponse.Response?.[1]?.Token?.token
		if (!sessionToken) {
			throw new Error('Session token not found in response')
		}

			// Step 4: Get user and monetary account info
			console.log('Step 4: Getting user info...')
			const userInfo = await this.getUserInfo(sessionToken)
			console.log('User info:', userInfo)
			const userId = userInfo.id
			
			console.log('Step 5: Getting monetary account...')
			const monetaryAccountId = await this.getMonetaryAccountId(sessionToken, userId)
			console.log('Monetary account ID:', monetaryAccountId)

			this.context = {
				installationToken,
				deviceToken: '', // Device registration doesn't return a token, just an ID
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
	 * Create installation
	 */
	private async createInstallation(): Promise<BunqApiResponse> {
		const clientPublicKey = process.env.BUNQ_CLIENT_PUBLIC_KEY || ''
		
		if (!clientPublicKey) {
			throw new Error('BUNQ_CLIENT_PUBLIC_KEY environment variable is not set')
		}

		const requestBody = {
			client_public_key: clientPublicKey
		}

		console.log('Creating bunq installation with:', {
			url: `${this.baseUrl}/v1/installation`,
			hasPublicKey: !!clientPublicKey,
			publicKeyLength: clientPublicKey.length
		})

		const response = await fetch(`${this.baseUrl}/v1/installation`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Bunq-Client-Request-Id': this.generateRequestId(),
				'X-Bunq-Geolocation': '0 0 0 0 NL',
				'X-Bunq-Language': 'en_US',
				'X-Bunq-Region': 'nl_NL',
				'X-Bunq-Client-Signature': '' // Will be set by bunq SDK
			},
			body: JSON.stringify(requestBody)
		})

		if (!response.ok) {
			const errorText = await response.text()
			console.error('Bunq installation failed:', {
				status: response.status,
				statusText: response.statusText,
				errorBody: errorText
			})
			throw new Error(`Installation failed: ${response.status} ${response.statusText} - ${errorText}`)
		}

		return response.json()
	}

	/**
	 * Register device
	 */
	private async registerDevice(installationToken: string): Promise<BunqApiResponse> {
		const requestBody = {
			description: 'Deelauto Nijverhoek Payment System',
			secret: this.apiKey
		}

		console.log('Registering device with:', {
			url: `${this.baseUrl}/v1/device-server`,
			hasInstallationToken: !!installationToken,
			hasApiKey: !!this.apiKey,
			apiKeyLength: this.apiKey.length
		})

		const response = await fetch(`${this.baseUrl}/v1/device-server`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Bunq-Client-Request-Id': this.generateRequestId(),
				'X-Bunq-Geolocation': '0 0 0 0 NL',
				'X-Bunq-Language': 'en_US',
				'X-Bunq-Region': 'nl_NL',
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
			throw new Error(`Device registration failed: ${response.status} ${response.statusText} - ${errorText}`)
		}

		return response.json()
	}

	/**
	 * Start session
	 */
	private async startSession(installationToken: string): Promise<BunqApiResponse> {
		const requestBody = {
			secret: this.apiKey
		}

		console.log('Starting session with:', {
			url: `${this.baseUrl}/v1/session-server`,
			hasInstallationToken: !!installationToken,
			hasApiKey: !!this.apiKey
		})

		const response = await fetch(`${this.baseUrl}/v1/session-server`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Bunq-Client-Request-Id': this.generateRequestId(),
				'X-Bunq-Geolocation': '0 0 0 0 NL',
				'X-Bunq-Language': 'en_US',
				'X-Bunq-Region': 'nl_NL',
				'X-Bunq-Client-Authentication': installationToken
			},
			body: JSON.stringify(requestBody)
		})

		if (!response.ok) {
			const errorText = await response.text()
			console.error('Session start failed:', {
				status: response.status,
				statusText: response.statusText,
				errorBody: errorText
			})
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
	 * Get monetary account ID
	 */
	private async getMonetaryAccountId(sessionToken: string, userId: number): Promise<number> {
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
		// Return the first monetary account ID
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
