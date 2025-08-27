# Deelauto Nijverhoek - Gedeelde Auto Landing Page

Een moderne, responsieve landing page voor de gedeelde auto service in de Nijverhoek. Deze Next.js applicatie presenteert alle belangrijke informatie over het deelauto-initiatief op een aantrekkelijke en gebruiksvriendelijke manier.

## 🚗 Over het Project

Deelauto Nijverhoek is een lokaal initiatief van drie huishoudens die gezamenlijk een elektrische Kia e-Niro hebben gekocht en deze aanbieden als deelauto voor de buurt. Deze landing page legt uit hoe het systeem werkt en hoe geïnteresseerden kunnen deelnemen.

## ✨ Functies

- **Moderne, responsieve design** - Werkt perfect op alle apparaten
- **Interactieve FAQ sectie** - Uitklapbare vragen en antwoorden
- **Animaties en visuele elementen** - Inclusief geanimeerde GIF van Giphy
- **Contact informatie** - Directe links naar e-mail en telefoon
- **SEO geoptimaliseerd** - Met metadata en Open Graph tags
- **Toegankelijk** - Volgt moderne web standaarden

## 🛠️ Technische Details

### Gebruikte Technologieën
- **Next.js 14** - Moderne React framework met App Router
- **TypeScript** - Voor type-veilige code
- **Tailwind CSS** - Voor snelle, responsieve styling
- **React Hooks** - Voor interactieve functionaliteit

### Project Structuur
```
src/
├── app/
│   ├── layout.tsx          # Hoofdlayout met metadata
│   └── page.tsx            # Hoofdpagina
├── components/
│   ├── Header.tsx          # Navigatie header
│   ├── Hero.tsx            # Hoofdsectie met afbeelding
│   ├── Explanation.tsx     # Uitleg sectie
│   ├── FAQ.tsx             # Veelgestelde vragen
│   ├── ContactSection.tsx  # Contact informatie
│   └── Footer.tsx          # Voettekst
```

## 🚀 Installatie en Uitvoering

### Vereisten
- Node.js 18+ 
- npm of yarn

### Installatie
```bash
# Clone de repository
git clone [repository-url]
cd nijverhoek-deelauto

# Installeer dependencies
npm install

# Start development server
npm run dev
```

De applicatie is nu beschikbaar op `http://localhost:3000`

### Build voor productie
```bash
npm run build
npm start
```

## 📱 Inhoud van de Landing Page

### 1. Header
- Titel: "Deelauto Nijverhoek" met gradient styling

### 2. Hero Sectie
- Hoofdtitel: "Een auto in de buurt, voor de buurt"
- Ondertitel: "Je betaalt alleen voor wat je rijdt"
- Animaties afbeelding van Giphy
- Feature highlights (Elektrisch rijden, 350 km actieradius, Gedeelde kosten)

### 3. Uitleg Sectie
- Centrale boodschap in een aantrekkelijke kaart
- Visuele elementen en iconen

### 4. FAQ Sectie
- **Om welke auto gaat het?** - Kia e-Niro met 350 km actieradius
- **Wie is de initiatiefnemer?** - Drie huishoudens in de Nijverhoek
- **Hoe kan ik gebruik maken van de auto?** - Testperiode en account aanmaken
- **Wat kost het?** - Jaarlijkse kosten en rijkosten
- **Hoe reserveer ik de auto?** - Via de Deelauto app
- **Wat zijn de 'huisregels'?** - Overeenkomst en regels

### 5. Contact Sectie
- Call-to-action: "Interesse? Stuur een e-mail"
- Contact informatie (e-mail en telefoon)
- Aantrekkelijke gradient achtergrond

### 6. Footer
- Aanvullende informatie en links
- Link naar mijn.deelauto.nl
- Copyright informatie

## 🎨 Design Kenmerken

- **Kleurenschema**: Blauw-groen gradient thema
- **Typografie**: Moderne, leesbare fonts
- **Responsiviteit**: Mobile-first design
- **Animaties**: Subtiele hover effecten en transities
- **Toegankelijkheid**: Semantische HTML en ARIA labels

## 🔧 Configuratie

### Externe Afbeeldingen
De applicatie is geconfigureerd om externe afbeeldingen van Giphy te laden via `next.config.ts`:

```typescript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'i.giphy.com',
      port: '',
      pathname: '/**',
    },
  ],
}
```

### Metadata
SEO-geoptimaliseerde metadata in `layout.tsx`:
- Titel en beschrijving
- Open Graph tags voor social media
- Keywords en auteur informatie

## 📧 Contact

Voor vragen over de deelauto:
- **E-mail**: mail@bartroorda.nl
- **Telefoon**: 06 463 86 864

## 📄 Licentie

© 2024 Deelauto Nijverhoek. Alle rechten voorbehouden.

## 🤝 Bijdragen

Dit project is ontwikkeld voor de lokale gemeenschap in de Nijverhoek. Voor suggesties of verbeteringen, neem contact op via de bovenstaande contactgegevens.
