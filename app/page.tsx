"use client";
import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Zap, Database, GitBranch, Shield, TrendingUp, DollarSign, ChevronRight, LayoutDashboard } from "lucide-react";
import { useStore } from "@/lib/store/appStore";
import { generateSync } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthContext";
import UserMenu from "@/components/layout/UserMenu";

const EXAMPLES = [
  {
    label: "SaaS tool",
    text: "Project management SaaS like Linear — auth, real-time updates, Stripe billing, team workspaces, email notifications. 6-person team, 50k users, GDPR required.",
  },
  {
    label: "Marketplace",
    text: "Food delivery marketplace — real-time order tracking, driver app, restaurant dashboard, Stripe, push notifications. 200k users.",
  },
  {
    label: "Healthcare",
    text: "HIPAA-compliant patient platform — SSO, records management, appointment scheduling, analytics. 3-person team, 10k users.",
  },
  {
    label: "E-commerce",
    text: "E-commerce platform — product search, AI recommendations, seller portal, payments, reviews, multi-tenancy. Scale to 1M users.",
  },
];

const FEATURES = [
  { icon: Zap,        label: "Decision Engine",    desc: "18 deterministic rules, zero randomness" },
  { icon: Database,   label: "RAG Knowledge",      desc: "200+ real architecture patterns" },
  { icon: GitBranch,  label: "Live Diagram",       desc: "Interactive node-edge system map" },
  { icon: Shield,     label: "Trade-off Analysis", desc: "Every decision explained with pros & cons" },
  { icon: TrendingUp, label: "Scaling Roadmap",    desc: "Strategy from 100 to 1M users" },
  { icon: DollarSign, label: "Cost Estimate",      desc: "Monthly infra breakdown" },
];

const FADE_UP = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay },
});

export default function HomePage() {
  const router = useRouter();
  const { reset, setRawInput, setResult, setError, setStage } = useStore();
  const { user } = useAuth();
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  const generate = useCallback(async (text: string) => {
    const t = text.trim();
    if (!t) { setErr("Describe your product idea first."); return; }
    if (t.length < 20) { setErr("A bit more detail please — at least one sentence."); return; }

    setLoading(true);
    setErr("");
    reset();
    setRawInput(t);
    setStage("started");

    try {
      const result = await generateSync(t);
      setResult(result);
      router.push("/dashboard");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Generation failed. Is the AI engine running on port 8000?";
      setError(msg);
      setErr(msg);
      setLoading(false);
    }
  }, [reset, setRawInput, setStage, setResult, setError, router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") generate(input);
  };

  return (
    <main className="min-h-screen overflow-hidden">
      {/* ── Navbar ── */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        {/* Logo */}
        <motion.div {...FADE_UP(0)} className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold relative"
            style={{ background: "linear-gradient(135deg,#1a6ef7,#5b3ff7)", boxShadow: "0 0 20px rgba(26,110,247,0.5)" }}>
            ⚡
          </div>
          <span className="font-bold text-white text-[15px] tracking-[-0.3px]">Scaff</span>
        </motion.div>

        {/* Right side of nav */}
        <motion.div {...FADE_UP(0.05)} className="flex items-center gap-2">
          {["GitHub", "Docs"].map((label) => (
            <a key={label} href="#"
              className="text-xs px-3 py-1.5 rounded-lg transition-colors duration-150"
              style={{ color: "var(--t3)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--t2)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--t3)")}>
              {label}
            </a>
          ))}

          {/* Show dashboard button + user menu if logged in, else show login link */}
          {user ? (
            <>
              <button
                onClick={() => router.push("/dashboard")}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-150"
                style={{
                  background: "rgba(77,158,247,0.1)",
                  border: "1px solid rgba(77,158,247,0.2)",
                  color: "#4d9ef7",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(77,158,247,0.18)"; e.currentTarget.style.borderColor = "rgba(77,158,247,0.35)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(77,158,247,0.1)";  e.currentTarget.style.borderColor = "rgba(77,158,247,0.2)"; }}>
                <LayoutDashboard size={12} />
                Dashboard
              </button>
              <UserMenu />
            </>
          ) : (
            <button
              onClick={() => router.push("/login")}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-150"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "var(--t2)",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.09)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}>
              Sign in
            </button>
          )}
        </motion.div>
      </nav>

      {/* ── Hero ── */}
      <div className="relative z-10 flex flex-col items-center text-center px-5 pt-14 pb-6 max-w-4xl mx-auto">

        {/* Live badge */}
        <motion.div {...FADE_UP(0.05)} className="flex items-center gap-2 px-3 py-1.5 rounded-full mb-10"
          style={{ background: "rgba(77,158,247,0.07)", border: "1px solid rgba(77,158,247,0.18)" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400"
            style={{ boxShadow: "0 0 8px #4ade80", animation: "pulseGlow 2s ease-in-out infinite" }} />
          <span className="text-[11px] font-mono" style={{ color: "rgba(77,158,247,0.9)" }}>
            Ollama · Qdrant · Runs 100% locally
          </span>
          <ChevronRight size={11} style={{ color: "rgba(77,158,247,0.5)" }} />
        </motion.div>

        {/* Headline */}
        <motion.h1 {...FADE_UP(0.1)}
          className="font-display font-bold tracking-[-0.04em] leading-[1.03] mb-6"
          style={{ fontSize: "clamp(44px,8.5vw,82px)" }}>
          <span style={{ color: "#fff" }}>Your idea.</span>
          <br />
          <span className="text-gradient-blue">Production architecture.</span>
        </motion.h1>

        <motion.p {...FADE_UP(0.18)}
          className="text-base leading-relaxed mb-12 max-w-[480px]"
          style={{ color: "var(--t2)" }}>
          Describe your product in plain English. Get a complete system architecture —
          services, databases, diagrams, trade-offs, and scaling strategy — in under 60 seconds.
        </motion.p>

        {/* ── Input card ── */}
        <motion.div {...FADE_UP(0.26)} className="w-full max-w-[660px]">
          <div
            className="rounded-2xl overflow-hidden transition-all duration-300"
            style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.5), 0 16px 48px rgba(0,0,0,0.3)",
            }}
          >
            <textarea
              ref={taRef}
              value={input}
              onChange={e => { setInput(e.target.value); if (err) setErr(""); }}
              onKeyDown={handleKeyDown}
              placeholder={`e.g. "I'm building a SaaS CRM with auth, email sync, analytics, and Stripe billing for 25k users"`}
              rows={5}
              maxLength={8192}
              disabled={loading}
              className="w-full bg-transparent text-white resize-none outline-none p-5 text-sm leading-relaxed"
              style={{ fontFamily: "'Cabinet Grotesk', system-ui, sans-serif", color: "#fff", caretColor: "#4d9ef7" }}
            />
            <div className="flex items-center justify-between px-5 py-3"
              style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <span className="text-[11px] font-mono" style={{ color: "var(--t4)" }}>
                {input.length}/8192 · ⌘↵ to generate
              </span>
              <button
                className="btn btn-primary"
                onClick={() => generate(input)}
                disabled={loading || input.trim().length < 5}
              >
                {loading
                  ? <><div style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.25)", borderTopColor: "#fff", borderRadius: "50%", animation: "spinSlow 0.8s linear infinite" }} /> Generating…</>
                  : <><span>Generate</span><ArrowRight size={14} /></>
                }
              </button>
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {err && (
              <motion.p
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-3 text-sm text-left px-1"
                style={{ color: "var(--red)", fontFamily: "var(--font-mono)" }}>
                ⚠ {err}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Examples */}
          <motion.div {...FADE_UP(0.34)} className="mt-4 text-left">
            <p className="text-[11px] mb-2 px-1 font-mono" style={{ color: "var(--t4)" }}>Try an example</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  onClick={() => setInput(ex.text)}
                  className="text-xs px-3 py-1.5 rounded-lg transition-all duration-150 font-mono"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "var(--t3)",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = "var(--t2)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "var(--t3)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}>
                  {ex.label}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* ── Features grid ── */}
      <motion.section
        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
        viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
        className="relative z-10 max-w-[680px] mx-auto px-5 pt-16 pb-24">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {FEATURES.map(({ icon: Icon, label, desc }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.06 }}
              className="p-4 rounded-xl cursor-default group"
              style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.06)", transition: "background 0.2s, border-color 0.2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.10)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.018)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)"; }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                style={{ background: "rgba(77,158,247,0.1)", border: "1px solid rgba(77,158,247,0.18)" }}>
                <Icon size={14} style={{ color: "#4d9ef7" }} />
              </div>
              <p className="text-[13px] font-semibold text-white mb-1">{label}</p>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--t3)" }}>{desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          viewport={{ once: true }} transition={{ delay: 0.5 }}
          className="text-center mt-12 font-mono text-[11px]"
          style={{ color: "var(--t4)" }}>
          Built with Ollama · Qdrant · FastAPI · Next.js · React Flow
        </motion.p>
      </motion.section>

      <style jsx global>{`
        @keyframes spinSlow { to { transform: rotate(360deg); } }
        @keyframes pulseGlow { 0%,100% { opacity:0.7; } 50% { opacity:1; } }
      `}</style>
    </main>
  );
}
