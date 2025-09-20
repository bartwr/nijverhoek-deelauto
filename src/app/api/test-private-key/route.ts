import { NextResponse } from 'next/server'
import crypto from 'crypto'

interface TestResult {
	success?: boolean
	error?: string
	skipped?: string
}

interface TestResults {
	asIs: TestResult
	withNewlines: TestResult
	base64Decoded: TestResult
}

export async function GET(): Promise<NextResponse> {
	try {
		const privateKey = process.env.BUNQ_PRIVATE_KEY_FOR_SIGNING || ''
		
		if (!privateKey) {
			return NextResponse.json({
				success: false,
				error: 'BUNQ_PRIVATE_KEY_FOR_SIGNING environment variable not set'
			}, { status: 400 })
		}

		// Analyze the private key format
		const analysis = {
			length: privateKey.length,
			startsWithPemHeader: privateKey.startsWith('-----BEGIN'),
			hasNewlines: privateKey.includes('\n'),
			hasEscapedNewlines: privateKey.includes('\\n'),
			firstLine: privateKey.split('\n')[0] || privateKey.substring(0, 50),
			lineCount: privateKey.split('\n').length
		}

		// Test different formatting approaches
		const testResults: TestResults = {
			asIs: {},
			withNewlines: {},
			base64Decoded: {}
		}

		// Test 1: Use key as-is
		try {
			const sign1 = crypto.createSign('SHA256')
			sign1.update('test data', 'utf8')
			sign1.end()
			sign1.sign(privateKey, 'base64')
			testResults.asIs = { success: true }
		} catch (error) {
			testResults.asIs = { 
				success: false, 
				error: error instanceof Error ? error.message : 'Unknown error' 
			}
		}

		// Test 2: Replace escaped newlines
		let formattedKey1 = privateKey
		if (privateKey.includes('\\n')) {
			formattedKey1 = privateKey.replace(/\\n/g, '\n')
			try {
				const sign2 = crypto.createSign('SHA256')
				sign2.update('test data', 'utf8')
				sign2.end()
				sign2.sign(formattedKey1, 'base64')
				testResults.withNewlines = { success: true }
			} catch (error) {
				testResults.withNewlines = { 
					success: false, 
					error: error instanceof Error ? error.message : 'Unknown error' 
				}
			}
		} else {
			testResults.withNewlines = { skipped: 'No escaped newlines found' }
		}

		// Test 3: Try base64 decode
		if (!privateKey.includes('\n') && !privateKey.startsWith('-----BEGIN')) {
			try {
				const formattedKey2 = Buffer.from(privateKey, 'base64').toString('utf-8')
				const sign3 = crypto.createSign('SHA256')
				sign3.update('test data', 'utf8')
				sign3.end()
				sign3.sign(formattedKey2, 'base64')
				testResults.base64Decoded = { success: true }
			} catch (error) {
				testResults.base64Decoded = { 
					success: false, 
					error: error instanceof Error ? error.message : 'Unknown error' 
				}
			}
		} else {
			testResults.base64Decoded = { skipped: 'Key appears to already be in PEM format' }
		}

		return NextResponse.json({
			success: true,
			analysis,
			testResults,
			recommendation: getRecommendation(testResults)
		})
	} catch (error) {
		console.error('Private key test failed:', error)
		
		return NextResponse.json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 })
	}
}

function getRecommendation(testResults: TestResults): string {
	if (testResults.asIs?.success) {
		return 'Private key works as-is'
	} else if (testResults.withNewlines?.success) {
		return 'Private key needs escaped newlines converted to actual newlines'
	} else if (testResults.base64Decoded?.success) {
		return 'Private key needs to be base64 decoded'
	} else {
		return 'Private key format needs investigation - none of the common fixes worked'
	}
}
