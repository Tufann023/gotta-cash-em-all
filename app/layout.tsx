import type { Metadata } from "next";
import "./globals.css";
import WatchlistBadge from "./components/WatchlistBadge";

export const metadata: Metadata = {
  title: "Gotta Cash 'Em All — Pokemon kaart tracker",
  description: "Zoek Pokemon kaarten. Bekijk live prijzen, PSA slab schattingen en krijg een investerings-analyse.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <header className="sticky top-0 z-20 backdrop-blur-nav bg-canvas/80 border-b hairline">
          <div className="max-w-page mx-auto px-6 h-16 flex items-center justify-between">
            <a href="/" className="flex items-center" aria-label="Gotta Cash 'Em All">
              <img src="/logo.png" alt="Gotta Cash 'Em All" className="h-9 w-auto" />
            </a>
            <nav className="flex items-center gap-7 text-[13px] text-ink/80">
              <a href="/" className="hover:text-accent transition">Zoeken</a>
              <a href="/watchlist" className="hover:text-accent transition flex items-center gap-1.5">
                Watchlist <WatchlistBadge />
              </a>
            </nav>
          </div>
        </header>
        <main className="max-w-page mx-auto px-6 py-10">{children}</main>
        <footer className="max-w-page mx-auto px-6 py-12 mt-16 border-t hairline">
          <p className="text-xs text-subtle leading-relaxed max-w-2xl">
            Prijsdata via pokemontcg.io (TCGPlayer USA + Cardmarket EU). PSA slab prijzen zijn schattingen op basis van publieke multipliers, geen werkelijke transacties. Geen beleggingsadvies.
          </p>
        </footer>
      </body>
    </html>
  );
}
