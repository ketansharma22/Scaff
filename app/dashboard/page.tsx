"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid, GitBranch, ArrowLeft, Copy, Download, Check,
  Activity, Shield, Map, Save, Code2, Sliders,
  MessageCircle, GitCompare, Vote, Mail,
  DollarSign, Layers, Github, FileText, Users,
} from "lucide-react";
import { useStore } from "@/lib/store/appStore";
import type { GenResult } from "@/lib/api/client";
import Header from "@/components/layout/Header";
import BlueprintViewer from "@/components/blueprint/BlueprintViewer";
import DiagramCanvas from "@/components/diagram/DiagramCanvas";
import ExtraFeatures, { EXTRA_TABS, type ExtraTab } from "@/components/features/ExtraFeatures";

type Tab = "blueprint" | "diagram" | ExtraTab;

const PRIMARY_TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: "blueprint", label: "Blueprint", Icon: LayoutGrid },
  { id: "diagram", label: "Diagram", Icon: GitBranch },
];

const GROUPS = ["Understand", "Build", "Team", "Export"] as const;
type Group = typeof GROUPS[number];

const GROUP_COLOR: Record<Group, string> = {
  Understand: "#4d9ef7",
  Build: "#a78bfa",
  Team: "#4ade80",
  Export: "#fbbf24",
};

function buildMarkdown(r: GenResult | null): string {
  if (!r) return "";
  const { blueprint: bp, requirements: req } = r;
  return [
    `# Architecture Blueprint — ${bp.architecture_pattern?.replace(/_/g, " ")}`, "",
    `**Pattern:** ${bp.architecture_pattern?.replace(/_/g, " ")}`,
    `**Deployment:** ${bp.deployment_model?.replace(/_/g, " ")}`,
    `**Target Users:** ${req.user_scale?.target?.toLocaleString()}`,
    `**Availability:** ${req.availability_sla_percent}%`, "",
    "## Stack",
    `- DB: ${bp.primary_db || "—"}`,
    bp.cache ? `- Cache: ${bp.cache}` : "",
    bp.search_engine ? `- Search: ${bp.search_engine}` : "",
    bp.message_bus ? `- Queue: ${bp.message_bus}` : "",
    bp.services?.length ? [
      "", "## Services", "",
      ...bp.services.map(s => `### ${s.name}\n${s.responsibility || ""}\n**Stack:** ${s.tech_stack?.join(", ")}`),
    ].join("\n") : "",
    bp.trade_offs?.length ? [
      "", "## Trade-offs", "",
      ...bp.trade_offs.map(t => `### ${t.decision}\n**Pros:** ${t.pros?.join("; ")}\n**Cons:** ${t.cons?.join("; ")}`),
    ].join("\n") : "",
    bp.cost_estimate ? `\n## Cost\nMonthly: $${bp.cost_estimate.monthly_usd_low}–$${bp.cost_estimate.monthly_usd_high}` : "",
  ].filter(Boolean).join("\n");
}

export default function DashboardPage() {
  const router = useRouter();
  const { result, stage, setResult } = useStore();
  const [tab, setTab] = useState<Tab>("blueprint");
  const [copied, setCopied] = useState(false);
  const [dlSaved, setDlSaved] = useState(false);
  const [saves, setSaves] = useState<{ id: string; name: string; date: string }[]>([]);

  useEffect(() => {
    if (!result && stage === "idle") {
      try { const s = localStorage.getItem("scaff_saves"); if (s) setSaves(JSON.parse(s)); } catch { }
    }
  }, [result, stage]);

  const loadSave = (id: string) => {
    try {
      const data = localStorage.getItem(`scaff_result_${id}`);
      if (data) setResult(JSON.parse(data));
    } catch { }
  };

  const deleteSave = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = saves.filter(s => s.id !== id);
    setSaves(next);
    try { localStorage.setItem("scaff_saves", JSON.stringify(next)); localStorage.removeItem(`scaff_result_${id}`); } catch { }
  };

  if (!result) {
    if (stage === "idle") {
      return (
        <div className="min-h-screen">
          <Header />
          <div style={{ maxWidth: 640, margin: "60px auto", padding: "0 20px" }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 8, letterSpacing: "-0.02em" }}>Your Dashboard</h2>
            <p style={{ fontSize: 14, color: "#9ca3af", marginBottom: 32 }}>Load a saved architecture or generate a new one.</p>

            {saves.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16 }}>
                <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 16 }}>No saved blueprints found.</p>
                <button onClick={() => router.push("/")} style={{ background: "rgba(77,158,247,0.1)", color: "#4d9ef7", border: "1px solid rgba(77,158,247,0.25)", padding: "10px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(77,158,247,0.15)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(77,158,247,0.1)"; }}>Generate Blueprint</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {saves.map(s => (
                  <div key={s.id} onClick={() => loadSave(s.id)} style={{ padding: "16px 20px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; }}>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 600, color: "#e5e7eb", marginBottom: 4 }}>{s.name}</p>
                      <p style={{ fontSize: 12, color: "#6b7280" }}>{new Date(s.date).toLocaleString()}</p>
                    </div>
                    <button onClick={(e) => deleteSave(s.id, e)} style={{ background: "none", border: "none", color: "#6b7280", fontSize: 20, cursor: "pointer", padding: "4px 8px", borderRadius: 6, transition: "color 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#f87171"} onMouseLeave={e => e.currentTarget.style.color = "#6b7280"}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "rgba(255,255,255,0.8)", animation: "spin 0.9s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ fontSize: 13, color: "var(--t3)", fontFamily: "var(--font-mono)" }}>Loading…</p>
        </div>
        <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const { blueprint: bp, requirements: req } = result;
  const userStr = (req.user_scale?.target || 0) >= 1e6
    ? `${((req.user_scale?.target || 0) / 1e6).toFixed(1)}M`
    : (req.user_scale?.target || 0) >= 1e3
      ? `${Math.round((req.user_scale?.target || 0) / 1e3)}k`
      : String(req.user_scale?.target || 0);

  return (
    <div className="min-h-screen">
      <Header />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px 80px" }}>

        {/* Top bar */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "20px 0 16px", flexWrap: "wrap", gap: 14 }}>
          <div>
            <button onClick={() => router.push("/")}
              style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--t4)", fontFamily: "var(--font-mono)", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 6 }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--t2)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--t4)")}>
              <ArrowLeft size={11} /> New
            </button>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 4 }}>
              {bp.architecture_pattern?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
            </h1>
            <p style={{ fontSize: 11, color: "var(--t3)", fontFamily: "var(--font-mono)" }}>
              {userStr} users · {bp.services?.length || 0} services · {bp.data_stores?.length || 0} stores · {bp.enhancement_method === "llm_enhanced" ? "AI enhanced" : "rule engine"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-ghost"
              onClick={() => { navigator.clipboard.writeText(JSON.stringify(result, null, 2)); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              style={{ height: 34 }}>
              {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> JSON</>}
            </button>
            <button className="btn btn-ghost"
              onClick={() => {
                const a = document.createElement("a");
                a.href = URL.createObjectURL(new Blob([buildMarkdown(result)], { type: "text/markdown" }));
                a.download = "architecture.md"; a.click();
                setDlSaved(true); setTimeout(() => setDlSaved(false), 2000);
              }}
              style={{ height: 34, color: "#4d9ef7", borderColor: "rgba(77,158,247,0.25)", background: "rgba(77,158,247,0.07)" }}>
              {dlSaved ? <><Check size={12} /> Saved</> : <><Download size={12} /> .md</>}
            </button>
          </div>
        </motion.div>

        {/* Tab bar */}
        <div style={{ marginBottom: 20 }}>
          {/* Primary tabs (Blueprint + Diagram) */}
          <div style={{ display: "flex", gap: 3, marginBottom: 8, padding: "4px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", width: "fit-content" }}>
            {PRIMARY_TABS.map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 7,
                  fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                  background: tab === id ? "rgba(255,255,255,0.09)" : "transparent",
                  border: tab === id ? "1px solid rgba(255,255,255,0.14)" : "1px solid transparent",
                  color: tab === id ? "#fff" : "var(--t3)",
                }}>
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>

          {/* Grouped feature tabs */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
            {GROUPS.map(group => {
              const groupTabs = EXTRA_TABS.filter(t => t.group === group);
              const gc = GROUP_COLOR[group];
              return (
                <div key={group} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: "#374151", fontFamily: "'JetBrains Mono',monospace", paddingLeft: 4 }}>{group.toUpperCase()}</p>
                  <div style={{ display: "flex", gap: 2, padding: "3px", borderRadius: 9, background: "rgba(255,255,255,0.02)", border: `1px solid ${gc}22` }}>
                    {groupTabs.map(({ id, label, icon: Icon, badge }) => (
                      <button key={id} onClick={() => setTab(id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 6,
                          fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
                          background: tab === id ? `${gc}18` : "transparent",
                          border: tab === id ? `1px solid ${gc}44` : "1px solid transparent",
                          color: tab === id ? gc : "var(--t3)",
                        }}>
                        <Icon size={10} />
                        {label}
                        {badge && (
                          <span style={{ fontSize: 8, padding: "1px 4px", borderRadius: 99, background: `${gc}20`, border: `1px solid ${gc}44`, color: gc, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>
                            {badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {tab === "blueprint" && (
            <motion.div key="bp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <BlueprintViewer result={result} />
            </motion.div>
          )}
          {tab === "diagram" && (
            <motion.div key="dg" initial={{ opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <DiagramCanvas blueprint={bp} />
            </motion.div>
          )}
          {!["blueprint", "diagram"].includes(tab) && (
            <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <ExtraFeatures result={result} tab={tab as ExtraTab} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
