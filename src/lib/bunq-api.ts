
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
			hasInstallationToken: !!process.env.BUNQ_INSTALLATION_RESPONSE_TOKEN,
			installationTokenLength: process.env.BUNQ_INSTALLATION_RESPONSE_TOKEN?.length || 0
		})
		
		if (!this.apiKey) {
			throw new Error('BUNQ_API_KEY environment variable is required')
		}
		
		if (!process.env.BUNQ_INSTALLATION_RESPONSE_TOKEN) {
			throw new Error('BUNQ_INSTALLATION_RESPONSE_TOKEN environment variable is required')
		}
	}

	/**
	 * Initialize bunq API context (session only, installation and device registration done manually)
	 */
	async initializeContext(): Promise<BunqApiContext> {
		try {
			console.log('Starting bunq context initialization...')
			
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
	 * Start session using pre-configured installation token
	 */
	private async startSession(): Promise<BunqApiResponse> {
		const installationToken = process.env.BUNQ_INSTALLATION_RESPONSE_TOKEN
		
		if (!installationToken) {
			throw new Error('BUNQ_INSTALLATION_RESPONSE_TOKEN environment variable is not set')
		}

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
