"use client";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Server, Database, Zap, Globe } from "lucide-react";
import type { GenResult } from "@/lib/api/client";

interface P { result: GenResult; }

// Real-world pricing data (as of 2025)
const PROVIDERS = {
  railway: {
    name: "Railway", color: "#7c3aed", logo: "🚂",
    compute: { starter: 5, pro: 20, team: 100 },    // per service/month
    postgres: { free: 0, starter: 5, pro: 20 },
    redis:    { free: 0, starter: 3, pro: 10 },
    egress:   0,   // included
    note: "Best for startups — simple deploys, free tier available",
  },
  render: {
    name: "Render", color: "#00b96b", logo: "🎯",
    compute: { starter: 7, pro: 25, team: 85 },
    postgres: { free: 0, starter: 7, pro: 20 },
    redis:    { free: 0, starter: 10, pro: 25 },
    egress:   0.1,
    note: "Good DX, free static sites, reliable PostgreSQL",
  },
  flyio: {
    name: "Fly.io", color: "#7928CA", logo: "🪁",
    compute: { starter: 5.7, pro: 22, team: 90 },
    postgres: { free: 0, starter: 5, pro: 18 },
    redis:    { free: 0, starter: 3, pro: 8 },
    egress:   0.02,
    note: "Multi-region, great for global apps, generous free tier",
  },
  aws: {
    name: "AWS", color: "#ff9900", logo: "☁️",
    compute: { starter: 15, pro: 70, team: 300 },
    postgres: { free: 0, starter: 25, pro: 100 },
    redis:    { free: 0, starter: 15, pro: 50 },
    egress:   0.09,
    note: "Most features, steeper learning curve, scales to any size",
  },
  gcp: {
    name: "GCP", color: "#4285f4", logo: "🔵",
    compute: { starter: 12, pro: 55, team: 250 },
    postgres: { free: 0, starter: 20, pro: 85 },
    redis:    { free: 0, starter: 12, pro: 40 },
    egress:   0.08,
    note: "Strong data/ML tools, good free tier, global network",
  },
  supabase: {
    name: "Supabase", color: "#3ecf8e", logo: "⚡",
    compute: { starter: 0, pro: 25, team: 599 },
    postgres: { free: 0, starter: 0, pro: 0 },   // included
    redis:    { free: 0, starter: 5, pro: 15 },
    egress:   0,
    note: "Free PostgreSQL + Auth + Storage — perfect for MVPs",
  },
};

type ProviderKey = keyof typeof PROVIDERS;
type Tier = "starter" | "pro" | "team";

function calcCost(
  provider: ProviderKey,
  tier: Tier,
  services: number,
  hasCache: boolean,
  hasSearch: boolean,
  egressGB: number,
) {
  const p = PROVIDERS[provider];
  const compute  = p.compute[tier] * Math.max(1, services);
  const postgres = p.postgres[tier];
  const redis    = hasCache ? p.redis[tier] : 0;
  const search   = hasSearch ? (tier === "starter" ? 0 : tier === "pro" ? 15 : 50) : 0;
  const egress   = p.egress * egressGB;
  const total    = compute + postgres + redis + search + egress;
  return { compute, postgres, redis, search, egress, total: Math.round(total) };
}

const TIER_LABELS: Record<Tier, string> = {
  starter: "Starter / MVP",
  pro:     "Production",
  team:    "Scale / Team",
};

function ProviderCard({ pKey, tier, services, hasCache, hasSearch, egressGB, selected, onSelect }: {
  pKey: ProviderKey; tier: Tier; services: number; hasCache: boolean; hasSearch: boolean;
  egressGB: number; selected: boolean; onSelect: () => void;
}) {
  const p    = PROVIDERS[pKey];
  const cost = calcCost(pKey, tier, services, hasCache, hasSearch, egressGB);

  return (
    <motion.button onClick={onSelect} whileHover={{ scale: 1.01 }}
      style={{
        width: "100%", textAlign: "left", cursor: "pointer",
        padding: "14px 16px", borderRadius: 12,
        background: selected ? `${p.color}12` : "rgba(255,255,255,0.02)",
        border: `1px solid ${selected ? p.color + "55" : "rgba(255,255,255,0.07)"}`,
        transition: "all 0.2s",
      }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>{p.logo}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: selected ? p.color : "#e5e7eb" }}>{p.name}</span>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 20, fontWeight: 800, color: p.color, lineHeight: 1, fontFamily: "'JetBrains Mono',monospace" }}>${cost.total}</p>
          <p style={{ fontSize: 10, color: "#6b7280" }}>/month</p>
        </div>
      </div>

      {/* Cost breakdown */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
        {[
          { label: "Compute", val: cost.compute, icon: "⚙️" },
          { label: "PostgreSQL", val: cost.postgres, icon: "🐘" },
          cost.redis   > 0 ? { label: "Redis",  val: cost.redis,   icon: "⚡" } : null,
          cost.search  > 0 ? { label: "Search", val: cost.search,  icon: "🔍" } : null,
          cost.egress  > 0 ? { label: "Egress", val: Math.round(cost.egress), icon: "📡" } : null,
        ].filter(Boolean).map(item => item && (
          <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#6b7280" }}>{item.icon} {item.label}</span>
            <span style={{ fontSize: 11, color: "#9ca3af", fontFamily: "'JetBrains Mono',monospace" }}>${item.val}/mo</span>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 10, color: "#6b7280", lineHeight: 1.4 }}>{p.note}</p>
    </motion.button>
  );
}

export default function CostCalculator({ result }: P) {
  const { blueprint: bp, requirements: req } = result;
  const [tier, setTier]       = useState<Tier>("starter");
  const [selected, setSelected] = useState<ProviderKey>("railway");
  const [egressGB, setEgressGB] = useState(10);

  const services  = bp.services?.length || 2;
  const hasCache  = !!bp.cache;
  const hasSearch = !!bp.search_engine;

  const costs = useMemo(() =>
    (Object.keys(PROVIDERS) as ProviderKey[]).map(k => ({
      key: k,
      total: calcCost(k, tier, services, hasCache, hasSearch, egressGB).total,
    })).sort((a, b) => a.total - b.total),
  [tier, services, hasCache, hasSearch, egressGB]);

  const cheapest = costs[0];
  const selectedCost = calcCost(selected, tier, services, hasCache, hasSearch, egressGB);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Controls */}
      <div style={{ padding: "16px 18px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <p style={{ fontSize: 10, color: "#6b7280", fontFamily: "'JetBrains Mono',monospace", marginBottom: 8 }}>TIER</p>
          <div style={{ display: "flex", gap: 4 }}>
            {(Object.keys(TIER_LABELS) as Tier[]).map(t => (
              <button key={t} onClick={() => setTier(t)}
                style={{ padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                  background: tier === t ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${tier === t ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)"}`,
                  color: tier === t ? "#fff" : "#6b7280",
                }}>{TIER_LABELS[t]}</button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{ fontSize: 10, color: "#6b7280", fontFamily: "'JetBrains Mono',monospace", marginBottom: 8 }}>
            MONTHLY EGRESS: <span style={{ color: "#9ca3af" }}>{egressGB}GB</span>
          </p>
          <input type="range" min={1} max={500} step={5} value={egressGB} onChange={e => setEgressGB(Number(e.target.value))}
            style={{ width: "100%", cursor: "pointer" }} />
        </div>

        <div style={{ padding: "10px 14px", borderRadius: 9, background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.2)" }}>
          <p style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>Cheapest option</p>
          <p style={{ fontSize: 15, fontWeight: 800, color: "#4ade80", fontFamily: "'JetBrains Mono',monospace" }}>
            {PROVIDERS[cheapest.key].name} — ${cheapest.total}/mo
          </p>
        </div>
      </div>

      {/* Provider grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {(Object.keys(PROVIDERS) as ProviderKey[]).map(k => (
          <ProviderCard key={k} pKey={k} tier={tier} services={services}
            hasCache={hasCache} hasSearch={hasSearch} egressGB={egressGB}
            selected={selected === k} onSelect={() => setSelected(k)} />
        ))}
      </div>

      {/* Selected detail */}
      <div style={{ padding: "16px 18px", borderRadius: 12, border: `1px solid ${PROVIDERS[selected].color}33`, background: `${PROVIDERS[selected].color}08` }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#6b7280", marginBottom: 10, fontFamily: "'JetBrains Mono',monospace" }}>
          {PROVIDERS[selected].name.toUpperCase()} — COST BREAKDOWN AT {TIER_LABELS[tier].toUpperCase()}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {[
            { label: "Compute", val: selectedCost.compute, icon: Server   },
            { label: "Database", val: selectedCost.postgres, icon: Database },
            { label: "Cache",   val: selectedCost.redis,   icon: Zap      },
            { label: "Total",   val: selectedCost.total,   icon: DollarSign, highlight: true },
          ].map(item => (
            <div key={item.label} style={{ padding: "12px", borderRadius: 9, background: item.highlight ? `${PROVIDERS[selected].color}18` : "rgba(255,255,255,0.03)", border: `1px solid ${item.highlight ? PROVIDERS[selected].color + "44" : "rgba(255,255,255,0.06)"}` }}>
              <item.icon size={11} style={{ color: item.highlight ? PROVIDERS[selected].color : "#6b7280", marginBottom: 6 }} />
              <p style={{ fontSize: 18, fontWeight: 800, color: item.highlight ? PROVIDERS[selected].color : "#e5e7eb", fontFamily: "'JetBrains Mono',monospace", lineHeight: 1, marginBottom: 3 }}>${item.val}</p>
              <p style={{ fontSize: 10, color: "#6b7280" }}>{item.label}/mo</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.6 }}>
            💡 At {req.user_scale?.target?.toLocaleString()} users with {services} services{hasCache ? ", Redis cache" : ""}{hasSearch ? ", search engine" : ""}. Prices are estimates — actual costs vary with traffic patterns and data size.
          </p>
        </div>
      </div>
    </div>
  );
}
