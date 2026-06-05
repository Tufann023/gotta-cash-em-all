"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/supabase/AuthProvider";
import { conditionLabel } from "@/lib/wallet";

type UserRow = {
  user_id: string;
  email: string;
  signed_up_at: string;
  last_sign_in_at: string | null;
  provider: string;
  email_confirmed: boolean;
  wallet_count: number;
  wallet_quantity: number;
  total_invested_eur: number;
  watchlist_count: number;
};

type HoldingRow = {
  id: string;
  card_id: string;
  card_name: string;
  set_name: string;
  card_image: string;
  condition: string;
  purchase_date: string;
  purchase_price_eur: number;
  quantity: number;
  notes: string | null;
  created_at: string;
};

type WatchRow = {
  id: string;
  card_id: string;
  card_name: string;
  set_name: string;
  card_image: string;
  noted_price_eur: number | null;
  created_at: string;
};

export default function AdminPage() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?next=/admin");
      return;
    }
    if (!isAdmin) {
      router.replace("/");
      return;
    }
    (async () => {
      setLoading(true); setErr(null);
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc("admin_users_overview");
        if (error) throw error;
        setUsers((data as UserRow[]) ?? []);
      } catch (e: any) {
        setErr(e?.message ?? "Onbekende fout");
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user, isAdmin, router]);

  const totals = useMemo(() => {
    return {
      users: users.length,
      confirmed: users.filter((u) => u.email_confirmed).length,
      withWallet: users.filter((u) => u.wallet_count > 0).length,
      totalCards: users.reduce((s, u) => s + Number(u.wallet_quantity), 0),
      totalInvested: users.reduce((s, u) => s + Number(u.total_invested_eur), 0),
    };
  }, [users]);

  if (authLoading || (!user && !err)) {
    return <div className="text-ink2 max-w-page mx-auto px-7 py-10">Laden…</div>;
  }
  if (!isAdmin) {
    return <div className="text-ink2 max-w-page mx-auto px-7 py-10">Geen toegang.</div>;
  }

  return (
    <div className="fade-in space-y-8 max-w-page mx-auto px-4 md:px-7 py-10">
      <div>
        <div className="text-[11px] font-bold uppercase text-accent mb-2" style={{ letterSpacing: ".14em" }}>
          Voor admins
        </div>
        <h1 className="font-display text-4xl text-ink m-0">Mijn gebruikers</h1>
        <p className="text-ink2 text-[14px] mt-2">
          Overzicht van iedereen die een account heeft. Klik op een rij voor wallet- en watchlist-details.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard label="Gebruikers" value={totals.users.toString()} color="#2A75BB" />
        <StatCard label="Email bevestigd" value={`${totals.confirmed}/${totals.users}`} color="#3FA34D" />
        <StatCard label="Met wallet" value={totals.withWallet.toString()} color="#FFCB05" />
        <StatCard label="Totaal geïnvesteerd" value={`€${totals.totalInvested.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}`} color="#EE1515" />
      </div>

      {err && (
        <div className="bg-card border rounded-md p-4 text-pokeRed text-[14px] font-semibold" style={{ borderColor: "#EE1515" }}>
          Fout: {err}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3 text-[13px] text-ink3 font-semibold">
          <span className="pokeball-spinner" />
          Gebruikers ophalen…
        </div>
      )}

      {/* Users table */}
      {!loading && !err && users.length === 0 && (
        <div className="bg-card rounded-md border p-8 text-center text-ink3" style={{ borderColor: "#DCE7F4" }}>
          Nog geen gebruikers.
        </div>
      )}

      {!loading && users.length > 0 && (
        <div className="bg-card rounded-md border overflow-hidden" style={{ borderColor: "#DCE7F4" }}>
          {/* Desktop header */}
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 text-[11px] uppercase font-bold text-ink3 border-b" style={{ letterSpacing: ".08em", borderColor: "#DCE7F4" }}>
            <div>Email</div>
            <div>Login</div>
            <div>Aangemeld</div>
            <div>Wallet</div>
            <div>Geïnvesteerd</div>
            <div>Watchlist</div>
            <div></div>
          </div>
          {users.map((u) => (
            <UserRowItem
              key={u.user_id}
              u={u}
              expanded={expanded === u.user_id}
              onToggle={() => setExpanded(expanded === u.user_id ? null : u.user_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-card rounded-md border p-4 md:p-5 relative overflow-hidden" style={{ borderColor: "#DCE7F4" }}>
      <div className="absolute -right-6 -top-6 w-[80px] h-[80px] rounded-full opacity-[.08]" style={{ background: color }} />
      <div className="relative">
        <div className="text-[10px] md:text-[11px] uppercase font-bold text-ink3" style={{ letterSpacing: ".08em" }}>{label}</div>
        <div className="font-display text-[24px] md:text-[32px] text-ink leading-none mt-1.5" style={{ fontWeight: 400 }}>{value}</div>
      </div>
    </div>
  );
}

function UserRowItem({ u, expanded, onToggle }: { u: UserRow; expanded: boolean; onToggle: () => void }) {
  const signupDate = new Date(u.signed_up_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
  const loginDate = u.last_sign_in_at
    ? new Date(u.last_sign_in_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })
    : "—";
  return (
    <div className="border-b last:border-0" style={{ borderColor: "#DCE7F4" }}>
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-4 md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 hover:bg-bg2 transition flex flex-col"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 rounded-full bg-accent text-white font-bold text-[13px] flex items-center justify-center flex-none">
            {u.email.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-ink truncate">{u.email}</div>
            {!u.email_confirmed && (
              <span className="text-[10px] text-pokeRed font-bold uppercase" style={{ letterSpacing: ".05em" }}>
                Niet bevestigd
              </span>
            )}
          </div>
        </div>
        <div className="text-[12px] text-ink2 hidden md:block capitalize">{u.provider}</div>
        <div className="text-[12px] text-ink2 hidden md:block">{signupDate}<div className="text-[10px] text-ink3">laatste login {loginDate}</div></div>
        <div className="text-[12px] text-ink hidden md:block tabular-nums">
          <span className="font-semibold">{u.wallet_quantity}</span> kaarten
          <div className="text-[10px] text-ink3">{u.wallet_count} verschillende</div>
        </div>
        <div className="text-[12px] text-ink hidden md:block tabular-nums font-semibold">
          €{Number(u.total_invested_eur).toLocaleString("nl-NL", { maximumFractionDigits: 0 })}
        </div>
        <div className="text-[12px] text-ink hidden md:block tabular-nums font-semibold">
          {u.watchlist_count}
        </div>
        <div className="hidden md:flex items-center justify-end text-ink3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`transition-transform ${expanded ? "rotate-180" : ""}`}>
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </div>
        {/* Mobile compact */}
        <div className="md:hidden text-[12px] text-ink2 mt-1.5 flex items-center gap-2 flex-wrap">
          <span className="capitalize">{u.provider}</span> · {signupDate}
          <span className="text-ink">·</span>
          <span className="text-ink font-semibold">{u.wallet_quantity} kaarten</span>
          <span className="text-ink font-semibold">€{Number(u.total_invested_eur).toLocaleString("nl-NL", { maximumFractionDigits: 0 })}</span>
        </div>
      </button>

      {expanded && <UserDetail userId={u.user_id} />}
    </div>
  );
}

function UserDetail({ userId }: { userId: string }) {
  const [holdings, setHoldings] = useState<HoldingRow[]>([]);
  const [watch, setWatch] = useState<WatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true); setErr(null);
      try {
        const supabase = createClient();
        const [w, wl] = await Promise.all([
          supabase.rpc("admin_user_wallet", { target_user: userId }),
          supabase.rpc("admin_user_watchlist", { target_user: userId }),
        ]);
        if (w.error) throw w.error;
        if (wl.error) throw wl.error;
        setHoldings((w.data as HoldingRow[]) ?? []);
        setWatch((wl.data as WatchRow[]) ?? []);
      } catch (e: any) {
        setErr(e?.message ?? "fout");
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  return (
    <div className="bg-bg px-5 py-5 space-y-5 fade-up">
      {err && <div className="text-pokeRed text-[13px]">Fout: {err}</div>}
      {loading && <div className="flex items-center gap-2 text-ink3 text-[12px]"><span className="pokeball-spinner" /> Laden…</div>}

      {!loading && (
        <>
          {/* Wallet */}
          <div>
            <div className="text-[11px] uppercase font-bold text-ink3 mb-2" style={{ letterSpacing: ".1em" }}>
              Wallet ({holdings.length} verschillende)
            </div>
            {holdings.length === 0 ? (
              <div className="text-[12px] text-ink3 italic">Nog geen kaarten in wallet.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {holdings.map((h) => (
                  <div key={h.id} className="bg-card rounded border p-3 flex items-center gap-3" style={{ borderColor: "#DCE7F4" }}>
                    <a href={`/card/${encodeURIComponent(h.card_id)}`} target="_blank" rel="noopener" className="flex-none">
                      <img src={h.card_image} alt="" className="w-10 h-14 object-contain rounded" />
                    </a>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-ink truncate">
                        {h.card_name} {h.quantity > 1 && <span className="text-ink3 font-normal">×{h.quantity}</span>}
                      </div>
                      <div className="text-[11px] text-ink3 truncate">{h.set_name}</div>
                      <div className="text-[11px] text-ink2 mt-0.5">
                        <span className="font-semibold">{conditionLabel(h.condition as any)}</span> · €{Number(h.purchase_price_eur).toFixed(0)}/st · {new Date(h.purchase_date).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "2-digit" })}
                      </div>
                      {h.notes && <div className="text-[10px] text-ink3 italic truncate">"{h.notes}"</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Watchlist */}
          <div>
            <div className="text-[11px] uppercase font-bold text-ink3 mb-2" style={{ letterSpacing: ".1em" }}>
              Watchlist ({watch.length})
            </div>
            {watch.length === 0 ? (
              <div className="text-[12px] text-ink3 italic">Geen watchlist.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {watch.map((w) => (
                  <a
                    key={w.id}
                    href={`/card/${encodeURIComponent(w.card_id)}`}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-2 bg-card border rounded-full pl-1 pr-3 py-1 text-[12px] hover:border-accent transition"
                    style={{ borderColor: "#DCE7F4" }}
                  >
                    <img src={w.card_image} alt="" className="w-6 h-8 object-contain rounded" />
                    <span className="text-ink font-semibold">{w.card_name}</span>
                    <span className="text-ink3 truncate max-w-[120px]">{w.set_name}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
