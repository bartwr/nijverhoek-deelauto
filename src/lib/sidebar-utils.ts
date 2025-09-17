export interface SidebarItem {
	href: string
	label: string
	isActive: boolean
}

function getPreviousMonth(): string {
	const now = new Date()
	const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
	return `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}`
}

export function getUserSidebarItems(currentPath: string, yearmonth?: string): SidebarItem[] {
	const baseItems: SidebarItem[] = [
		{ href: '/mijn', label: 'Start', isActive: false },
		{ href: '/mijn/betalingen', label: 'Betalingen', isActive: false }
	]

	// Add reservations item with dynamic yearmonth or default to previous month
	const reservationsHref = yearmonth ? `/mijn/reserveringen/${yearmonth}` : `/mijn/reserveringen/${getPreviousMonth()}`
	baseItems.splice(1, 0, { href: reservationsHref, label: 'Reserveringen', isActive: false })

	// Mark the active item
	return baseItems.map(item => ({
		...item,
		isActive: item.href === currentPath
	}))
}
