import { ObjectId } from 'mongodb'

export interface User {
	_id?: ObjectId
	datetime_created: Date
	email_address: string
	name: string
	use_bunq_user_request?: boolean // If true, create direct bunq user requests instead of universal payment URLs
}

export interface PriceScheme {
	_id?: ObjectId
	title: string
	description: string
	costs_per_kilometer: number
	costs_per_effective_hour: number
	costs_per_unused_reserved_hour_start_trip: number
	costs_per_unused_reserved_hour_end_trip: number
}

export interface Reservation {
	_id?: ObjectId
	datetime_created: Date
	user_id: ObjectId
	reservation_start: Date
	reservation_end: Date
	effective_start: Date
	effective_end: Date
	license_plate: string
	kilometers_start?: number
	kilometers_end?: number
	kilometers_driven: number
	price_scheme_id: ObjectId
	total_costs: number
	remarks?: string
	is_business_transaction?: boolean
}

// Types for XLSX data processing
export interface XLSXRowData {
	name_user: string
	reserved_start: string
	reserved_end: string
	effective_start: string
	effective_end: string
	license_plate: string
	remarks?: string
	kilometers_start?: number
	kilometers_end?: number
	kilometers_driven: number
	used_hours: number
	total_costs: number
}

export interface ProcessedReservationData {
	name_user: string
	reserved_start: Date
	reserved_end: Date
	effective_start: Date
	effective_end: Date
	license_plate: string
	remarks?: string
	kilometers_start?: number
	kilometers_end?: number
	kilometers_driven: number
	used_hours?: number
	total_costs?: number
}
