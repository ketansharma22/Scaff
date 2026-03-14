"use client";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, AlertTriangle, CheckCircle, Zap, Database, Server } from "lucide-react";
import type { GenResult } from "@/lib/api/client";

interface P { result: GenResult; }

function computeRecommendations(
  users: number, rpsMultiplier: number, dataGB: number,
  realtimeEnabled: boolean, globalDeployment: boolean,
  result: GenResult,
) {
  const bp = result.blueprint;
  const warnings: { level: "info" | "warn" | "critical"; msg: string; action: string }[] = [];
  const changes: string[] = [];
  let monthlyCost = bp.cost_estimate?.monthly_usd_low || 20;

  // User scale thresholds
  if (users > 100_000) {
    warnings.push({ level: "critical", msg: "Single-region DB will become a bottleneck", action: "Add PostgreSQL read replicas + PgBouncer connection pooler" });
    if (bp.architecture_pattern !== "microservices") {
      warnings.push({ level: "warn", msg: "Modular monolith at 100k+ users risks deploy contention", action: "Extract high-traffic services (auth, search) into separate deployments" });
    }
    changes.push("Horizontal pod autoscaling (HPA) required");
    changes.push("CDN mandatory for static assets");
    monthlyCost += 200;
  } else if (users > 10_000) {
    warnings.push({ level: "warn", msg: "Database connection pool may saturate", action: "Add PgBouncer or use Supabase connection pooling mode" });
    changes.push("Add Redis caching for hot read paths");
    monthlyCost += 60;
  } else if (users > 1_000) {
    warnings.push({ level: "info", msg: "Architecture looks well-sized for this scale", action: "Monitor p95 latency; scale when it exceeds 300ms" });
    monthlyCost += 15;
  }

  // RPS
  const estimatedRPS = Math.round((users / 10) * rpsMultiplier);
  if (estimatedRPS > 5000) {
    warnings.push({ level: "critical", msg: `${estimatedRPS.toLocaleString()} RPS requires load balancer tuning`, action: "Enable HTTP/2, keep-alive, and upstream connection pooling in Nginx/Traefik" });
    changes.push("Rate limiting per user/IP at gateway layer");
  } else if (estimatedRPS > 500) {
    warnings.push({ level: "warn", msg: `${estimatedRPS.toLocaleString()} RPS — watch DB query times`, action: "Add query result caching with Redis (TTL 30–300s for read-heavy endpoints)" });
  }

  // Data size
  if (dataGB > 500) {
    warnings.push({ level: "critical", msg: `${dataGB}GB data size — storage costs will dominate`, action: "Implement data archival policy, use S3/GCS for blobs, partition large tables" });
    changes.push("S3/GCS object storage for files");
    changes.push("PostgreSQL table partitioning");
    monthlyCost += Math.round(dataGB * 0.1);
  } else if (dataGB > 100) {
    warnings.push({ level: "warn", msg: `${dataGB}GB — consider separate storage for large objects`, action: "Move file storage to S3-compatible (Cloudflare R2 is free for egress)" });
    monthlyCost += 20;
  }

  // Realtime
  if (realtimeEnabled && !bp.realtime_transport) {
    warnings.push({ level: "warn", msg: "Realtime enabled but no realtime transport in architecture", action: "Add WebSocket support (Socket.io) or use Supabase Realtime (free tier)" });
    changes.push("WebSocket server or Supabase Realtime");
    monthlyCost += 15;
  }

  // Global
  if (globalDeployment) {
    warnings.push({ level: "warn", msg: "Global deployment adds significant complexity", action: "Use Cloudflare for DNS + CDN first. Add regional DB only when latency complaints arise." });
    changes.push("Cloudflare CDN + DNS");
    changes.push("Multi-region considered at 50k+ global users");
    monthlyCost += 100;
  }

  return { warnings, changes, estimatedRPS, monthlyCost: Math.round(monthlyCost) };
}

const LEVEL_STYLE = {
  info:     { bg: "rgba(77,158,247,0.07)",  border: "rgba(77,158,247,0.2)",  text: "#4d9ef7",  icon: CheckCircle   },
  warn:     { bg: "rgba(251,191,36,0.07)",  border: "rgba(251,191,36,0.2)",  text: "#fbbf24",  icon: AlertTriangle },
  critical: { bg: "rgba(248,113,113,0.07)", border: "rgba(248,113,113,0.2)", text: "#f87171",  icon: Zap           },
};

function Slider({ label, value, min, max, step, format, onChange, color = "#4d9ef7" }: {
  label: string; value: number; min: number; max: number; step: number;
  format: (v: number) => string; onChange: (v: number) => void; color?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: "#9ca3af" }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: "'JetBrains Mono',monospace" }}>{format(value)}</span>
      </div>
      <div style={{ position: "relative", height: 6, borderRadius: 99, background: "rgba(255,255,255,0.07)", cursor: "pointer" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, borderRadius: 99, background: color, boxShadow: `0 0 8px ${color}66`, transition: "width 0.1s" }} />
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", margin: 0 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 9, color: "#374151", fontFamily: "'JetBrains Mono',monospace" }}>{format(min)}</span>
        <span style={{ fontSize: 9, color: "#374151", fontFamily: "'JetBrains Mono',monospace" }}>{format(max)}</span>
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "10px 14px", borderRadius: 9, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer" }}>
      <span style={{ fontSize: 12, color: "#d1d5db" }}>{label}</span>
      <div style={{ width: 36, height: 20, borderRadius: 99, transition: "all 0.2s", background: value ? "#4d9ef7" : "rgba(255,255,255,0.1)", position: "relative", flexShrink: 0 }}>
        <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: value ? 19 : 3, transition: "left 0.2s" }} />
      </div>
    </button>
  );
}

export default function WhatIfSimulator({ result }: P) {
  const baseUsers = result.requirements.user_scale?.target || 1000;
  const baseData  = result.requirements.data_characteristics?.estimated_db_size_gb || 10;

  const [users,    setUsers]    = useState(baseUsers);
  const [rpsMulti, setRpsMulti] = useState(1);
  const [dataGB,   setDataGB]   = useState(baseData);
  const [realtime, setRealtime] = useState(!!result.blueprint.realtime_transport);
  const [global,   setGlobal]   = useState(false);

  const { warnings, changes, estimatedRPS, monthlyCost } = useMemo(
    () => computeRecommendations(users, rpsMulti, dataGB, realtime, global, result),
    [users, rpsMulti, dataGB, realtime, global, result]
  );

  const formatUsers = (v: number) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v/1e3)}k` : String(v);
  const formatRPS   = (v: number) => `${v}×`;
  const formatGB    = (v: number) => `${v}GB`;

  const criticals = warnings.filter(w => w.level === "critical").length;
  const health = criticals > 1 ? "critical" : criticals === 1 ? "warning" : "healthy";
  const healthColor = { healthy: "#4ade80", warning: "#fbbf24", critical: "#f87171" }[health];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 14, alignItems: "start" }}>
      {/* Left: Sliders */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ padding: "18px 20px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", display: "flex", flexDirection: "column", gap: 18 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#6b7280", fontFamily: "'JetBrains Mono',monospace" }}>ADJUST PARAMETERS</p>
          <Slider label="Target Users"    value={users}    min={100}   max={1_000_000} step={100}  format={formatUsers} onChange={setUsers}    color="#4d9ef7" />
          <Slider label="Traffic Spike"   value={rpsMulti} min={1}     max={20}        step={0.5}  format={formatRPS}   onChange={setRpsMulti} color="#a78bfa" />
          <Slider label="Database Size"   value={dataGB}   min={1}     max={1000}      step={1}    format={formatGB}    onChange={setDataGB}   color="#fbbf24" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Toggle label="Realtime features (WebSocket)" value={realtime} onChange={setRealtime} />
            <Toggle label="Global multi-region deployment" value={global}   onChange={setGlobal}   />
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { label: "Est. Peak RPS",   val: estimatedRPS.toLocaleString(), color: "#4d9ef7", icon: Zap      },
            { label: "Est. Monthly",    val: `$${monthlyCost}`,             color: "#4ade80", icon: TrendingUp },
            { label: "Users",           val: formatUsers(users),            color: "#a78bfa", icon: Server   },
            { label: "Data",            val: formatGB(dataGB),              color: "#fbbf24", icon: Database },
          ].map(s => (
            <div key={s.label} style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
              <s.icon size={11} style={{ color: s.color, marginBottom: 6 }} />
              <p style={{ fontSize: 17, fontWeight: 800, color: s.color, lineHeight: 1, marginBottom: 3, fontFamily: "'JetBrains Mono',monospace" }}>{s.val}</p>
              <p style={{ fontSize: 10, color: "#6b7280" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Results */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Health badge */}
        <motion.div key={health} initial={{ scale: 0.97 }} animate={{ scale: 1 }}
          style={{
            padding: "14px 18px", borderRadius: 12, display: "flex", alignItems: "center", gap: 12,
            background: `${healthColor}0d`, border: `1px solid ${healthColor}33`,
          }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: healthColor, boxShadow: `0 0 10px ${healthColor}`, flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", textTransform: "capitalize" }}>Architecture {health}</p>
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
              {warnings.length === 0 ? "No issues found for this configuration" : `${warnings.length} recommendation${warnings.length > 1 ? "s" : ""} for this scale`}
            </p>
          </div>
        </motion.div>

        {/* Warnings */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <AnimatePresence>
            {warnings.map((w, i) => {
              const s = LEVEL_STYLE[w.level];
              return (
                <motion.div key={w.msg} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.04 }}
                  style={{ padding: "12px 14px", borderRadius: 10, background: s.bg, border: `1px solid ${s.border}` }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <s.icon size={13} style={{ color: s.text, marginTop: 1, flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "#fff", marginBottom: 4 }}>{w.msg}</p>
                      <p style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.5 }}>→ {w.action}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Changes needed */}
        {changes.length > 0 && (
          <div style={{ padding: "14px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#6b7280", marginBottom: 10, fontFamily: "'JetBrains Mono',monospace" }}>CHANGES NEEDED</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {changes.map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#4d9ef7", flexShrink: 0 }} />
                  <p style={{ fontSize: 12, color: "#d1d5db" }}>{c}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
