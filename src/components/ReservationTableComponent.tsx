'use client'

import { useState } from 'react'
import { ProcessedReservationData } from '@/types/models'

interface ReservationTableComponentProps {
	data: ProcessedReservationData[]
	onSave: (editedData: ProcessedReservationData[]) => void
	onBack: () => void
	isLoading: boolean
}

export default function ReservationTableComponent({
	data,
	onSave,
	onBack,
	isLoading
}: ReservationTableComponentProps) {
	const [editableData, setEditableData] = useState<ProcessedReservationData[]>(data)
	const [errors, setErrors] = useState<Record<number, string>>({})


	const updateField = (index: number, field: keyof ProcessedReservationData, value: string | number | Date | undefined) => {
		setEditableData(prev => {
			const newData = [...prev]
			newData[index] = {
				...newData[index],
				[field]: value
			}
			return newData
		})

		// Clear error for this field
		if (errors[index]) {
			setErrors(prev => {
				const newErrors = { ...prev }
				delete newErrors[index]
				return newErrors
			})
		}
	}

	const validateRow = (index: number): boolean => {
		const row = editableData[index]
		const errorMessages: string[] = []

		if (!row.name_user.trim()) {
			errorMessages.push('Naam gebruiker is verplicht')
		}

		if (!row.license_plate.trim()) {
			errorMessages.push('Nummerplaat is verplicht')
		}

		if (row.kilometers_driven < 0) {
			errorMessages.push('Kilometers gereden kan niet negatief zijn')
		}

		if (row.reserved_start >= row.reserved_end) {
			errorMessages.push('Reservering start moet voor reservering eind zijn')
		}

		if (row.effective_start >= row.effective_end) {
			errorMessages.push('Effectieve start moet voor effectieve eind zijn')
		}

		if (errorMessages.length > 0) {
			setErrors(prev => ({
				...prev,
				[index]: errorMessages.join(', ')
			}))
			return false
		}

		return true
	}

	const validateAllRows = (): boolean => {
		let allValid = true

		editableData.forEach((row, index) => {
			if (!validateRow(index)) {
				allValid = false
			}
		})

		return allValid
	}

	const handleSave = () => {
		if (validateAllRows()) {
			onSave(editableData)
		}
	}

	const removeRow = (index: number) => {
		setEditableData(prev => prev.filter((_, i) => i !== index))
		setErrors(prev => {
			const newErrors = { ...prev }
			delete newErrors[index]
			// Shift error indices for rows after the removed row
			Object.keys(newErrors).forEach(key => {
				const errorIndex = parseInt(key)
				if (errorIndex > index) {
					newErrors[errorIndex - 1] = newErrors[errorIndex]
					delete newErrors[errorIndex]
				}
			})
			return newErrors
		})
	}

	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
			<div className="flex justify-between items-center mb-6">
				<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
					Stap 2: Controleer en bewerk de data
				</h3>
				<div className="flex space-x-3">
					<button
						onClick={onBack}
						disabled={isLoading}
						className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
					>
						Terug naar upload
					</button>
					<button
						onClick={handleSave}
						disabled={isLoading}
						className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
					>
						{isLoading ? 'Opslaan...' : 'Akkoord - Opslaan'}
					</button>
				</div>
			</div>

			<div className="overflow-x-auto">
				<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
					<thead className="bg-gray-50 dark:bg-gray-700">
						<tr>
							<th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
								Acties
							</th>
							<th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
								Naam gebruiker
							</th>
							<th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
								Reservering start
							</th>
							<th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
								Reservering eind
							</th>
							<th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
								Effectieve start
							</th>
							<th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
								Effectieve eind
							</th>
							<th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
								Nummerplaat
							</th>
							<th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
								Kilometers start
							</th>
							<th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
								Kilometers eind
							</th>
							<th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
								Kilometers gereden
							</th>
							<th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
								Opmerkingen
							</th>
						</tr>
					</thead>
					<tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
						{editableData.map((row, index) => (
							<tr key={index} className={errors[index] ? 'bg-red-50 dark:bg-red-900' : ''}>
								<td className="px-3 py-4 whitespace-nowrap">
									<button
										onClick={() => removeRow(index)}
										className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 cursor-pointer"
										title="Rij verwijderen"
									>
										<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
										</svg>
									</button>
								</td>
								<td className="px-3 py-4 whitespace-nowrap">
									<input
										type="text"
										value={row.name_user}
										onChange={(e) => updateField(index, 'name_user', e.target.value)}
										className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
									/>
								</td>
								<td className="px-3 py-4 whitespace-nowrap">
									<input
										type="datetime-local"
										value={`${row.reserved_start.getFullYear()}-${String(row.reserved_start.getMonth() + 1).padStart(2, '0')}-${String(row.reserved_start.getDate()).padStart(2, '0')}T${String(row.reserved_start.getHours()).padStart(2, '0')}:${String(row.reserved_start.getMinutes()).padStart(2, '0')}`}
										onChange={(e) => updateField(index, 'reserved_start', new Date(e.target.value))}
										className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
									/>
								</td>
								<td className="px-3 py-4 whitespace-nowrap">
									<input
										type="datetime-local"
										value={`${row.reserved_end.getFullYear()}-${String(row.reserved_end.getMonth() + 1).padStart(2, '0')}-${String(row.reserved_end.getDate()).padStart(2, '0')}T${String(row.reserved_end.getHours()).padStart(2, '0')}:${String(row.reserved_end.getMinutes()).padStart(2, '0')}`}
										onChange={(e) => updateField(index, 'reserved_end', new Date(e.target.value))}
										className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
									/>
								</td>
								<td className="px-3 py-4 whitespace-nowrap">
									<input
										type="datetime-local"
										value={`${row.effective_start.getFullYear()}-${String(row.effective_start.getMonth() + 1).padStart(2, '0')}-${String(row.effective_start.getDate()).padStart(2, '0')}T${String(row.effective_start.getHours()).padStart(2, '0')}:${String(row.effective_start.getMinutes()).padStart(2, '0')}`}
										onChange={(e) => updateField(index, 'effective_start', new Date(e.target.value))}
										className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
									/>
								</td>
								<td className="px-3 py-4 whitespace-nowrap">
									<input
										type="datetime-local"
										value={`${row.effective_end.getFullYear()}-${String(row.effective_end.getMonth() + 1).padStart(2, '0')}-${String(row.effective_end.getDate()).padStart(2, '0')}T${String(row.effective_end.getHours()).padStart(2, '0')}:${String(row.effective_end.getMinutes()).padStart(2, '0')}`}
										onChange={(e) => updateField(index, 'effective_end', new Date(e.target.value))}
										className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
									/>
								</td>
								<td className="px-3 py-4 whitespace-nowrap">
									<input
										type="text"
										value={row.license_plate}
										onChange={(e) => updateField(index, 'license_plate', e.target.value)}
										className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
									/>
								</td>
								<td className="px-3 py-4 whitespace-nowrap">
									<input
										type="number"
										step="0.01"
										value={row.kilometers_start ?? ''}
										onChange={(e) => updateField(index, 'kilometers_start', e.target.value ? Number(e.target.value) : undefined)}
										className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
									/>
								</td>
								<td className="px-3 py-4 whitespace-nowrap">
									<input
										type="number"
										step="0.01"
										value={row.kilometers_end ?? ''}
										onChange={(e) => updateField(index, 'kilometers_end', e.target.value ? Number(e.target.value) : undefined)}
										className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
									/>
								</td>
								<td className="px-3 py-4 whitespace-nowrap">
									<input
										type="number"
										step="0.01"
										value={row.kilometers_driven}
										onChange={(e) => updateField(index, 'kilometers_driven', Number(e.target.value))}
										className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
									/>
								</td>
								<td className="px-3 py-4 whitespace-nowrap">
									<input
										type="text"
										value={row.remarks ?? ''}
										onChange={(e) => updateField(index, 'remarks', e.target.value || undefined)}
										className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
									/>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{Object.keys(errors).length > 0 && (
				<div className="mt-4 space-y-2">
					<h4 className="text-sm font-medium text-red-600 dark:text-red-400">Fouten gevonden:</h4>
					{Object.entries(errors).map(([index, error]) => (
						<div key={index} className="text-sm text-red-600 dark:text-red-400">
							Rij {parseInt(index) + 1}: {error}
						</div>
					))}
				</div>
			)}

			<div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
				<p>Gevonden {editableData.length} reservering(en). Controleer de data en klik op &quot;Akkoord - Opslaan&quot; om de reserveringen op te slaan.</p>
			</div>
		</div>
	)
}
