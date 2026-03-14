"use client";
import { motion } from "framer-motion";
import { Activity, Clock, TrendingUp, AlertTriangle, Zap, BookOpen } from "lucide-react";
import type { GenResult } from "@/lib/api/client";

export default function MetricsPanel({ result }: { result: GenResult }) {
  const { blueprint: bp, requirements: req } = result;
  const users = req.user_scale?.target || 1000;
  const p99 = bp.cache ? req.latency_sla_ms * 0.8 : req.latency_sla_ms * 1.2;
  const uptime = req.availability_sla_percent || 99.5;
  const errorBudget = ((100 - uptime) / 100 * 30 * 24 * 60).toFixed(0);
  const rps = Math.round(users / 10);

  const metrics = [
    { label: "Est. RPS at peak",    val: `${rps.toLocaleString()}`,      sub: "requests/second",     color: "#4d9ef7", icon: Activity   },
    { label: "p99 Latency target",  val: `${Math.round(p99)}ms`,         sub: "incl. DB + cache",    color: "#a78bfa", icon: Clock      },
    { label: "Availability SLA",    val: `${uptime}%`,                   sub: `${errorBudget}min/mo`, color: "#4ade80", icon: TrendingUp },
    { label: "Error budget",        val: `${errorBudget}min`,            sub: "per month",           color: "#fbbf24", icon: AlertTriangle },
    { label: "Services",            val: `${bp.services?.length || 2}`,  sub: "independent units",   color: "#fb923c", icon: Zap        },
    { label: "Data stores",         val: `${bp.data_stores?.length || 1}`, sub: "persistence layers", color: "#f87171", icon: BookOpen   },
  ];

  const perf = [
    { label: "Cache hit rate",    val: bp.cache ? "~85%" : "N/A",      good: !!bp.cache },
    { label: "DB pool",           val: bp.architecture_pattern === "microservices" ? "PgBouncer" : "Direct", good: true },
    { label: "CDN for static",    val: req.features?.includes("file_storage") ? "Recommended" : "Optional", good: true },
    { label: "Rate limiting",     val: "API Gateway",                  good: true },
    { label: "Async jobs",        val: bp.message_bus ? "✓ Queue" : "In-process", good: !!bp.message_bus },
    { label: "Search",            val: bp.search_engine ? `✓ ${bp.search_engine}` : "DB Full-text", good: !!bp.search_engine },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {metrics.map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            style={{ padding: "16px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <m.icon size={13} style={{ color: m.color, marginBottom: 8 }} />
            <p style={{ fontSize: 22, fontWeight: 800, color: m.color, lineHeight: 1, marginBottom: 4 }}>{m.val}</p>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#e5e7eb", marginBottom: 2 }}>{m.label}</p>
            <p style={{ fontSize: 10, color: "#6b7280" }}>{m.sub}</p>
          </motion.div>
        ))}
      </div>
      <div style={{ padding: "18px 20px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#6b7280", marginBottom: 14, fontFamily: "'JetBrains Mono',monospace" }}>PERFORMANCE PROFILE</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {perf.map(p => (
            <div key={p.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>{p.label}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: p.good ? "#4ade80" : "#6b7280", fontFamily: "'JetBrains Mono',monospace" }}>{p.val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
