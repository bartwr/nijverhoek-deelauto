import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'

export async function GET(request: NextRequest): Promise<NextResponse> {
	try {
		console.log('🧪 Testing MongoDB connection...')
		console.log('Environment:', process.env.NODE_ENV)
		console.log('Vercel environment:', !!process.env.VERCEL)
		console.log('Node.js version:', process.version)
		
		// Test the MongoDB connection
		const { client, db } = await connectToDatabase()
		
		// Get database stats
		const stats = await db.stats()
		console.log('Database stats:', stats)
		
		// Test a simple query
		const collections = await db.listCollections().toArray()
		console.log('Collections:', collections.map(c => c.name))
		
		return NextResponse.json({
			success: true,
			message: 'MongoDB connection successful',
			database: {
				name: db.databaseName,
				collections: collections.map(c => c.name),
				stats: {
					collections: stats.collections,
					objects: stats.objects,
					avgObjSize: stats.avgObjSize,
					dataSize: stats.dataSize,
					storageSize: stats.storageSize
				}
			},
			environment: {
				nodeVersion: process.version,
				isProduction: process.env.NODE_ENV === 'production',
				isVercel: !!process.env.VERCEL
			}
		})
		
	} catch (error) {
		console.error('❌ MongoDB connection test failed:', error)
		
		let errorDetails = {
			name: 'Unknown',
			message: 'Unknown error',
			code: undefined as number | undefined,
			stack: undefined as string | undefined
		}
		
		if (error instanceof Error) {
			errorDetails = {
				name: error.name,
				message: error.message,
				code: (error as any).code,
				stack: error.stack
			}
		}
		
		return NextResponse.json({
			success: false,
			error: errorDetails,
			message: 'MongoDB connection failed',
			environment: {
				nodeVersion: process.version,
				isProduction: process.env.NODE_ENV === 'production',
				isVercel: !!process.env.VERCEL
			},
			troubleshooting: {
				commonSolutions: [
					'Check if MONGODB_URI is correctly set',
					'Verify MongoDB Atlas cluster is running',
					'Check if IP address is whitelisted in MongoDB Atlas',
					'Ensure database user has proper permissions',
					'Try updating MongoDB driver version',
					'Check if SSL/TLS configuration is correct'
				],
				sslTlsIssues: [
					'Try adding &ssl=true to connection string',
					'Check if MongoDB Atlas cluster supports TLS 1.2+',
					'Verify certificate chain is valid',
					'Try using authMechanism=SCRAM-SHA-256'
				]
			}
		}, { status: 500 })
	}
}

export async function POST(request: NextRequest): Promise<NextResponse> {
	return GET(request)
}
