"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitCompare, Loader2, Check, X, ChevronRight } from "lucide-react";
import type { GenResult } from "@/lib/api/client";
import { generateSync } from "@/lib/api/client";

interface P { result: GenResult; }

const COMPARE_VARIANTS = [
  { label: "Microservices", suffix: "Rewrite the requirements to suggest a microservices architecture with separate services for each domain." },
  { label: "Serverless",    suffix: "Rewrite the requirements to suggest a serverless architecture using cloud functions and managed services." },
  { label: "Monolith",      suffix: "Rewrite the requirements to suggest a simple modular monolith architecture for a small team." },
  { label: "Event-Driven",  suffix: "Rewrite the requirements to suggest an event-driven architecture with message queues and async processing." },
];

function ScoreBadge({ val, label, color }: { val: string; label: string; color: string }) {
  return (
    <div style={{ textAlign: "center", padding: "10px 8px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
      <p style={{ fontSize: 17, fontWeight: 800, color, marginBottom: 2, fontFamily: "'JetBrains Mono',monospace" }}>{val}</p>
      <p style={{ fontSize: 9, color: "#6b7280", lineHeight: 1.3 }}>{label}</p>
    </div>
  );
}

function ArchCard({ result, label, isOriginal }: { result: GenResult; label: string; isOriginal?: boolean }) {
  const bp = result.blueprint;
  const req = result.requirements;
  const userStr = req.user_scale?.target >= 1e3 ? `${Math.round(req.user_scale.target/1e3)}k` : String(req.user_scale?.target || "—");

  const scores = [
    { val: `$${bp.cost_estimate?.monthly_usd_low || "?"}`, label: "MIN/MO",    color: "#4ade80" },
    { val: `${bp.services?.length || 1}`,                  label: "SERVICES",  color: "#4d9ef7" },
    { val: `${req.latency_sla_ms || 200}ms`,               label: "LATENCY",   color: "#a78bfa" },
    { val: userStr,                                        label: "USERS",     color: "#fbbf24" },
  ];

  return (
    <div style={{ flex: 1, borderRadius: 14, border: `1px solid ${isOriginal ? "rgba(77,158,247,0.25)" : "rgba(255,255,255,0.08)"}`, overflow: "hidden", background: "#070707" }}>
      {/* Header */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: isOriginal ? "rgba(77,158,247,0.06)" : "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", gap: 8 }}>
        {isOriginal && <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 99, background: "rgba(77,158,247,0.15)", border: "1px solid rgba(77,158,247,0.25)", color: "#4d9ef7", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>CURRENT</span>}
        <p style={{ fontSize: 14, fontWeight: 800, color: "#fff", textTransform: "capitalize" }}>
          {bp.architecture_pattern?.replace(/_/g," ")} {label}
        </p>
      </div>

      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Scores */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
          {scores.map(s => <ScoreBadge key={s.label} {...s} />)}
        </div>

        {/* Stack */}
        <div>
          <p style={{ fontSize: 10, color: "#6b7280", fontFamily: "'JetBrains Mono',monospace", marginBottom: 6 }}>STACK</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {[bp.primary_db, bp.cache, bp.search_engine, bp.message_bus, bp.realtime_transport]
              .filter(Boolean).map(t => (
              <span key={t} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#9ca3af", fontFamily: "'JetBrains Mono',monospace" }}>{t}</span>
            ))}
          </div>
        </div>

        {/* Services */}
        {bp.services?.length > 0 && (
          <div>
            <p style={{ fontSize: 10, color: "#6b7280", fontFamily: "'JetBrains Mono',monospace", marginBottom: 6 }}>SERVICES</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {bp.services.slice(0, 4).map(s => (
                <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <ChevronRight size={10} style={{ color: "#374151", flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "#d1d5db", textTransform: "capitalize" }}>{s.name.replace(/_/g," ")}</span>
                  <span style={{ fontSize: 10, color: "#6b7280", marginLeft: "auto" }}>{s.tech_stack?.[0]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trade-offs */}
        {bp.trade_offs?.length > 0 && (
          <div>
            <p style={{ fontSize: 10, color: "#6b7280", fontFamily: "'JetBrains Mono',monospace", marginBottom: 6 }}>TRADE-OFFS</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {bp.trade_offs[0]?.pros?.slice(0,2).map(p => (
                <div key={p} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                  <Check size={10} style={{ color: "#4ade80", marginTop: 2, flexShrink: 0 }} />
                  <p style={{ fontSize: 11, color: "#d1d5db", lineHeight: 1.4 }}>{p}</p>
                </div>
              ))}
              {bp.trade_offs[0]?.cons?.slice(0,2).map(c => (
                <div key={c} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                  <X size={10} style={{ color: "#f87171", marginTop: 2, flexShrink: 0 }} />
                  <p style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.4 }}>{c}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Applied rules */}
        <div style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <p style={{ fontSize: 10, color: "#374151", lineHeight: 1.5 }}>
            {bp.applied_rules?.slice(0, 2).join(" · ") || "Standard configuration"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CompareArchitectures({ result }: P) {
  const [comparing, setComparing] = useState<GenResult | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [selected, setSelected]   = useState<typeof COMPARE_VARIANTS[0] | null>(null);

  const handleCompare = async (variant: typeof COMPARE_VARIANTS[0]) => {
    setLoading(true); setError(""); setSelected(variant); setComparing(null);
    try {
      // Build a modified input that pushes toward the chosen pattern
      const baseInput = `${variant.suffix} Original requirements context: target ${result.requirements.user_scale?.target?.toLocaleString()} users, features: ${result.requirements.features?.join(", ") || "core CRUD"}, budget: ${result.requirements.budget_tier || "startup"}, team size: ${result.requirements.team_size || 3}.`;
      const alt = await generateSync(baseInput);
      setComparing(alt);
    } catch (e: any) {
      setError("Failed to generate comparison. Check backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Variant picker */}
      <div style={{ padding: "16px 18px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#6b7280", marginBottom: 12, fontFamily: "'JetBrains Mono',monospace" }}>
          COMPARE AGAINST
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          {COMPARE_VARIANTS.map(v => (
            <button key={v.label} onClick={() => handleCompare(v)} disabled={loading}
              style={{
                padding: "10px 8px", borderRadius: 9, cursor: loading ? "not-allowed" : "pointer",
                fontSize: 12, fontWeight: 600, transition: "all 0.15s",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                background: selected?.label === v.label ? "rgba(77,158,247,0.12)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${selected?.label === v.label ? "rgba(77,158,247,0.3)" : "rgba(255,255,255,0.07)"}`,
                color: selected?.label === v.label ? "#4d9ef7" : "#9ca3af",
              }}>
              <GitCompare size={14} />
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "30px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
            <Loader2 size={16} style={{ color: "#4d9ef7", animation: "spin 1s linear infinite" }} />
            <p style={{ fontSize: 13, color: "#9ca3af" }}>Generating {selected?.label} alternative…</p>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p style={{ fontSize: 12, color: "#f87171", textAlign: "center" }}>{error}</p>}

      {/* Side by side */}
      {comparing && !loading && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
          <ArchCard result={result}    label=""              isOriginal />
          <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            <div style={{ fontSize: 18, color: "#374151" }}>vs</div>
          </div>
          <ArchCard result={comparing} label={`(${selected?.label})`} />
        </motion.div>
      )}

      {!comparing && !loading && (
        <div style={{ textAlign: "center", padding: "32px", color: "#374151", fontSize: 12 }}>
          Select an architecture pattern above to generate a comparison
        </div>
      )}

      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
