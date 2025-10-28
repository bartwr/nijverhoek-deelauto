'use client'

import { useState } from 'react'

interface FAQItem {
	question: string
	answer: string
	icon: string
}

const faqData: FAQItem[] = [
	{
		question: 'Om welke auto gaat het?',
		answer: 'Het is een Kia e-Niro met 400 km actieradius',
		icon: '🚗'
	},
	{
		question: 'Wie zijn de initiatiefnemers?',
		answer: 'Drie huishoudens in de Nijverhoek hebben de auto gezamenlijk gekocht en bieden die aan als deelauto.',
		icon: '👥'
	},
	{
		question: 'Hoe kan ik gebruik maken van de auto?',
		answer: 'In de eerste periode willen we met enkele huishoudens het concept testen. Bij interesse: geef dit door via <a href="mailto:auto@nijverhoek.nl">auto@nijverhoek.nl</a>. Als je je hebt geïnformeerd en wilt deelnemen: maak voor elke bestuurder een <a href="https://mijn.deelauto.nl/" target="_blank">Deelauto-account</a> aan voor 20 euro per jaar, en je kunt rijden.',
		icon: '📱'
	},
	{
		question: 'Wat kost het?',
		answer: 'De jaarlijkse kosten 20 euro. Momenteel zijn de rijkosten: 3.20 euro per uur (maximaal 10 uur per dag) en 0.32 euro per km (inclusief elektriciteit). Deze kunnen wijzigen door de tijd',
		icon: '💰'
	},
	{
		question: 'Hoe reserveer ik de auto?',
		answer: 'Open de app \'Deelauto\' en reserveer een tijdsperiode (van en tot tijd). Bij start van de rit kun je de auto openen via de app.',
		icon: '📅'
	},
	{
		question: 'Wat zijn de \'huisregels\'?',
		answer: 'Als je start als deelauto-gebruiker onderteken je een overeenkomst waarin staat wat de regels zijn. Hierin staat bijvoorbeeld dat je niet mag roken in de auto, en er staat bijvoorbeeld in hoe boetes en schades worden verrekend.',
		icon: '📋'
	}
]

export function FAQ() {
	const [openIndex, setOpenIndex] = useState<number | null>(0)

	const toggleFAQ = (index: number) => {
		setOpenIndex(openIndex === index ? null : index)
	}

	return (
		<section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800">
			<div className="max-w-4xl mx-auto">
				<div className="text-center mb-12">
					<h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
						Veelgestelde vragen
					</h2>
					<p className="text-lg text-gray-600 dark:text-gray-300">
						Alles wat je moet weten over de deelauto
					</p>
				</div>
				
				<div className="space-y-4">
					{faqData.map((item, index) => (
						<div
							key={index}
							className="bg-white dark:bg-gray-700 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 overflow-hidden transition-all duration-200 hover:shadow-md"
						>
							<button
								onClick={() => toggleFAQ(index)}
								className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200 cursor-pointer"
							>
								<div className="flex items-center space-x-4">
									<span className="text-2xl">{item.icon}</span>
									<span className="font-medium text-gray-900 dark:text-gray-100 text-lg">
										{item.question}
									</span>
								</div>
								<svg
									className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
										openIndex === index ? 'rotate-180' : ''
									}`}
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
								</svg>
							</button>
							
							{openIndex === index && (
								<div className="px-6 pb-4">
									<div className="pt-2 border-t border-gray-100 dark:border-gray-600">
										<p className="text-gray-700 dark:text-gray-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: item.answer }} />
									</div>
								</div>
							)}
						</div>
					))}
				</div>
			</div>
		</section>
	)
}
