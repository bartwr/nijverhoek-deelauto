export function ContactSection() {
	return (
		<section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[#ea5c33] to-[#ea5c33]/90">
			<div className="max-w-4xl mx-auto text-center">
				<div className="bg-white/10 backdrop-blur-sm rounded-3xl p-12 border border-white/20">
					<div className="space-y-8">
						<div className="space-y-4">
							<h2 className="text-3xl font-bold text-white">
								Interesse? Stuur een e-mail
							</h2>
							<p className="text-xl text-white/90 max-w-2xl mx-auto">
								Wil je meer weten over de deelauto of ben je geïnteresseerd om deel te nemen? 
								Neem contact op!
							</p>
						</div>
						
						<div className="grid md:grid-cols-1 gap-6 max-w-sm mx-auto">
							<div className="bg-white/100 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
								<div className="space-y-3">
									<div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto">
										<svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
										</svg>
									</div>
									<h3 className="font-semibold text-black">E-mail</h3>
																<a 
								href="mailto:auto@nijverhoek.nl" 
								className="text-[#ea5c33]/90 hover:text-black transition-colors duration-200 font-medium"
							>
								auto@nijverhoek.nl
							</a>
								</div>
							</div>
							
							{/* <div className="bg-white/100 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
								<div className="space-y-3">
									<div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto">
										<svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
										</svg>
									</div>
									<h3 className="font-semibold text-black">Telefoon</h3>
																<a 
								href="tel:0646386864" 
								className="text-[#ea5c33]/90 hover:text-black transition-colors duration-200 font-medium"
							>
								06 463 86 864
							</a>
								</div>
							</div> */}
						</div>
						
					</div>
				</div>
			</div>
		</section>
	)
}
