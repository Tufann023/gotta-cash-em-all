"use client";
import { useState, useEffect } from "react";
import WatchlistBadge from "./WatchlistBadge";
import WalletBadge from "./WalletBadge";
import UserMenu from "./UserMenu";

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  // Sluit menu bij ESC en bij route-change (klik op link)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Lock body scroll wanneer open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Sluit menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        className="md:hidden flex items-center justify-center w-11 h-11 rounded-full bg-card text-ink border transition active:scale-95"
        style={{ borderColor: "#C3D5EC" }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {open ? (
            <>
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </>
          ) : (
            <>
              <path d="M3 12h18" />
              <path d="M3 6h18" />
              <path d="M3 18h18" />
            </>
          )}
        </svg>
      </button>

      {open && (
        <div
          id="mobile-nav-panel"
          className="md:hidden fixed inset-x-0 top-[78px] z-40 bg-card border-b"
          style={{ borderColor: "#DCE7F4", boxShadow: "0 8px 24px rgba(11,42,74,.10)" }}
          role="menu"
        >
          <div className="px-5 py-4 flex flex-col gap-1">
            <a
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between px-4 py-3 rounded-md text-[16px] font-semibold text-ink hover:bg-bg2 transition"
              role="menuitem"
            >
              Zoeken
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink3">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </a>
            <a
              href="/watchlist"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between px-4 py-3 rounded-md text-[16px] font-semibold text-ink hover:bg-bg2 transition"
              role="menuitem"
            >
              <span className="flex items-center gap-2">
                Watchlist <WatchlistBadge />
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink3">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </a>
            <a
              href="/wallet"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between px-4 py-3 rounded-md text-[16px] font-semibold text-ink hover:bg-bg2 transition"
              role="menuitem"
            >
              <span className="flex items-center gap-2">
                Mijn wallet <WalletBadge />
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink3">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </a>
            <UserMenu mobile />
          </div>
        </div>
      )}
    </>
  );
}
