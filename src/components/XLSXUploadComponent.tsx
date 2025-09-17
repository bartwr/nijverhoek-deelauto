'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { ProcessedReservationData } from '@/types/models'

interface XLSXUploadComponentProps {
	onFileUpload: (data: ProcessedReservationData[]) => void
}

export default function XLSXUploadComponent({ onFileUpload }: XLSXUploadComponentProps) {
	const [isDragOver, setIsDragOver] = useState(false)
	const [isProcessing, setIsProcessing] = useState(false)
	const [error, setError] = useState('')
	const fileInputRef = useRef<HTMLInputElement>(null)

	const parseDate = (dateStr: unknown): Date => {
		// Handle null/undefined values
		if (dateStr === null || dateStr === undefined || String(dateStr).trim() === '') {
			throw new Error('Date field is empty')
		}

		const dateValue = String(dateStr).trim()
		
		// Handle different date formats from Excel
		if (typeof dateStr === 'number') {
			// Excel serial date - Excel stores dates in UTC, so we need to convert to local time
			const utcDate = new Date((dateStr - 25569) * 86400 * 1000)
			// Convert UTC to local time by adding the timezone offset
			const localDate = new Date(utcDate.getTime() + utcDate.getTimezoneOffset() * 60000)
			return localDate
		}
		
		// For string dates like "8/27/2025 11:45", parse them as local time
		const date = new Date(dateValue)
		if (isNaN(date.getTime())) {
			throw new Error(`Invalid date format: ${dateValue}`)
		}
		
		// Return the date as local time to avoid timezone conversion issues
		return date
	}

	const processXLSXData = (data: unknown[][]): ProcessedReservationData[] => {
		if (data.length < 2) {
			throw new Error('Excel file must contain at least a header row and one data row')
		}

		const headers = data[0].map((h: unknown) => String(h).toLowerCase().trim())
		const rows = data.slice(1)

		// Filter out completely empty rows
		const nonEmptyRows = rows.filter(row => {
			// Check if row has any non-empty values
			return row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')
		})

		// Find column indices
		const nameUserIndex = headers.findIndex(h => h === 'name user')
		const reservedStartIndex = headers.findIndex(h => h === 'gereserveerde starttijd')
		const reservedEndIndex = headers.findIndex(h => h === 'gereserveerde eindtijd')
		const effectiveStartIndex = headers.findIndex(h => h === 'effectieve starttijd')
		const effectiveEndIndex = headers.findIndex(h => h === 'effectieve eindtijd')
		const licensePlateIndex = headers.findIndex(h => h === 'nummerplaat')
		const kilometersStartIndex = headers.findIndex(h => h === 'kilometerteller start')
		const kilometersEndIndex = headers.findIndex(h => h === 'kilometerteller einde')
		const kilometersDrivenIndex = headers.findIndex(h => h === 'driven kilomers')
		const remarksIndex = headers.findIndex(h => h === 'opmerkingen bij de reservering')

		const processedData = nonEmptyRows.map((row, index) => {
			try {
				const nameUser = String(row[nameUserIndex] || '').trim()
				const licensePlate = String(row[licensePlateIndex] || '').trim()

				// Skip rows without essential data
				if (!nameUser || !licensePlate) {
					return null
				}

				const remarks = row[remarksIndex] ? String(row[remarksIndex]).trim() : undefined
				
				// Debug logging for remarks
				if (remarks) {
					console.log(`Row ${index + 2}: Remarks found: "${remarks}"`)
				}

				return {
					name_user: nameUser,
					reserved_start: parseDate(row[reservedStartIndex]),
					reserved_end: parseDate(row[reservedEndIndex]),
					effective_start: parseDate(row[effectiveStartIndex]),
					effective_end: parseDate(row[effectiveEndIndex]),
					license_plate: licensePlate,
					kilometers_start: row[kilometersStartIndex] ? Number(row[kilometersStartIndex]) : undefined,
					kilometers_end: row[kilometersEndIndex] ? Number(row[kilometersEndIndex]) : undefined,
					kilometers_driven: Number(row[kilometersDrivenIndex] || 0),
					remarks: remarks,
				}
			} catch (error) {
				throw new Error(`Error processing row ${index + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`)
			}
		}).filter(row => row !== null) // Filter out null rows

		return processedData as ProcessedReservationData[]
	}

	const handleFile = async (file: File) => {
		if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
			setError('Alleen Excel bestanden (.xlsx, .xls) zijn toegestaan')
			return
		}

		setIsProcessing(true)
		setError('')

		try {
			const data = await file.arrayBuffer()
			const workbook = XLSX.read(data, { type: 'array' })
			
			// Get the first worksheet
			const firstSheetName = workbook.SheetNames[0]
			const worksheet = workbook.Sheets[firstSheetName]
			
			// Convert to array of arrays
			const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
			
			const processedData = processXLSXData(jsonData as unknown[][])
			
			if (processedData.length === 0) {
				setError('Geen geldige data gevonden in het Excel bestand. Controleer of de kolommen correct zijn en of er data in de rijen staat.')
				return
			}

			onFileUpload(processedData)
		} catch (error) {
			setError(error instanceof Error ? error.message : 'Fout bij verwerken van Excel bestand')
		} finally {
			setIsProcessing(false)
		}
	}

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragOver(false)

		const files = Array.from(e.dataTransfer.files)
		if (files.length > 0) {
			handleFile(files[0])
		}
	}

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragOver(true)
	}

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragOver(false)
	}

	const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files
		if (files && files.length > 0) {
			handleFile(files[0])
		}
	}

	const handleClick = () => {
		fileInputRef.current?.click()
	}

	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
			<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
				Stap 1: Selecteer het XLSX bestand
			</h3>
			
			<div
				className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
					isDragOver
						? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
						: 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
				}`}
				onDrop={handleDrop}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
			>
				<div className="space-y-4">
					<div className="mx-auto w-12 h-12 text-gray-400 dark:text-gray-500">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
							/>
						</svg>
					</div>
					
					<div>
						<p className="text-lg font-medium text-gray-900 dark:text-gray-100">
							Sleep je Excel bestand hierheen
						</p>
						<p className="text-sm text-gray-500 dark:text-gray-400">
							of klik om een bestand te selecteren
						</p>
					</div>
					
					<button
						type="button"
						onClick={handleClick}
						disabled={isProcessing}
						className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
					>
						{isProcessing ? 'Verwerken...' : 'Bestand selecteren'}
					</button>
					
					<input
						ref={fileInputRef}
						type="file"
						accept=".xlsx,.xls"
						onChange={handleFileInputChange}
						className="hidden"
					/>
				</div>
			</div>

			{error && (
				<div className="mt-4 p-4 bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-md">
					{error}
				</div>
			)}

			<div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
				<p className="font-medium mb-2">Verwachte kolommen in het Excel bestand:</p>
				<ul className="list-disc list-inside space-y-1">
					<li>Name user</li>
					<li>Gereserveerde (start en eind)</li>
					<li>Effectieve start</li>
					<li>Effectieve eind</li>
					<li>Nummerplaat</li>
					<li>Opmerkingen</li>
					<li>Kilometerteller (start en eind)</li>
					<li>Driven kilomer</li>
					<li>Used hours</li>
					<li>Totale kosten</li>
				</ul>
			</div>
		</div>
	)
}
