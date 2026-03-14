"use client";
import { motion } from "framer-motion";
import { CheckCircle, Circle, ChevronRight, Check, Save, Share2 } from "lucide-react";
import { useState, useEffect } from "react";
import type { GenResult } from "@/lib/api/client";

// ── Security Panel ─────────────────────────────────────────────────────────
export function SecurityPanel({ result }: { result: GenResult }) {
  const { blueprint: bp, requirements: req } = result;
  const hasAuth    = req.features?.some(f => f.includes("auth"));
  const hasPayment = req.features?.some(f => f.includes("payment") || f.includes("billing"));
  const hasHIPAA   = req.compliance?.some(c => c.toLowerCase().includes("hipaa"));
  const hasGDPR    = req.compliance?.some(c => c.toLowerCase().includes("gdpr"));
  const isMicro    = bp.architecture_pattern === "microservices";

  const checks = [
    { cat: "Auth & Identity", items: [
      { label: "JWT / session auth",        done: hasAuth,  note: "Stateless auth with refresh tokens" },
      { label: "OAuth2 / SSO",              done: hasAuth,  note: "Google, GitHub, SAML providers" },
      { label: "MFA / 2FA",                 done: false,    note: "TOTP or SMS verification" },
      { label: "Role-based access control", done: hasAuth,  note: "RBAC for multi-tenant apps" },
    ]},
    { cat: "Data Security", items: [
      { label: "Encryption at rest",   done: true,                  note: "PostgreSQL / cloud provider default" },
      { label: "Encryption in transit",done: true,                  note: "TLS 1.3 everywhere" },
      { label: "Secrets management",   done: false,                 note: "Vault, AWS Secrets Manager, or env vars" },
      { label: "Database backups",     done: hasGDPR || hasHIPAA,  note: "Automated daily backups" },
    ]},
    { cat: "Network", items: [
      { label: "Rate limiting",    done: true,     note: "API gateway layer" },
      { label: "DDoS protection",  done: false,    note: "Cloudflare or AWS Shield" },
      { label: "WAF",              done: false,    note: "OWASP top 10 protection" },
      { label: "Private VPC",      done: isMicro,  note: "Services not exposed publicly" },
    ]},
    { cat: "Compliance", items: [
      { label: "GDPR data deletion", done: hasGDPR,    note: "Right to erasure endpoint" },
      { label: "Audit logging",      done: hasHIPAA || hasGDPR, note: "All data access logged" },
      { label: "HIPAA safeguards",   done: hasHIPAA,   note: "PHI encryption + BAA required" },
      { label: "PCI compliance",     done: hasPayment, note: "Use Stripe — never store card data" },
    ]},
  ];

  const totalDone = checks.flatMap(c => c.items).filter(i => i.done).length;
  const total     = checks.flatMap(c => c.items).length;
  const pct       = Math.round((totalDone / total) * 100);
  const healthColor = pct >= 70 ? "#4ade80" : pct >= 50 ? "#fbbf24" : "#f87171";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ padding: "20px", borderRadius: 12, background: `${healthColor}0a`, border: `1px solid ${healthColor}33`, display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: `${healthColor}15`, border: `2px solid ${healthColor}`, fontSize: 20, fontWeight: 800, color: healthColor, flexShrink: 0 }}>
          {pct}%
        </div>
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Security Score: {pct >= 70 ? "Good" : pct >= 50 ? "Fair" : "Needs Work"}</p>
          <p style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.5 }}>{totalDone}/{total} checks passed · {total - totalDone} recommendations remaining</p>
        </div>
      </div>
      {checks.map(cat => (
        <div key={cat.cat} style={{ padding: "16px 18px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#6b7280", marginBottom: 12, fontFamily: "'JetBrains Mono',monospace" }}>{cat.cat.toUpperCase()}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {cat.items.map(item => (
              <div key={item.label} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ marginTop: 1, flexShrink: 0 }}>
                  {item.done ? <CheckCircle size={14} style={{ color: "#4ade80" }} /> : <Circle size={14} style={{ color: "#374151" }} />}
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: item.done ? "#e5e7eb" : "#9ca3af", marginBottom: 1 }}>{item.label}</p>
                  <p style={{ fontSize: 11, color: "#6b7280" }}>{item.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default SecurityPanel;

// ── Roadmap Panel ──────────────────────────────────────────────────────────
export function RoadmapPanel({ result }: { result: GenResult }) {
  const { blueprint: bp, requirements: req } = result;
  const hasAuth    = req.features?.some(f => f.includes("auth"));
  const hasPayment = req.features?.some(f => f.includes("payment") || f.includes("billing"));

  const phases = [
    { phase: "Week 1–2", label: "Foundation", color: "#4d9ef7", emoji: "🏗️", tasks: [
      "Set up repo + CI/CD pipeline (GitHub Actions)",
      "Provision cloud infra (Railway / Render / Fly.io)",
      "Set up PostgreSQL + Redis",
      hasAuth ? "Implement auth (JWT + refresh tokens)" : "Set up basic API structure",
      "Deploy skeleton API with health check",
      "Set up staging environment",
    ]},
    { phase: "Month 1", label: "Core Features", color: "#a78bfa", emoji: "⚙️", tasks: [
      ...((req.features || []).slice(0, 3).map(f => `Implement ${f.replace(/_/g," ")}`)),
      hasPayment ? "Integrate Stripe + webhooks" : "Build core data models",
      "Add input validation + error handling",
      "Write integration tests for critical paths",
    ].slice(0, 6)},
    { phase: "Month 2–3", label: "Scale & Polish", color: "#4ade80", emoji: "🚀", tasks: [
      bp.search_engine ? `Set up ${bp.search_engine} for search` : "Add basic search",
      bp.realtime_transport ? `Implement ${bp.realtime_transport}` : "Add email notifications",
      "Add Redis caching for hot endpoints",
      "Implement rate limiting + abuse prevention",
      "Performance testing + optimization",
      "Set up analytics (PostHog / Mixpanel)",
    ]},
    { phase: "Month 4–6", label: "Growth", color: "#fbbf24", emoji: "📈", tasks: [
      "Add DB read replica as traffic grows",
      "Implement background job queue",
      req.compliance?.length ? `Complete ${req.compliance.join(", ")} compliance` : "Security audit",
      "Add admin dashboard",
      "Multi-region deployment if needed",
      "Consider service extraction as team grows",
    ]},
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {phases.map((ph, i) => (
        <motion.div key={ph.phase} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
          style={{ display: "flex", gap: 16, padding: "16px 18px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ flexShrink: 0, width: 80, textAlign: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, background: `${ph.color}15`, border: `1px solid ${ph.color}33` }}>{ph.emoji}</div>
            <p style={{ fontSize: 9, fontWeight: 700, color: ph.color, fontFamily: "'JetBrains Mono',monospace" }}>{ph.phase}</p>
            <p style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>{ph.label}</p>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
            {ph.tasks.map((task, j) => (
              <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <ChevronRight size={11} style={{ color: ph.color, marginTop: 2, flexShrink: 0 }} />
                <p style={{ fontSize: 12, color: "#d1d5db", lineHeight: 1.5 }}>{task}</p>
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Save/Share Panel ───────────────────────────────────────────────────────
export function SaveSharePanel({ result }: { result: GenResult }) {
  const [saved,  setSaved]  = useState(false);
  const [shared, setShared] = useState(false);
  const [saves, setSaves]   = useState<{ id: string; name: string; date: string }[]>([]);

  useEffect(() => {
    try { const s = localStorage.getItem("scaff_saves"); if (s) setSaves(JSON.parse(s)); } catch {}
  }, []);

  const handleSave = () => {
    const id   = Date.now().toString();
    const name = `${result.blueprint.architecture_pattern?.replace(/_/g," ")} — ${new Date().toLocaleDateString()}`;
    const entry = { id, name, date: new Date().toISOString() };
    const next = [entry, ...saves.slice(0,9)];
    try {
      localStorage.setItem("scaff_saves", JSON.stringify(next));
      localStorage.setItem(`scaff_result_${id}`, JSON.stringify(result));
      setSaves(next); setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch {}
  };

  const handleShare = () => {
    try {
      const compressed = btoa(encodeURIComponent(JSON.stringify({ bp: result.blueprint.architecture_pattern, db: result.blueprint.primary_db })));
      navigator.clipboard.writeText(`${window.location.origin}?share=${compressed}`);
      setShared(true); setTimeout(() => setShared(false), 2000);
    } catch {}
  };

  const handleDelete = (id: string) => {
    const next = saves.filter(s => s.id !== id);
    setSaves(next);
    try { localStorage.setItem("scaff_saves", JSON.stringify(next)); localStorage.removeItem(`scaff_result_${id}`); } catch {}
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { label: "Save Blueprint", sub: "Store in browser", icon: Save,   active: saved,  color: "#4d9ef7", activeColor: "#4ade80", onClick: handleSave,  activeLabel: "Saved!" },
          { label: "Share Link",     sub: "Copy shareable URL", icon: Share2, active: shared, color: "#a78bfa", activeColor: "#4ade80", onClick: handleShare, activeLabel: "Copied!" },
        ].map(b => (
          <button key={b.label} onClick={b.onClick}
            style={{ padding: "16px", borderRadius: 12, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transition: "all 0.2s",
              background: b.active ? "rgba(74,222,128,0.08)" : `${b.color}0a`,
              border: `1px solid ${b.active ? "rgba(74,222,128,0.25)" : `${b.color}33`}`,
              color: b.active ? "#4ade80" : b.color,
            }}>
            {b.active ? <Check size={22}/> : <b.icon size={22}/>}
            <span style={{ fontSize: 13, fontWeight: 600 }}>{b.active ? b.activeLabel : b.label}</span>
            <span style={{ fontSize: 11, color: "#6b7280" }}>{b.sub}</span>
          </button>
        ))}
      </div>
      <div style={{ padding: "16px 18px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#6b7280", marginBottom: 12, fontFamily: "'JetBrains Mono',monospace" }}>SAVED BLUEPRINTS ({saves.length})</p>
        {saves.length === 0
          ? <p style={{ fontSize: 12, color: "#374151", textAlign: "center", padding: "20px 0" }}>No saved blueprints yet.</p>
          : <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {saves.map(s => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#e5e7eb" }}>{s.name}</p>
                    <p style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>{new Date(s.date).toLocaleString()}</p>
                  </div>
                  <button onClick={() => handleDelete(s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#374151", fontSize: 18, padding: "4px 8px", borderRadius: 6 }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#374151")}>×</button>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  );
}
