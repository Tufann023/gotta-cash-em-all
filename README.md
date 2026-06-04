# Pokemon Tracker

Next.js 14 app om Pokemon kaarten op te zoeken met live marktprijs, PSA slab schattingen, 30-dagen prijschart en een investerings-analyse (regels + optionele Claude AI).

## Features

- 🔍 **Live search** via [pokemontcg.io](https://pokemontcg.io) API (gratis, geen key vereist)
- 💶 **Marktprijs** uit Cardmarket (EUR) of TCGPlayer (USD geconverteerd)
- 🏷 **PSA 8/9/10 schattingen** op basis van publieke multipliers
- 📈 **Prijsverloop** 30 / 7 / 1 dag + nu (Cardmarket avg-data, Recharts)
- ⚡ **Quick-analyse** (regel-gebaseerd, gratis, direct zichtbaar)
- 🤖 **Diepere AI-analyse** via Claude Haiku 4.5 (~$0,01-$0,03 per analyse, op verzoek)

## Lokaal draaien

```bash
cd /Users/tufanavci/Claude/Pokemon/tracker
npm install
cp .env.local.example .env.local
# vul ANTHROPIC_API_KEY in .env.local
npm run dev
```

Open <http://localhost:3000>.

Zonder `ANTHROPIC_API_KEY` werkt alles behalve de AI-knop.

## Deployen op Vercel

```bash
# Eénmalig vanuit /Users/tufanavci/Claude/Pokemon/tracker/
npx vercel
# Voeg ANTHROPIC_API_KEY toe in Vercel dashboard → Project Settings → Environment Variables
# Hierna:
npx vercel --prod
```

Of via GitHub: push naar een repo en koppel via [vercel.com/new](https://vercel.com/new).

## Project structuur

```
tracker/
├── app/
│   ├── layout.tsx                  # Header + footer + huisstijl
│   ├── page.tsx                    # Zoekbalk + resultaten-grid
│   ├── card/[id]/page.tsx          # Kaart-detail (prijs, PSA, chart, analyse)
│   ├── components/PriceChart.tsx   # Recharts line chart
│   └── api/
│       ├── search/route.ts         # GET /api/search?q=...
│       ├── card/[id]/route.ts      # GET /api/card/{id}
│       └── analyse/route.ts        # POST /api/analyse → Claude
├── lib/
│   ├── pokemontcg.ts               # pokemontcg.io wrapper + price helpers
│   ├── psa.ts                      # PSA slab heuristieken
│   └── analysis.ts                 # Regel-gebaseerde scorer
└── tailwind.config.ts              # Huisstijl-kleuren
```

## Data &amp; disclaimers

- Prijzen komen via pokemontcg.io (TCGPlayer USA + Cardmarket EU).
- PSA-prijzen zijn schattingen op basis van publieke multipliers gekalibreerd op recente verkopen — geen werkelijke transacties.
- De regel-gebaseerde analyse en AI-analyse zijn informatief, geen beleggingsadvies.
- Voor productie: voeg caching (Vercel KV / Redis) toe als je de site publiek maakt.

## Veelgestelde technische dingen

**"AI-analyse geeft een ANTHROPIC_API_KEY error"**
→ Sleutel ontbreekt. Zet hem in `.env.local` lokaal of in Vercel project settings voor deployment.

**"Search geeft soms 429"**
→ Pokemontcg.io rate limit zonder API key. Genereer er gratis één op <https://dev.pokemontcg.io> en zet `POKEMONTCG_API_KEY`.

**"Mijn kaart staat er niet bij"**
→ pokemontcg.io heeft alleen Engelse releases. Japanse exclusives en Promo's kunnen ontbreken.
