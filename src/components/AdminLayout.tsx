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
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			{/* Topbar */}
			<header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						<h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
							{title}
						</h1>
						{showLogout && onLogout && (
							<button
								onClick={onLogout}
								className="
									px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors
									cursor-pointer
								"
							>
								Log uit
							</button>
						)}
					</div>
				</div>
			</header>

			<div className="flex">
				{/* Left Sidebar */}
				<aside className="w-64 bg-white dark:bg-gray-800 shadow-sm min-h-screen">
					<nav className="mt-8">
						<div className="px-4 space-y-2">
							{sidebarItems.map((item) => (
								<a
									key={item.href}
									href={item.href}
									className={`block px-4 py-2 text-sm font-medium rounded-md transition-colors ${
										item.isActive
											? 'text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700'
											: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
									}`}
								>
									{item.label}
								</a>
							))}
						</div>
					</nav>
				</aside>

				{/* Main Content */}
				<main className="flex-1 p-8">
					<div className="max-w-6xl">
						{children}
					</div>
				</main>
			</div>
		</div>
	)
}
