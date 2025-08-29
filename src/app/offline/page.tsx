export default function OfflinePage() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-[#ea5c33]/5 via-white to-[#ea5c33]/5 flex items-center justify-center p-4">
			<div className="text-center max-w-md">
				<div className="mb-6">
					<svg
						className="w-24 h-24 mx-auto text-orange-500"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5z"
						/>
					</svg>
				</div>
				<h1 className="text-3xl font-bold text-gray-900 mb-4">
					Geen internetverbinding
				</h1>
				<p className="text-gray-600 mb-6">
					Het lijkt erop dat je geen internetverbinding hebt. Controleer je verbinding en probeer het opnieuw.
				</p>
				<button
					onClick={() => window.location.reload()}
					className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
				>
					Opnieuw proberen
				</button>
			</div>
		</div>
	)
}
