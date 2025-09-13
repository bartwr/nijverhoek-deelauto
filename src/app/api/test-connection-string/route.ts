import { NextRequest, NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

export async function GET(): Promise<NextResponse> {
	const originalUri = process.env.MONGODB_URI!
	const dbName = process.env.MONGODB_DB!
	
	const results: any = {
		originalUri: originalUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'),
		tests: []
	}

	// Test 1: Original SRV connection
	try {
		const client = new MongoClient(originalUri, {
			serverSelectionTimeoutMS: 15000,
			connectTimeoutMS: 15000,
			socketTimeoutMS: 15000,
			maxPoolSize: 1
		})

		const startTime = Date.now()
		await client.connect()
		const connectTime = Date.now() - startTime

		await client.db('admin').command({ ping: 1 })
		await client.close()

		results.tests.push({
			name: 'Original SRV Connection',
			status: 'success',
			connectTime: `${connectTime}ms`
		})
	} catch (error) {
		results.tests.push({
			name: 'Original SRV Connection',
			status: 'error',
			error: error instanceof Error ? error.message : String(error)
		})
	}

	// Test 2: Alternative connection string with explicit options
	try {
		const alternativeUri = originalUri + '&serverSelectionTimeoutMS=30000&connectTimeoutMS=30000'
		const client = new MongoClient(alternativeUri, {
			serverSelectionTimeoutMS: 30000,
			connectTimeoutMS: 30000,
			socketTimeoutMS: 30000,
			maxPoolSize: 1
		})

		const startTime = Date.now()
		await client.connect()
		const connectTime = Date.now() - startTime

		await client.db('admin').command({ ping: 1 })
		await client.close()

		results.tests.push({
			name: 'Alternative SRV Connection',
			status: 'success',
			connectTime: `${connectTime}ms`
		})
	} catch (error) {
		results.tests.push({
			name: 'Alternative SRV Connection',
			status: 'error',
			error: error instanceof Error ? error.message : String(error)
		})
	}

	// Test 3: Standard connection string (if SRV fails)
	try {
		// Extract credentials from SRV URI
		const match = originalUri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)?/)
		if (match) {
			const [, username, password, cluster, dbNameFromUri] = match
			
			// Create standard connection string
			const standardUri = `mongodb://${username}:${password}@${cluster}:27017/${dbNameFromUri || dbName}?retryWrites=true&w=majority&ssl=true&authSource=admin`
			
			const client = new MongoClient(standardUri, {
				serverSelectionTimeoutMS: 30000,
				connectTimeoutMS: 30000,
				socketTimeoutMS: 30000,
				maxPoolSize: 1
			})

			const startTime = Date.now()
			await client.connect()
			const connectTime = Date.now() - startTime

			await client.db('admin').command({ ping: 1 })
			await client.close()

			results.tests.push({
				name: 'Standard Connection String',
				status: 'success',
				connectTime: `${connectTime}ms`,
				uri: standardUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
			})
		} else {
			results.tests.push({
				name: 'Standard Connection String',
				status: 'skipped',
				reason: 'Could not parse SRV URI'
			})
		}
	} catch (error) {
		results.tests.push({
			name: 'Standard Connection String',
			status: 'error',
			error: error instanceof Error ? error.message : String(error)
		})
	}

	return NextResponse.json(results, { status: 200 })
}
