"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/supabase/AuthProvider";

export default function UserMenu({ mobile = false }: { mobile?: boolean }) {
  const { user, loading, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (loading) {
    return (
      <span className={mobile ? "block py-3" : "w-10 h-10"} aria-hidden="true">
        <span className="inline-block w-10 h-10 rounded-full bg-bg2 animate-pulse" />
      </span>
    );
  }

  // -------- NIET INGELOGD: één CTA --------
  if (!user) {
    if (mobile) {
      return (
        <a
          href="/login"
          className="btn-physical text-center px-5 py-3 rounded-full text-[15px] mt-2"
          style={{ background: "#EE1515", color: "#fff", boxShadow: "0 3px 0 #B30E0E", fontWeight: 700 }}
        >
          Inloggen
        </a>
      );
    }
    return (
      <a
        href="/login"
        className="btn-physical bg-accent text-white font-bold px-5 py-[11px] rounded-full text-[15px]"
        style={{ boxShadow: "0 3px 0 #B30E0E" }}
      >
        Inloggen
      </a>
    );
  }

  // -------- INGELOGD --------
  const initial = (user.email ?? "?").slice(0, 1).toUpperCase();
  const avatarUrl = (user.user_metadata as any)?.avatar_url as string | undefined;

  if (mobile) {
    return (
      <div className="border-t pt-3 mt-2" style={{ borderColor: "#DCE7F4" }}>
        <div className="flex items-center gap-3 px-4 py-2">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-10 h-10 rounded-full" />
          ) : (
            <span className="w-10 h-10 rounded-full bg-accent text-white font-bold flex items-center justify-center">{initial}</span>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[12px] text-ink3">Ingelogd als</div>
            <div className="text-[14px] text-ink font-semibold truncate">{user.email}</div>
          </div>
        </div>
        {isAdmin && (
          <a
            href="/admin"
            className="block px-4 py-3 rounded-md text-[14px] font-semibold text-pokeBlue hover:bg-bg2 transition"
          >
            🛠 Admin
          </a>
        )}
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="w-full text-left px-4 py-3 rounded-md text-[14px] font-semibold text-ink2 hover:bg-bg2 transition"
          >
            Uitloggen
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 hover:bg-bg2 rounded-full p-1 pr-3 transition"
        aria-label="Account menu"
        aria-expanded={open}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full" />
        ) : (
          <span className="w-9 h-9 rounded-full bg-accent text-white font-bold text-[14px] flex items-center justify-center">{initial}</span>
        )}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`text-ink3 transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-64 bg-card border rounded-md py-2 z-50 fade-in"
          style={{ borderColor: "#DCE7F4", boxShadow: "0 8px 24px rgba(11,42,74,.15)" }}
        >
          <div className="px-4 py-2.5">
            <div className="text-[12px] text-ink3">Ingelogd als</div>
            <div className="text-[14px] text-ink font-semibold truncate">{user.email}</div>
          </div>
          <div className="border-t" style={{ borderColor: "#DCE7F4" }} />
          {isAdmin && (
            <a
              href="/admin"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-[14px] font-semibold text-pokeBlue hover:bg-bg2 transition"
            >
              🛠 Admin
            </a>
          )}
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className={`w-full text-left px-4 py-2.5 text-[14px] text-ink2 hover:bg-bg2 hover:text-pokeRed transition ${isAdmin ? "border-t" : ""}`}
              style={isAdmin ? { borderColor: "#DCE7F4" } : undefined}
            >
              Uitloggen
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
