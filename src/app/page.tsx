import Image from 'next/image'
import { FAQ } from '@/components/FAQ'
import { Header } from '@/components/Header'
import { Hero } from '@/components/Hero'
import { Explanation } from '@/components/Explanation'
import { ContactSection } from '@/components/ContactSection'
import { Footer } from '@/components/Footer'

export default function Home() {
	return (
		<main className="min-h-screen bg-gradient-to-br from-[#ea5c33]/5 via-white to-[#ea5c33]/5">
			<Header />
			<Hero />
			<Explanation />
			<FAQ />
			<ContactSection />
			<Footer />
		</main>
	)
}
