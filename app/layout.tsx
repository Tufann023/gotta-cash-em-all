import type { Metadata } from "next";
import "./globals.css";
import WatchlistBadge from "./components/WatchlistBadge";
import WalletBadge from "./components/WalletBadge";
import Pokeball from "./components/Pokeball";
import MobileNav from "./components/MobileNav";
import UserMenu from "./components/UserMenu";
import { AuthProvider } from "@/lib/supabase/AuthProvider";

export const metadata: Metadata = {
  title: "Gotta Cash 'Em All — Pokemon kaart tracker",
  description: "Zoek Pokemon kaarten. Live marktprijzen, PSA-schattingen, prijsverloop en investerings-analyse.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <AuthProvider>
        <header className="sticky top-0 z-40 backdrop-blur-nav" style={{ backdropFilter: "saturate(1.4) blur(12px)", background: "color-mix(in srgb, #F4F8FE 82%, transparent)", borderBottom: "1px solid #DCE7F4" }}>
          <div className="max-w-page mx-auto px-4 md:px-7 h-[78px] flex items-center justify-between gap-3">
            <a href="/" className="flex items-center gap-2.5 md:gap-3 min-w-0" aria-label="Gotta Cash 'Em All home">
              <Pokeball size={28} className="md:w-[30px] md:h-[30px]" />
              <img
                src="/logo.png"
                alt="Gotta Cash 'Em All"
                className="h-7 sm:h-8 md:h-10 w-auto select-none pointer-events-none"
                draggable={false}
              />
            </a>
            <nav className="hidden md:flex items-center gap-2">
              <a className="px-4 py-2.5 rounded-full text-[16px] font-semibold text-ink2 hover:bg-bg2 hover:text-ink transition-colors duration-150" href="/">Zoeken</a>
              <a className="px-4 py-2.5 rounded-full text-[16px] font-semibold text-ink2 hover:bg-bg2 hover:text-ink transition-colors duration-150 inline-flex items-center gap-1.5" href="/watchlist">
                Watchlist <WatchlistBadge />
              </a>
              <a className="px-4 py-2.5 rounded-full text-[16px] font-semibold text-ink2 hover:bg-bg2 hover:text-ink transition-colors duration-150 inline-flex items-center gap-1.5" href="/wallet">
                Mijn wallet <WalletBadge />
              </a>
              <UserMenu />
            </nav>
            <MobileNav />
          </div>
        </header>
        <main id="top">{children}</main>
        <footer className="border-t hairline mt-16" style={{ borderColor: "#DCE7F4" }}>
          <div className="max-w-page mx-auto px-7 py-[30px] flex items-center justify-between gap-4 flex-wrap">
            <small className="text-ink3 text-[13px]">© 2026 Gotta Cash 'Em All · Geen creditcard nodig · Gebouwd voor verzamelaars</small>
            <div className="flex gap-[18px]">
              <a className="text-ink2 font-semibold text-[14px] hover:text-accent transition-colors" href="#">Over</a>
              <a className="text-ink2 font-semibold text-[14px] hover:text-accent transition-colors" href="#">Prijzen</a>
              <a className="text-ink2 font-semibold text-[14px] hover:text-accent transition-colors" href="#">Contact</a>
            </div>
          </div>
        </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
