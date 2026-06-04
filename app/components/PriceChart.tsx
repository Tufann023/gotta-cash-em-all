"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function PriceChart({ data }: { data: { label: string; price: number }[] }) {
  if (!data || data.length < 2)
    return (
      <div className="bg-surface rounded-2xl p-5 border hairline text-sm text-muted">
        Onvoldoende historische data voor een grafiek.
      </div>
    );
  return (
    <div className="bg-surface rounded-2xl p-5 border hairline">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-3">Prijsverloop · Cardmarket · EUR</div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e7" />
          <XAxis dataKey="label" stroke="#86868b" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#86868b" fontSize={11} tickLine={false} axisLine={false}
                 tickFormatter={(v) => `€${v}`} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{ background: "#fff", border: "1px solid #d2d2d7", borderRadius: 10, fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
            formatter={(v: number) => [`€${Number(v).toFixed(2)}`, "Prijs"]}
          />
          <Line type="monotone" dataKey="price" stroke="#0071e3" strokeWidth={2.5}
                dot={{ r: 4, fill: "#0071e3", strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "#0071e3", strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
