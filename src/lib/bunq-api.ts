
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
	created?: string
	updated?: string
	time_expiry?: string | null
	monetary_account_id?: number
	amount_inquired?: {
		value: string
		currency: string
	}
	amount?: {
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
	} | {
		amount_inquired: {
			value: string
			currency: string
		}
		description: string
		redirect_url?: string
	}[]
	bunqme_tab_entries?: {
		amount_inquired: {
			value: string
			currency: string
		}
		description: string
		redirect_url?: string
	}[]
	result_inquiries?: {
		id: number
		created: string
		updated: string
		bunq_me_tab_id: number
		payment: {
			Payment: {
				id: number
				created: string
				updated: string
				monetary_account_id: number
				amount: {
					currency: string
					value: string
				}
				description: string
				payment_arrival_expected: {
					status: string
					time: string | null
				}
				[key: string]: unknown
			}
		}
	}[]
}

/**
 * Summary of a monetary account the OAuth token was granted access to.
 */
export interface BunqMonetaryAccountSummary {
	id: number
	type: 'MonetaryAccountBank' | 'MonetaryAccountSavings' | 'MonetaryAccountJoint' | string
	description: string
	iban: string | null
	status: string
}

/**
 * Outcome of registering this server with bunq (POST /device-server).
 */
export interface BunqIpRegistrationResult {
	success: boolean
	ipAddress: string
	message: string
	/**
	 * Present when a fresh installation had to be created. Must be stored as
	 * `BUNQ_INSTALLATION_RESPONSE_TOKEN`; it is never logged or persisted.
	 */
	newInstallationToken?: string
}

export interface BunqApiContext {
	sessionToken: string
	/**
	 * The id to use in `/user/{id}/...` URLs. For an OAuth session this is the
	 * `UserApiKey` id, not the id of the person who granted access.
	 */
	userId: number
	monetaryAccountId: number
	/** The account that payment requests are created on. */
	account: BunqMonetaryAccountSummary
	/** All accounts the OAuth grant gives access to. */
	grantedAccounts: BunqMonetaryAccountSummary[]
}

interface BunqMonetaryAccountRaw {
	id: number
	description?: string
	status?: string
	alias?: Array<{ type: string; value: string; name?: string }>
}

interface BunqApiResponse {
	Response: Array<{
		Id?: { id: number };
		Token?: { token: string };
		RequestInquiry?: BunqPaymentResponse;
		BunqMeTab?: BunqMeTabResponse;
		UserPerson?: { id: number };
		UserCompany?: { id: number };
		UserApiKey?: { id: number };
		MonetaryAccountBank?: BunqMonetaryAccountRaw;
		MonetaryAccountSavings?: BunqMonetaryAccountRaw;
		MonetaryAccountJoint?: BunqMonetaryAccountRaw;
	}>;
}

const MONETARY_ACCOUNT_KEYS = [
	'MonetaryAccountBank',
	'MonetaryAccountSavings',
	'MonetaryAccountJoint',
] as const

const USER_KEYS = ['UserApiKey', 'UserPerson', 'UserCompany'] as const

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
	/**
	 * bunq OAuth access token. Obtained once via the admin OAuth flow and
	 * scoped to the monetary account(s) selected during consent. Used as the
	 * `secret` for device-server and session-server, exactly like an API key.
	 */
	private accessToken: string | null = null
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

		this.accessToken = process.env.BUNQ_OAUTH_ACCESS_TOKEN || ''
		this.privateKey = process.env.BUNQ_PRIVATE_KEY_FOR_SIGNING || ''
		
		console.log('BunqApiClient initialized with:', {
			baseUrl: this.baseUrl,
			hasAccessToken: !!this.accessToken,
			hasPrivateKey: !!this.privateKey,
			hasInstallationToken: !!process.env.BUNQ_INSTALLATION_RESPONSE_TOKEN,
			configuredAccountId: process.env.BUNQ_ACCOUNT_ID_FOR_REQUESTS || null
		})
		
		if (!this.accessToken) {
			throw new Error(
				'BUNQ_OAUTH_ACCESS_TOKEN environment variable is required. ' +
				'Authorize the app via the admin dashboard (Bunq-koppeling).'
			)
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
			
			// Extract session token
			const sessionToken = sessionResponse.Response?.[1]?.Token?.token
			if (!sessionToken) {
				throw new Error('Session token not found in response')
			}

			// Step 2: Extract the user id from the session response. For OAuth
			// sessions bunq returns a UserApiKey object whose id must be used in
			// URLs instead of the granting person's id.
			const userId = this.extractUserId(sessionResponse)
			console.log('Step 2: Session user id resolved:', userId)
			
			// Step 3: List the accounts the grant covers and pin the one to use
			console.log('Step 3: Resolving monetary account...')
			const grantedAccounts = await this.getGrantedMonetaryAccounts(sessionToken, userId)
			const account = this.selectMonetaryAccount(grantedAccounts)
			console.log('Monetary account pinned:', {
				id: account.id,
				description: account.description,
				grantedCount: grantedAccounts.length
			})

			this.context = {
				sessionToken,
				userId,
				monetaryAccountId: account.id,
				account,
				grantedAccounts
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
	 * Normalise the configured private key into PEM. Accepts a PEM string, a
	 * PEM string with escaped `\n`, or a base64-encoded PEM string.
	 */
	private getFormattedPrivateKey(): string {
		if (!this.privateKey) {
			throw new Error('Private key not initialized')
		}

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

		return formattedPrivateKey
	}

	/**
	 * Derive the SPKI PEM public key that belongs to the configured private
	 * key. This is the `client_public_key` bunq expects on POST /installation.
	 */
	private getClientPublicKeyPem(): string {
		const publicKey = crypto.createPublicKey(this.getFormattedPrivateKey())
		return publicKey.export({ type: 'spki', format: 'pem' }).toString()
	}

	/**
	 * Create a signature for bunq API requests using the private key
	 */
	private createSignature(data: string): string {
		if (!this.privateKey) {
			throw new Error('Private key not initialized')
		}

		try {
			const formattedPrivateKey = this.getFormattedPrivateKey()
			
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

		if (!this.accessToken) {
			throw new Error('OAuth access token not initialized')
		}

		const requestBody = {
			secret: this.accessToken
		}

		const requestBodyString = JSON.stringify(requestBody)
		const signature = this.createSignature(requestBodyString)

		console.log('Starting session with:', {
			url: `${this.baseUrl}/v1/session-server`,
			hasInstallationToken: !!installationToken,
			hasAccessToken: !!this.accessToken,
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
      // Console.log server IP address of this app:
      const serverIp = await getExternalIpAddress()
      console.log(`Server IP address: ${serverIp}`)
			throw new Error(`Session start failed: ${response.status} ${response.statusText} - ${errorText}`)
		}

		return response.json()
	}

	/**
	 * Extract the user id to use in URLs from a session-server response.
	 *
	 * bunq returns `UserApiKey` for OAuth sessions and `UserPerson` /
	 * `UserCompany` for plain API-key sessions.
	 */
	private extractUserId(sessionResponse: BunqApiResponse): number {
		for (const item of sessionResponse.Response ?? []) {
			for (const key of USER_KEYS) {
				const user = item[key]
				if (user && typeof user.id === 'number') {
					return user.id
				}
			}
		}

		throw new Error('User id not found in session response')
	}

	/**
	 * List the monetary accounts the current credentials may access. Under
	 * OAuth this is exactly the set selected by the account holder during
	 * consent.
	 */
	private async getGrantedMonetaryAccounts(
		sessionToken: string,
		userId: number
	): Promise<BunqMonetaryAccountSummary[]> {
		const response = await fetch(`${this.baseUrl}/v1/user/${userId}/monetary-account`, {
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
			const errorText = await response.text()
			throw new Error(`Get monetary accounts failed: ${response.statusText} - ${errorText}`)
		}

		const data = await response.json() as BunqApiResponse
		const accounts: BunqMonetaryAccountSummary[] = []

		for (const item of data.Response ?? []) {
			for (const key of MONETARY_ACCOUNT_KEYS) {
				const raw = item[key]
				if (!raw) continue

				const ibanAlias = raw.alias?.find(alias => alias.type === 'IBAN')
				accounts.push({
					id: raw.id,
					type: key,
					description: raw.description ?? '',
					iban: ibanAlias?.value ?? null,
					status: raw.status ?? 'UNKNOWN'
				})
			}
		}

		console.log('Granted monetary accounts:', accounts.map(account => ({
			id: account.id,
			type: account.type,
			description: account.description
		})))

		return accounts
	}

	/**
	 * Pick the monetary account to create payment requests on.
	 *
	 * - If `BUNQ_ACCOUNT_ID_FOR_REQUESTS` is set it must be one of the granted
	 *   accounts; anything else is a configuration error.
	 * - If it is not set and exactly one account was granted, that account is
	 *   used.
	 * - Never silently falls back to "the first account".
	 */
	private selectMonetaryAccount(
		grantedAccounts: BunqMonetaryAccountSummary[]
	): BunqMonetaryAccountSummary {
		if (grantedAccounts.length === 0) {
			throw new Error(
				'The bunq OAuth grant does not cover any monetary account. ' +
				'Re-authorize the app and select the deelauto account.'
			)
		}

		const configuredValue = (process.env.BUNQ_ACCOUNT_ID_FOR_REQUESTS ?? '').trim()

		if (configuredValue !== '') {
			const configuredId = Number.parseInt(configuredValue, 10)
			if (Number.isNaN(configuredId)) {
				throw new Error(
					`Invalid BUNQ_ACCOUNT_ID_FOR_REQUESTS value: ${configuredValue}. Must be a number.`
				)
			}

			const match = grantedAccounts.find(account => account.id === configuredId)
			if (!match) {
				const grantedIds = grantedAccounts.map(account => account.id).join(', ')
				throw new Error(
					`BUNQ_ACCOUNT_ID_FOR_REQUESTS (${configuredId}) is not among the ` +
					`accounts granted to the OAuth token (${grantedIds}).`
				)
			}

			return match
		}

		if (grantedAccounts.length === 1) {
			return grantedAccounts[0]
		}

		const grantedIds = grantedAccounts.map(account => account.id).join(', ')
		throw new Error(
			`The OAuth grant covers ${grantedAccounts.length} accounts (${grantedIds}). ` +
			'Set BUNQ_ACCOUNT_ID_FOR_REQUESTS to the deelauto account id, or ' +
			're-authorize with only that account selected.'
		)
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
					'X-Bunq-Language': 'nl_NL',
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
					'X-Bunq-Language': 'nl_NL',
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
		
		// Check if we have the expected ID response structure
		if (!data.Response || !data.Response[0] || !data.Response[0].Id || !data.Response[0].Id.id) {
			console.error('Unexpected BunqMeTab response structure:', data)
			throw new Error('Unexpected BunqMeTab response structure from bunq API')
		}
		
		const tabId = data.Response[0].Id.id
		console.log('Created BunqMeTab with ID:', tabId)
		
		// Now fetch the full BunqMeTab object to get the bunqme_tab_share_url
		return await this.getBunqMeTabDetails(tabId)
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
      console.log('user: ', userId, 'monetaryAccountId: ', monetaryAccountId, 'requestId: ', requestId);
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
	 * Get BunqMeTab details by ID
	 */
	private async getBunqMeTabDetails(tabId: number): Promise<BunqMeTabResponse> {
		if (!this.context) {
			throw new Error('Bunq context not initialized')
		}

		const { sessionToken, userId, monetaryAccountId } = this.context

		const response = await fetch(
			`${this.baseUrl}/v1/user/${userId}/monetary-account/${monetaryAccountId}/bunqme-tab/${tabId}`,
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
			throw new Error(`Get BunqMeTab details failed: ${response.statusText} - ${errorText}`)
		}

		const data = await response.json() as BunqApiResponse
		console.log('BunqMeTab details:', JSON.stringify(data, null, 2))
		
		if (!data.Response || !data.Response[0] || !data.Response[0].BunqMeTab) {
			console.error('Unexpected BunqMeTab details structure:', data)
			throw new Error('Unexpected BunqMeTab details structure from bunq API')
		}
		
		return data.Response[0].BunqMeTab
	}

	/**
	 * Get BunqMeTab status by checking for payments in result_inquiries
	 */
	async getBunqMeTabStatus(tabId: number): Promise<BunqPaymentResponse> {
    console.log('Getting BunqMeTab status');
		const tabDetails = await this.getBunqMeTabDetails(tabId)
    console.log('BunqMeTab details:', JSON.stringify(tabDetails, null, 2))
		
		// BunqMeTab status is determined by checking result_inquiries
		// If there are payments, we need to check their status
		// Handle both single entry (object) and multiple entries (array)
		const tabEntries = Array.isArray(tabDetails.bunqme_tab_entry) 
			? tabDetails.bunqme_tab_entry 
			: tabDetails.bunqme_tab_entries || []
		
		if (tabEntries.length > 0) {
			const tabEntry = tabEntries[0]
			
			// Check if there are any payments made to this tab by examining result_inquiries
			let status = 'PENDING'
			
			// Check result_inquiries for payment status
			if (tabDetails.result_inquiries && tabDetails.result_inquiries.length > 0) {
				console.log(`BunqMeTab ${tabId}: Found ${tabDetails.result_inquiries.length} result inquiries`)
				
				// Look for payments with ARRIVED status
				const hasArrivedPayment = tabDetails.result_inquiries.some(inquiry => {
					const payment = inquiry.payment?.Payment
					if (payment && payment.payment_arrival_expected) {
						console.log(`BunqMeTab ${tabId}: Payment ${payment.id} arrival status: ${payment.payment_arrival_expected.status}`)
						return payment.payment_arrival_expected.status === 'ARRIVED'
					}
					return false
				})
				
				if (hasArrivedPayment) {
					status = 'ACCEPTED' // Payment has arrived, mark as accepted
					console.log(`BunqMeTab ${tabId}: Payment has arrived, setting status to ACCEPTED`)
				} else {
					// Check if there are any payments at all (even if not arrived yet)
					const hasPayments = tabDetails.result_inquiries.some(inquiry => inquiry.payment?.Payment)
					if (hasPayments) {
						status = 'PENDING' // Payments exist but haven't arrived yet
						console.log(`BunqMeTab ${tabId}: Payments exist but haven't arrived yet, keeping status as PENDING`)
					}
				}
			} else {
				console.log(`BunqMeTab ${tabId}: No result inquiries found`)
			}
			
			// Check if the tab has expired (only if no payments have been made)
			if (status === 'PENDING' && tabDetails.time_expiry) {
				const expiryDate = new Date(tabDetails.time_expiry)
				const now = new Date()
				if (now > expiryDate) {
					status = 'CANCELLED' // Expired tabs are considered cancelled
				}
			}
			
			const response: BunqPaymentResponse = {
				id: tabDetails.id,
				created: tabDetails.created,
				updated: tabDetails.updated,
				time_expiry: tabDetails.time_expiry,
				monetary_account_id: tabDetails.monetary_account_id,
				amount_inquired: tabEntry.amount_inquired,
				description: tabEntry.description,
				bunqme_share_url: tabDetails.bunqme_tab_share_url,
				status: status
			}
			
			return response
		}
		
		// Handle BunqMeTabs with no entries - this can happen if the tab was created but has no active entries
		// In this case, we'll check if the tab has expired and return appropriate status
		let status = 'PENDING'
		
		// Check if the tab has expired
		if (tabDetails.time_expiry) {
			const expiryDate = new Date(tabDetails.time_expiry)
			const now = new Date()
			if (now > expiryDate) {
				status = 'CANCELLED' // Expired tabs are considered cancelled
			}
		}
		
		// Return a response with minimal information since we don't have tab entry details
		const response: BunqPaymentResponse = {
			id: tabDetails.id,
			created: tabDetails.created,
			updated: tabDetails.updated,
			time_expiry: tabDetails.time_expiry,
			monetary_account_id: tabDetails.monetary_account_id,
			amount_inquired: {
				value: '0.00',
				currency: 'EUR'
			},
			description: 'BunqMeTab with no entries',
			bunqme_share_url: tabDetails.bunqme_tab_share_url,
			status: status
		}
		
		return response
	}

	/**
	 * Check the status of a payment request by ID (works for both RequestInquiry and BunqMeTab)
	 */
	async checkPaymentRequestStatus(requestId: number, isBunqUserRequest?: boolean): Promise<BunqPaymentResponse> {
		if (!this.context) {
			await this.initializeContext()
		}

		if (!this.context) {
			throw new Error('Failed to initialize bunq context')
		}

		// If we know it's a BunqMeTab, use the appropriate method
		if (isBunqUserRequest === false) {
      console.log('Checking BunqMeTab status');
			return await this.getBunqMeTabStatus(requestId)
		}
		
		// Default to RequestInquiry method (for backward compatibility and direct bunq requests)
		return await this.getRequestInquiryDetails(requestId)
	}

	/**
	 * Create a new bunq installation for the configured RSA key pair.
	 *
	 * An installation can carry exactly one device-server. When the secret
	 * changes (for example: API key replaced by an OAuth access token) bunq
	 * refuses a second device on the old installation, so a fresh installation
	 * is needed. POST /installation is unauthenticated.
	 */
	private async createInstallation(): Promise<string> {
		const clientPublicKey = this.getClientPublicKeyPem()

		console.log('Creating new bunq installation...')
		const response = await fetch(`${this.baseUrl}/v1/installation`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'User-Agent': 'nijverhoek-deelauto/1.0',
				'X-Bunq-Client-Request-Id': this.generateRequestId()
			},
			body: JSON.stringify({ client_public_key: clientPublicKey })
		})

		if (!response.ok) {
			const errorText = await response.text()
			throw new Error(`Installation creation failed: ${response.status} ${response.statusText} - ${errorText}`)
		}

		const data = await response.json() as BunqApiResponse
		const token = data.Response?.find(item => item.Token)?.Token?.token
		if (!token) {
			throw new Error('Installation token not found in installation response')
		}

		console.log('New bunq installation created')
		return token
	}

	/**
	 * POST /device-server: bind the OAuth access token to the given
	 * installation and this server's IP address.
	 */
	private async createDeviceServer(installationToken: string, ipAddress: string): Promise<void> {
		if (!this.accessToken) {
			throw new Error('BUNQ_OAUTH_ACCESS_TOKEN environment variable is required')
		}

		// The OAuth access token is the secret bound to this installation and IP.
		const requestBody = {
			description: 'Nijverhoek Deelauto',
			secret: this.accessToken,
			permitted_ips: [ipAddress]
		}

		console.log('Registering device-server with bunq API...')
		const response = await fetch(`${this.baseUrl}/v1/device-server`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'User-Agent': 'nijverhoek-deelauto/1.0',
				'X-Bunq-Client-Request-Id': this.generateRequestId(),
				'X-Bunq-Client-Authentication': installationToken
			},
			body: JSON.stringify(requestBody)
		})

		if (!response.ok) {
			const errorText = await response.text()
			console.error('Device-server registration failed:', {
				status: response.status,
				statusText: response.statusText,
				errorBody: errorText
			})

			const error = new Error(`Device-server registration failed: ${response.status} ${response.statusText} - ${errorText}`)
			if (errorText.includes('A device already exists for the current installation')) {
				error.name = 'BunqDeviceAlreadyExistsError'
			}
			throw error
		}

		console.log('Device-server registration successful')
	}

	/**
	 * Register the server's IP address with bunq API for device-server.
	 *
	 * When `allowNewInstallation` is true and the current installation already
	 * has a device (bound to a previous secret), a new installation is created
	 * and the device is registered on that one. The caller must then store the
	 * returned `newInstallationToken` as `BUNQ_INSTALLATION_RESPONSE_TOKEN`.
	 */
	async registerServerIpAddress(
		options: { allowNewInstallation?: boolean } = {}
	): Promise<BunqIpRegistrationResult> {
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

			try {
				await this.createDeviceServer(installationToken, ipAddress)
			} catch (error) {
				const isDeviceConflict = error instanceof Error && error.name === 'BunqDeviceAlreadyExistsError'
				if (!isDeviceConflict || !options.allowNewInstallation) {
					throw error
				}

				console.warn('Installation already has a device; creating a new installation for the OAuth token')
				const newInstallationToken = await this.createInstallation()
				await this.createDeviceServer(newInstallationToken, ipAddress)

				// Forget any session built on the old installation.
				this.context = null

				return {
					success: true,
					ipAddress,
					newInstallationToken,
					message:
						`Registered IP address ${ipAddress} on a new bunq installation. ` +
						'Store the new installation token as BUNQ_INSTALLATION_RESPONSE_TOKEN and redeploy.'
				}
			}

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
 * 
 * Behavior based on user preference:
 * - If user.use_bunq_user_request === true: Creates direct bunq user request (RequestInquiry)
 *   → bunq users receive request directly in app, paymentUrl will be null
 * - If user.use_bunq_user_request === false/undefined: Creates universal payment URL (BunqMeTab)
 *   → all users (bunq and non-bunq) get a web payment link
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
		
		// Look up the user to check their preference
		const { db } = await connectToDatabase()
		const user = await db.collection('Users').findOne({
			email_address: userEmail
		}) as { use_bunq_user_request?: boolean } | null
		
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
export async function checkBunqPaymentStatus(requestId: number, isBunqUserRequest?: boolean): Promise<string> {
	try {
		console.log('Checking Bunq payment status');
		const response = await bunqApi.checkPaymentRequestStatus(requestId, isBunqUserRequest)
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
 * Helper function to register server IP address with bunq API.
 *
 * Pass `allowNewInstallation: true` (admin-triggered only) to let the client
 * create a fresh installation when the current one already has a device.
 */
export async function registerBunqServerIp(
	options: { allowNewInstallation?: boolean } = {}
): Promise<BunqIpRegistrationResult> {
	return await bunqApi.registerServerIpAddress(options)
}
