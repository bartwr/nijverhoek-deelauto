import { MongoClient, Db, MongoClientOptions } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI!
const MONGODB_DB = process.env.MONGODB_DB!

if (!MONGODB_URI) {
	throw new Error('Please define the MONGODB_URI environment variable')
}

if (!MONGODB_DB) {
	throw new Error('Please define the MONGODB_DB environment variable')
}

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null

// MongoDB connection options for better reliability and SSL compatibility
const mongoOptions: MongoClientOptions = {
	maxPoolSize: 10, // Maintain up to 10 socket connections
	serverSelectionTimeoutMS: 30000, // Keep trying to send operations for 30 seconds
	socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
	connectTimeoutMS: 30000, // Give up initial connection after 30 seconds
	heartbeatFrequencyMS: 10000, // Send a ping every 10 seconds
	retryWrites: true,
	retryReads: true,
	maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
	
	// SSL/TLS options for better compatibility with Vercel
	tls: true,
	tlsAllowInvalidCertificates: false,
	tlsAllowInvalidHostnames: false,
	tlsInsecure: false,
	
	// Additional options for MongoDB Atlas compatibility
	authSource: 'admin',
	authMechanism: 'SCRAM-SHA-1',
	
	// Connection pool options
	minPoolSize: 1,
	maxConnecting: 2,
	maxIdleTimeMS: 30000,
	waitQueueTimeoutMS: 30000,
}

async function createConnection(): Promise<{ client: MongoClient; db: Db }> {
	try {
		console.log('Attempting to connect to MongoDB...')
		console.log('MongoDB URI (masked):', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'))
		console.log('Database name:', MONGODB_DB)
		console.log('Node.js version:', process.version)
		console.log('Environment:', process.env.NODE_ENV)
		
		const client = new MongoClient(MONGODB_URI, mongoOptions)
		await client.connect()
		
		console.log('MongoDB client connected successfully')
		
		// Test the connection
		await client.db('admin').command({ ping: 1 })
		console.log('MongoDB ping test successful')
		
		const db = client.db(MONGODB_DB)
		return { client, db }
	} catch (error) {
		console.error('Failed to create MongoDB connection:', error)
		if (error instanceof Error) {
			console.error('Error name:', error.name)
			console.error('Error message:', error.message)
			console.error('Error stack:', error.stack)
		}
		throw error
	}
}

// Vercel-specific connection method to handle SSL/TLS issues
async function createVercelConnection(): Promise<{ client: MongoClient; db: Db }> {
	try {
		console.log('Attempting Vercel-optimized MongoDB connection...')
		
		// Vercel-specific options to handle SSL/TLS issues
		const vercelOptions: MongoClientOptions = {
			maxPoolSize: 5, // Smaller pool size for serverless
			serverSelectionTimeoutMS: 15000, // Shorter timeout for serverless
			socketTimeoutMS: 30000,
			connectTimeoutMS: 15000,
			retryWrites: true,
			retryReads: true,
			
			// SSL/TLS options specifically for Vercel
			tls: true,
			tlsAllowInvalidCertificates: false,
			tlsAllowInvalidHostnames: false,
			
			// Use SCRAM-SHA-256 which is more compatible
			authMechanism: 'SCRAM-SHA-256',
			authSource: 'admin',
			
			// Disable compression to avoid SSL issues
			compressors: [],
			
			// Connection pool options for serverless
			minPoolSize: 0,
			maxConnecting: 1,
			maxIdleTimeMS: 10000,
			waitQueueTimeoutMS: 15000,
		}
		
		// Ensure the URI has proper SSL parameters
		let vercelUri = MONGODB_URI
		if (!vercelUri.includes('ssl=true') && !vercelUri.includes('tls=true')) {
			const separator = vercelUri.includes('?') ? '&' : '?'
			vercelUri += `${separator}ssl=true&authSource=admin`
		}
		
		console.log('Using Vercel-optimized URI and options')
		const client = new MongoClient(vercelUri, vercelOptions)
		await client.connect()
		
		console.log('Vercel MongoDB client connected successfully')
		
		// Test the connection
		await client.db('admin').command({ ping: 1 })
		console.log('Vercel MongoDB ping test successful')
		
		const db = client.db(MONGODB_DB)
		return { client, db }
	} catch (error) {
		console.error('Failed to create Vercel MongoDB connection:', error)
		throw error
	}
}

// Alternative connection method using standard connection string
async function createConnectionStandard(): Promise<{ client: MongoClient; db: Db }> {
	try {
		console.log('Attempting standard MongoDB connection...')
		
		// Convert SRV URI to standard format if needed
		let standardUri = MONGODB_URI
		if (MONGODB_URI.includes('mongodb+srv://')) {
			// Extract cluster info and convert to standard format
			const match = MONGODB_URI.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)?/)
			if (match) {
				const [, username, password, cluster, dbName] = match
				// Use standard port 27017 and add replica set info
				standardUri = `mongodb://${username}:${password}@${cluster}:27017/${dbName || MONGODB_DB}?retryWrites=true&w=majority&ssl=true`
				console.log('Converted to standard URI format')
			}
		}
		
		const client = new MongoClient(standardUri, {
			...mongoOptions,
			serverSelectionTimeoutMS: 15000,
			connectTimeoutMS: 15000
		})
		
		await client.connect()
		console.log('Standard MongoDB client connected successfully')
		
		// Test the connection
		await client.db('admin').command({ ping: 1 })
		console.log('Standard MongoDB ping test successful')
		
		const db = client.db(MONGODB_DB)
		return { client, db }
	} catch (error) {
		console.error('Failed to create standard MongoDB connection:', error)
		throw error
	}
}

export async function connectToDatabase(retryCount = 0): Promise<{ client: MongoClient; db: Db }> {
	const maxRetries = 3
	
	try {
		// Check if we have a cached connection and it's still alive
		if (cachedClient && cachedDb) {
			try {
				// Test the connection
				await cachedClient.db('admin').command({ ping: 1 })
				return { client: cachedClient, db: cachedDb }
			} catch (error) {
				console.warn('Cached connection is dead, creating new one:', error)
				cachedClient = null
				cachedDb = null
			}
		}

		// Try Vercel-optimized connection first (best for production)
		if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
			try {
				console.log('Using Vercel-optimized connection method')
				const { client, db } = await createVercelConnection()
				cachedClient = client
				cachedDb = db
				return { client, db }
			} catch (vercelError) {
				console.warn('Vercel connection failed, trying standard SRV connection:', vercelError)
			}
		}
		
		// Try standard SRV connection
		try {
			const { client, db } = await createConnection()
			cachedClient = client
			cachedDb = db
			return { client, db }
		} catch (srvError) {
			console.warn('SRV connection failed, trying standard connection:', srvError)
			
			// Fallback to standard connection
			const { client, db } = await createConnectionStandard()
			cachedClient = client
			cachedDb = db
			return { client, db }
		}
	} catch (error) {
		console.error(`MongoDB connection attempt ${retryCount + 1} failed:`, error)
		
		if (retryCount < maxRetries) {
			// Wait before retrying (exponential backoff)
			const delay = Math.pow(2, retryCount) * 1000
			console.log(`Retrying connection in ${delay}ms...`)
			await new Promise(resolve => setTimeout(resolve, delay))
			return connectToDatabase(retryCount + 1)
		}
		
		throw new Error(`Failed to connect to MongoDB after ${maxRetries + 1} attempts: ${error}`)
	}
}

export async function closeConnection() {
	if (cachedClient) {
		try {
			await cachedClient.close()
		} catch (error) {
			console.error('Error closing MongoDB connection:', error)
		} finally {
			cachedClient = null
			cachedDb = null
		}
	}
}
