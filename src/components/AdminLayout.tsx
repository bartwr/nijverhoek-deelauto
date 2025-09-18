'use client'

import { ReactNode } from 'react'

interface AdminLayoutProps {
	title: string
	children: ReactNode
	sidebarItems: Array<{
		href: string
		label: string
		isActive?: boolean
	}>
	onLogout?: () => void
	showLogout?: boolean
}

export default function AdminLayout({
	title,
	children,
	sidebarItems,
	onLogout,
	showLogout = true
}: AdminLayoutProps) {
	return (
		<div className="min-h-screen bg-gradient-to-br from-[#ea5c33]/5 via-white to-[#ea5c33]/5 dark:from-[#ea5c33]/10 dark:via-gray-900 dark:to-[#ea5c33]/10">
			{/* Branded Header */}
			<header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						<h1 className="text-2xl sm:text-3xl font-bold text-gray-900 bg-gradient-to-r from-[#ea5c33] to-[#ea5c33] bg-clip-text text-transparent">
							{title}
						</h1>
						{showLogout && onLogout && (
							<button
								onClick={onLogout}
								className="px-4 py-2 text-sm font-medium text-white bg-[#ea5c33] hover:bg-[#ea5c33]/90 rounded-md transition-colors cursor-pointer"
							>
								Log uit
							</button>
						)}
					</div>
				</div>
			</header>

			<div className="flex flex-col lg:flex-row">
				{/* Mobile-first Navigation */}
				<aside className="lg:w-64 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700">
					<nav className="p-4 lg:mt-8">
						<div className="flex flex-row lg:flex-col gap-2 lg:space-y-2 overflow-x-auto lg:overflow-x-visible">
							{sidebarItems.map((item) => (
								<a
									key={item.href}
									href={item.href}
									className={`block px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
										item.isActive
											? 'text-white bg-[#ea5c33] shadow-sm'
											: 'text-gray-700 dark:text-gray-300 hover:text-[#ea5c33] dark:hover:text-[#ea5c33] hover:bg-white/60 dark:hover:bg-gray-700/60'
									}`}
								>
									{item.label}
								</a>
							))}
						</div>
					</nav>
				</aside>

				{/* Main Content */}
				<main className="flex-1 p-4 sm:p-6 lg:p-8">
					<div className="max-w-6xl mx-auto">
						{children}
					</div>
				</main>
			</div>
		</div>
	)
}
