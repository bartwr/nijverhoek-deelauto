export function Footer() {
	return (
		<footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-7xl mx-auto">
				<div className="grid md:grid-cols-3 gap-8">
					<div className="space-y-4">
											<h3 className="text-xl font-semibold text-[#ea5c33]">
						Deelauto Nijverhoek
					</h3>
						<p className="text-gray-300 text-sm leading-relaxed">
							Een zelfopgezet deelauto-initiatief voor de Nijverhoek
						</p>
					</div>
					
					<div className="space-y-4">
          <h3 className="text-xl font-semibold text-[#ea5c33]">
						Snelle links
					</h3>
						<ul className="space-y-2 text-sm text-gray-300">
							<li>
								<a 
									href="https://deelauto.nl/onze-app/" 
									target="_blank" 
									rel="noopener noreferrer"
									className="hover:text-[#ea5c33] transition-colors duration-200"
								>
									Reserveren en app downloaden
								</a>
							</li>
						</ul>
					</div>
					
					<div className="space-y-4">
											<h3 className="text-xl font-semibold text-[#ea5c33]">
						Contact
					</h3>
						<div className="space-y-2 text-sm text-gray-300">
							<p>
								E-mail: <a 
									href="mailto:auto@nijverhoek.nl" 
									className="hover:text-[#ea5c33] transition-colors duration-200"
								>
									auto@nijverhoek.nl
								</a>
							</p>
						</div>
					</div>
				</div>
				
				<div className="border-t border-gray-800 mt-8 text-center">
					<p className="text-gray-400 text-sm">
						<picture>
							<img src="https://app.nijverhoek.nl/images/logo/nijverhoek-logo-rood.png" alt="Logo Nijverhoek" className="inline-block" />
						</picture>
					</p>
				</div>
			</div>
		</footer>
	)
}
