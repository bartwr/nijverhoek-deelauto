'use client'

interface VideoItem {
	title: string
	embedId: string
}

const videoData: VideoItem[] = [
	{
		title: 'Auto openen en sluiten',
		embedId: '8mgaearQhJ81B8HwLbyaau'
	},
	{
		title: 'Stoel beweegt bij instappen',
		embedId: 'tFTAWSx3vr7Vc8FGDPEPrA'
	},
	{
		title: 'Auto starten',
		embedId: '9niJ77DWZrrFnc54LgYApy'
	},
	{
		title: 'Spiegels instellen',
		embedId: 'm47vLdJ3kGsYWZ4VhUjorU'
	},
	{
		title: 'Telefoon-connectie',
		embedId: 'j8gcEfXHa94dvZuqWHaTBE'
	},
	{
		title: 'Toon mobiel op het scherm',
		embedId: 'oGGjCRufVck5oLZr1N1KnU'
	},
	{
		title: 'Cruise control',
		embedId: '6xmiMKSGqGPKw7JdYAvrim'
	},
	{
		title: 'Laden en stoppen met laden',
		embedId: '6kMqiReecXWUTTShACnYRB'
	}
]

export function VideoInstructions() {
	return (
		<section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
			<div className="max-w-6xl mx-auto">
				<div className="text-center mb-12">
					<h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
						Video instructies
					</h2>
					<p className="text-lg text-gray-600 dark:text-gray-300">
						Leer hoe je de deelauto gebruikt met deze video handleidingen
					</p>
				</div>
				
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
					{videoData.map((video, index) => (
						<div
							key={index}
							className="bg-gray-50 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 overflow-hidden transition-all duration-200 hover:shadow-md"
						>
							<div className="p-6">
								<h3 className="font-medium text-gray-900 dark:text-gray-100 text-lg mb-4 text-center">
									{video.title}
								</h3>
								<div className="aspect-video w-full">
									<iframe
										title={video.title}
										width="100%"
										height="100%"
										src={`https://vid.bartroorda.nl/videos/embed/${video.embedId}`}
										frameBorder="0"
										allowFullScreen
										sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
										className="rounded-lg"
									/>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}
