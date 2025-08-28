import Image from 'next/image'

export function Hero() {
	return (
		<section className="py-16 px-4 sm:px-6 lg:px-8">
			<div className="max-w-7xl mx-auto">
				<div className="grid lg:grid-cols-2 gap-12 items-center">
					<div className="space-y-6">
						<h2 className="text-4xl font-bold text-gray-900 leading-tight">
            <span className="text-[#ea5c33]">Een auto in de buurt,</span>{' '}
							voor de buurt
						</h2>
						<p className="text-xl text-gray-600 leading-relaxed">
							Je betaalt alleen voor wat je rijdt
						</p>
						<div className="flex flex-col sm:flex-row gap-4">
							<div className="flex items-center space-x-2 text-[#3b82f6]">
								<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
									<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
								</svg>
								<span className="font-medium">Elektrisch rijden</span>
							</div>
							<div className="flex items-center space-x-2 text-[#3b82f6]">
								<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
									<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
								</svg>
								<span className="font-medium">350 km actieradius</span>
							</div>
							<div className="flex items-center space-x-2 text-[#3b82f6]">
								<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
									<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
								</svg>
								<span className="font-medium">Flexibele reserveringen</span>
							</div>
						</div>
					</div>
					<div className="relative">
						<div className="relative rounded-2xl overflow-hidden shadow-2xl">
							<Image
								src="/ladiedada.webp"
								alt="Animated car sharing illustration"
								width={600}
								height={400}
								className="w-full h-auto"
								priority
							/>
						</div>
						<div className="absolute -bottom-4 -right-4 bg-[#ea5c33] text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
							🚗 Ladiedadaladiedada
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
