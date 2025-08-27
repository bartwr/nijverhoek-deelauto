import Image from 'next/image'

export function Explanation() {
	return (
		<section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
			<div className="max-w-6xl mx-auto">
				<div className="text-center mb-12">
					<h2 className="text-3xl font-bold text-gray-900 mb-4">
						Waarom een deelauto zo fijn is
					</h2>
					<p className="text-xl text-gray-600 max-w-3xl mx-auto">
						In de stad kun je met de fiets of lopend overal komen, maar soms is een auto wel zo handig. 
						Dan kun je een deelauto nemen in plaats van een eigen auto te bezitten.
					</p>
				</div>

				<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
					{/* Meer leefruimte */}
					<div className="bg-gradient-to-br from-[#ea5c33]/10 to-[#ea5c33]/5 rounded-2xl p-6 shadow-lg border border-[#ea5c33]/20 text-center">
						<div className="w-16 h-16 bg-[#ea5c33] rounded-full flex items-center justify-center mx-auto mb-4">
							<svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
							</svg>
						</div>
						<h3 className="text-xl font-semibold text-gray-900 mb-3">
							Meer leefruimte
						</h3>
						<p className="text-gray-700">
							1 deelauto vervangt gemiddeld 6 normale auto&apos;s. 
							Meer ruimte voor groen, speelplaatsen en ontmoeting.
						</p>
					</div>

					{/* Duurzamer rijden */}
					<div className="bg-gradient-to-br from-[#ea5c33]/10 to-[#ea5c33]/5 rounded-2xl p-6 shadow-lg border border-[#ea5c33]/20 text-center">
						<div className="w-16 h-16 bg-[#ea5c33] rounded-full flex items-center justify-center mx-auto mb-4">
							<svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
							</svg>
						</div>
						<h3 className="text-xl font-semibold text-gray-900 mb-3">
							Duurzamer rijden
						</h3>
						<p className="text-gray-700">
							Elektrische auto&apos;s rijden heerlijk en stoten minder broeikasgassen, 
							stank, gifstoffen en fijnstof uit.
						</p>
					</div>

					{/* Minder kosten */}
					<div className="bg-gradient-to-br from-[#ea5c33]/10 to-[#ea5c33]/5 rounded-2xl p-6 shadow-lg border border-[#ea5c33]/20 text-center">
						<div className="w-16 h-16 bg-[#ea5c33] rounded-full flex items-center justify-center mx-auto mb-4">
							<svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
							</svg>
						</div>
						<h3 className="text-xl font-semibold text-gray-900 mb-3">
							Minder kosten
						</h3>
						<p className="text-gray-700">
							Met een deelauto bespaar je in veel gevallen geld ten opzichte van 
							autobezit. Geen verzekering, onderhoud of belasting.
						</p>
					</div>

					{/* Flexibiliteit */}
					<div className="bg-gradient-to-br from-[#ea5c33]/10 to-[#ea5c33]/5 rounded-2xl p-6 shadow-lg border border-[#ea5c33]/20 text-center">
						<div className="w-16 h-16 bg-[#ea5c33] rounded-full flex items-center justify-center mx-auto mb-4">
							<svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
						</div>
						<h3 className="text-xl font-semibold text-gray-900 mb-3">
							Flexibiliteit
						</h3>
						<p className="text-gray-700">
							Pak je de auto, fiets, of ga je toch met OV? 
							Jij kiest de beste optie voor elk doel.
						</p>
					</div>
				</div>

				{/* Bottom message */}
				<div className="mt-12 text-center">
					<div className="bg-gradient-to-r from-[#ea5c33]/10 to-[#ea5c33]/5 rounded-2xl p-8 shadow-lg border border-[#ea5c33]/20 max-w-4xl mx-auto">
						<Image 
							src="/infographics/stilstaand-blik.png" 
							alt="Stilstaand blik - illustratie van parkeerplaatsen die ruimte innemen" 
							width={340}
							height={205}
							className="max-w-full h-auto max-w-2xl mx-auto"
						/>
						<div className="mt-4 text-sm text-gray-600">
							Bron: <a 
								href="https://deelauto.nl/app/uploads/2024/07/Deelauto-presentatie-deck-leden-versie.pdf" 
								target="_blank" 
								rel="noopener noreferrer"
								className="text-[#ea5c33] hover:underline"
							>
								Deelauto presentatie deck - Vereniging Deelauto
							</a>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
