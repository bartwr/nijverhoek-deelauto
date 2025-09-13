import { NextRequest, NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

export async function GET(): Promise<NextResponse> {
	const results: any = {
		environment: {
			nodeEnv: process.env.NODE_ENV,
			hasMongoUri: !!process.env.MONGODB_URI,
			hasMongoDb: !!process.env.MONGODB_DB,
			mongoDbName: process.env.MONGODB_DB
		},
		tests: []
	}

	// Test 1: Basic connection string parsing
	try {
		const uri = process.env.MONGODB_URI!
		const parsed = new URL(uri)
		results.tests.push({
			name: 'Connection String Parsing',
			status: 'success',
			details: {
				protocol: parsed.protocol,
				hostname: parsed.hostname,
				port: parsed.port || 'default',
				pathname: parsed.pathname,
				search: parsed.search
			}
		})
	} catch (error) {
		results.tests.push({
			name: 'Connection String Parsing',
			status: 'error',
			error: error instanceof Error ? error.message : String(error)
		})
	}

	// Test 2: DNS Resolution
	try {
		const uri = process.env.MONGODB_URI!
		const parsed = new URL(uri)
		const hostname = parsed.hostname
		
		// This is a simple DNS test - in a real environment you'd use dns.promises.resolve
		results.tests.push({
			name: 'DNS Resolution',
			status: 'info',
			details: {
				hostname,
				note: 'DNS resolution test would require additional setup'
			}
		})
	} catch (error) {
		results.tests.push({
			name: 'DNS Resolution',
			status: 'error',
			error: error instanceof Error ? error.message : String(error)
		})
	}

	// Test 3: Connection attempt with detailed error handling
	try {
		const uri = process.env.MONGODB_URI!
		const client = new MongoClient(uri, {
			serverSelectionTimeoutMS: 10000,
			connectTimeoutMS: 10000,
			socketTimeoutMS: 10000,
			maxPoolSize: 1
		})

		const startTime = Date.now()
		await client.connect()
		const connectTime = Date.now() - startTime

		// Test ping
		await client.db('admin').command({ ping: 1 })
		
		await client.close()

		results.tests.push({
			name: 'MongoDB Connection',
			status: 'success',
			details: {
				connectTime: `${connectTime}ms`,
				message: 'Connection successful'
			}
		})
	} catch (error) {
		results.tests.push({
			name: 'MongoDB Connection',
			status: 'error',
			error: error instanceof Error ? error.message : String(error),
			errorName: error instanceof Error ? error.name : 'Unknown',
			details: {
				note: 'This is the actual connection error'
			}
		})
	}

	return NextResponse.json(results, { status: 200 })
}
