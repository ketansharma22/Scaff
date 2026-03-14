"use client";
import { motion } from "framer-motion";
import {
  Layers, Server, Database, Zap, GitBranch,
  TrendingUp, DollarSign, Shield, AlertCircle,
  CheckCircle, XCircle, ArrowRight, Users, Activity, Clock,
} from "lucide-react";
import type { GenResult } from "@/lib/api/client";

interface P { result: GenResult; }

const ENGINE_EMOJI: Record<string, string> = {
  postgresql:"🐘", mongodb:"🍃", redis:"⚡", mysql:"🐬",
  opensearch:"🔍", postgresql_fts:"🔍", kafka:"📨",
  redis_streams:"📡", s3:"🪣", qdrant:"🔮", neo4j:"🕸️",
};

const PATTERN_STYLE: Record<string, { bg:string; border:string; color:string }> = {
  microservices:    { bg:"rgba(77,158,247,0.08)",  border:"rgba(77,158,247,0.22)",  color:"#4d9ef7" },
  modular_monolith: { bg:"rgba(167,139,250,0.08)", border:"rgba(167,139,250,0.22)", color:"#a78bfa" },
  monolith:         { bg:"rgba(251,146,60,0.08)",  border:"rgba(251,146,60,0.22)",  color:"#fb923c" },
  serverless:       { bg:"rgba(56,189,248,0.08)",  border:"rgba(56,189,248,0.22)",  color:"#38bdf8" },
};

const DEPLOY_NAMES: Record<string, string> = {
  kubernetes:"Kubernetes", ecs_fargate:"ECS Fargate",
  docker_compose:"Docker Compose", serverless:"Serverless",
};

function CardLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="card-label">
      <div className="card-label-icon"><Icon size={11} style={{ color: "#4d9ef7" }} /></div>
      <span className="card-label-text">{label}</span>
    </div>
  );
}

function Tag({ children, color }: { children: React.ReactNode; color?: string }) {
  return <span className={`tag ${color ? `tag-${color}` : ""}`}>{children}</span>;
}

function FadeCard({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay }}
      className={`card ${className}`}
    >
      {children}
    </motion.div>
  );
}

export default function BlueprintViewer({ result }: P) {
  const { blueprint: bp, requirements: req } = result;
  const ps = PATTERN_STYLE[bp.architecture_pattern] || PATTERN_STYLE.modular_monolith;

  const stack = [
    bp.primary_db         && { label: "Database",  val: bp.primary_db,         icon: ENGINE_EMOJI[bp.primary_db] || "🗄️",   color: "blue" },
    bp.cache              && { label: "Cache",      val: bp.cache,              icon: "⚡",                                   color: "cyan" },
    bp.search_engine      && { label: "Search",     val: bp.search_engine,      icon: "🔍",                                   color: "violet" },
    bp.message_bus        && { label: "Queue",      val: bp.message_bus,        icon: ENGINE_EMOJI[bp.message_bus] || "📨",   color: "amber" },
    bp.realtime_transport && { label: "Realtime",   val: bp.realtime_transport, icon: "📡",                                   color: "green" },
  ].filter(Boolean) as { label:string; val:string; icon:string; color:string }[];

  return (
    <div className="flex flex-col gap-3">

      {/* ── Row 1: Overview + Cost ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

        <FadeCard delay={0} className="md:col-span-2">
          <CardLabel icon={Layers} label="Architecture Overview" />
          <div className="flex flex-wrap gap-2 mb-5">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold"
              style={{ background: ps.bg, border: `1px solid ${ps.border}`, color: ps.color }}>
              <Layers size={13} />
              {bp.architecture_pattern.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--bd)" }}>
              <Server size={13} style={{ color: "var(--t2)" }} />
              <span style={{ color: "var(--t2)" }}>{DEPLOY_NAMES[bp.deployment_model] || bp.deployment_model}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {[
              { Icon: Users,    label: "Target Users",  val: req.user_scale.target >= 1e6 ? `${(req.user_scale.target/1e6).toFixed(1)}M` : req.user_scale.target >= 1e3 ? `${Math.round(req.user_scale.target/1e3)}k` : String(req.user_scale.target) },
              { Icon: Activity, label: "Traffic",        val: req.traffic_pattern },
              { Icon: Shield,   label: "Availability",   val: `${req.availability_sla_percent}%` },
              { Icon: Clock,    label: "Latency SLA",    val: `${req.latency_sla_ms}ms` },
            ].map(({ Icon, label, val }) => (
              <div key={label} className="p-3 rounded-lg"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <Icon size={11} style={{ color: "var(--t4)", marginBottom: 5 }} />
                <p className="text-[10px] font-mono mb-1" style={{ color: "var(--t3)" }}>{label}</p>
                <p className="text-[13px] font-semibold text-white capitalize">{val}</p>
              </div>
            ))}
          </div>

          {/* Features */}
          {(req.features?.length > 0 || req.compliance?.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {req.features?.map(f => <Tag key={f}>{f.replace(/_/g, " ")}</Tag>)}
              {req.compliance?.map(c => <Tag key={c} color="orange">🔒 {c}</Tag>)}
            </div>
          )}
        </FadeCard>

        {/* Cost */}
        {bp.cost_estimate && (
          <FadeCard delay={0.04}>
            <CardLabel icon={DollarSign} label="Cost Estimate" />
            <div className="mb-4">
              <p className="text-[32px] font-bold text-white tracking-tight leading-none">
                ${bp.cost_estimate.monthly_usd_low}
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--t3)" }}>
                – ${bp.cost_estimate.monthly_usd_high} / month
              </p>
            </div>
            <div className="p-3 rounded-lg mb-3"
              style={{ background: "rgba(251,146,60,0.07)", border: "1px solid rgba(251,146,60,0.18)" }}>
              <p className="text-[10px] font-mono mb-1" style={{ color: "var(--t3)" }}>Biggest driver</p>
              <p className="text-[12px] font-semibold" style={{ color: "#fb923c" }}>
                {bp.cost_estimate.biggest_cost_driver}
              </p>
            </div>
            {bp.cost_estimate.notes && (
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--t3)" }}>{bp.cost_estimate.notes}</p>
            )}
          </FadeCard>
        )}
      </div>

      {/* ── Row 2: Tech stack ── */}
      {stack.length > 0 && (
        <FadeCard delay={0.07}>
          <CardLabel icon={Database} label="Technology Stack" />
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(stack.length, 5)}, 1fr)` }}>
            {stack.map(s => (
              <div key={s.label} className="p-3 rounded-lg text-center"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid var(--bd)" }}>
                <p className="text-xl mb-2">{s.icon}</p>
                <p className="text-[10px] font-mono mb-0.5" style={{ color: "var(--t3)" }}>{s.label}</p>
                <p className="text-[12px] font-semibold text-white capitalize">{s.val.replace(/_/g," ")}</p>
              </div>
            ))}
          </div>
        </FadeCard>
      )}

      {/* ── Row 3: Services ── */}
      {bp.services?.length > 0 && (
        <FadeCard delay={0.10}>
          <CardLabel icon={Server} label="Services" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {bp.services.map((svc, i) => (
              <motion.div key={svc.name}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 + i * 0.04 }}
                className="p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--bd)", transition: "border-color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--bd2)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--bd)")}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center"
                      style={{ background: "rgba(77,158,247,0.1)", border: "1px solid rgba(77,158,247,0.18)" }}>
                      <Server size={11} style={{ color: "#4d9ef7" }} />
                    </div>
                    <p className="text-[13px] font-semibold text-white capitalize">{svc.name.replace(/_/g," ")}</p>
                  </div>
                  <span className="text-[10px] font-mono" style={{ color: "var(--t4)" }}>
                    {svc.min_replicas}–{svc.max_replicas}×
                  </span>
                </div>
                {svc.responsibility && (
                  <p className="text-[11px] leading-relaxed mb-2" style={{ color: "var(--t3)" }}>{svc.responsibility}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {svc.tech_stack?.map(t => <Tag key={t} color="blue">{t}</Tag>)}
                </div>
              </motion.div>
            ))}
          </div>
        </FadeCard>
      )}

      {/* ── Row 4: Data stores ── */}
      {bp.data_stores?.length > 0 && (
        <FadeCard delay={0.13}>
          <CardLabel icon={Database} label="Data Stores" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {bp.data_stores.map((ds, i) => (
              <motion.div key={ds.name + i}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14 + i * 0.04 }}
                className="p-3 rounded-xl text-center"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--bd)", transition: "border-color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--bd2)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--bd)")}>
                <p className="text-2xl mb-2">{ENGINE_EMOJI[ds.engine] || ENGINE_EMOJI[ds.name] || "💾"}</p>
                <p className="text-[12px] font-semibold text-white mb-0.5">{ds.name}</p>
                <p className="text-[10px] font-mono mb-2" style={{ color: "var(--t3)" }}>{ds.engine}</p>
                {ds.replication && <Tag color="green">HA</Tag>}
                <p className="text-[10px] leading-relaxed mt-2" style={{ color: "var(--t4)" }}>{ds.purpose}</p>
              </motion.div>
            ))}
          </div>
        </FadeCard>
      )}

      {/* ── Row 5: Communication patterns ── */}
      {bp.communication_patterns?.length > 0 && (
        <FadeCard delay={0.15}>
          <CardLabel icon={GitBranch} label="Communication Patterns" />
          <div className="flex flex-col gap-1.5">
            {bp.communication_patterns.map((cp, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.16 + i * 0.03 }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--bd)" }}>
                <span className="text-[12px] font-mono font-semibold text-white min-w-[100px] capitalize">
                  {cp.from_service.replace(/_/g," ")}
                </span>
                <ArrowRight size={12} style={{ color: "var(--t4)", flexShrink: 0 }} />
                <span className="text-[12px] font-mono font-semibold text-white min-w-[100px] capitalize">
                  {cp.to_service.replace(/_/g," ")}
                </span>
                <div className="flex gap-1.5 flex-1">
                  <Tag color="blue">{cp.protocol}</Tag>
                  <Tag color={cp.pattern === "async" ? "amber" : "cyan"}>{cp.pattern}</Tag>
                </div>
                {cp.notes && (
                  <span className="text-[10px] font-mono hidden md:block" style={{ color: "var(--t4)", maxWidth: 180, textAlign: "right" }}>
                    {cp.notes}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </FadeCard>
      )}

      {/* ── Row 6: Trade-offs ── */}
      {bp.trade_offs?.length > 0 && (
        <FadeCard delay={0.18}>
          <CardLabel icon={Zap} label="Trade-off Analysis" />
          <div className="flex flex-col gap-3">
            {bp.trade_offs.map((t, i) => (
              <motion.div key={i}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.19 + i * 0.05 }}
                className="p-4 rounded-xl"
                style={{ background: "rgba(255,255,255,0.018)", border: "1px solid var(--bd)" }}>
                <p className="text-[13px] font-semibold text-white mb-3 pb-3"
                  style={{ borderBottom: "1px solid var(--bd)" }}>{t.decision}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-mono font-bold mb-2 flex items-center gap-1.5"
                      style={{ color: "#4ade80" }}>
                      <CheckCircle size={10} /> PROS
                    </p>
                    <ul className="flex flex-col gap-1.5">
                      {t.pros?.map((p, j) => (
                        <li key={j} className="flex items-start gap-1.5 text-[11px] leading-relaxed"
                          style={{ color: "var(--t2)" }}>
                          <span style={{ color: "#4ade80", marginTop: 1, flexShrink: 0 }}>+</span>{p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono font-bold mb-2 flex items-center gap-1.5"
                      style={{ color: "#f87171" }}>
                      <XCircle size={10} /> CONS
                    </p>
                    <ul className="flex flex-col gap-1.5">
                      {t.cons?.map((c, j) => (
                        <li key={j} className="flex items-start gap-1.5 text-[11px] leading-relaxed"
                          style={{ color: "var(--t2)" }}>
                          <span style={{ color: "#f87171", marginTop: 1, flexShrink: 0 }}>–</span>{c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                {t.alternatives?.length > 0 && (
                  <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--bd)" }}>
                    <p className="text-[10px] font-mono mb-1.5" style={{ color: "var(--t4)" }}>Alternatives</p>
                    <div className="flex flex-wrap gap-1.5">
                      {t.alternatives.map((a, j) => <Tag key={j} color="violet">{a}</Tag>)}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </FadeCard>
      )}

      {/* ── Row 7: Scaling roadmap ── */}
      {bp.scaling_strategy?.length > 0 && (
        <FadeCard delay={0.20}>
          <CardLabel icon={TrendingUp} label="Scaling Roadmap" />
          <div className="relative">
            <div className="absolute left-[19px] top-0 bottom-0 w-px"
              style={{ background: "linear-gradient(to bottom, transparent, var(--bd) 10%, var(--bd) 90%, transparent)" }} />
            <div className="flex flex-col gap-5">
              {bp.scaling_strategy.map((s, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.22 + i * 0.06 }}
                  className="flex gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold font-mono flex-shrink-0 relative z-10"
                    style={{ background: "rgba(77,158,247,0.12)", border: "1px solid rgba(77,158,247,0.25)", color: "#4d9ef7" }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 pb-2">
                    <p className="text-[13px] font-semibold text-white mb-1">{s.current_tier}</p>
                    <p className="text-[11px] mb-2 flex items-center gap-1.5"
                      style={{ color: "#fbbf24" }}>
                      ⚡ Trigger: {s.next_trigger}
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {s.actions?.map((a, j) => (
                        <div key={j} className="flex items-start gap-2 text-[11px] leading-relaxed"
                          style={{ color: "var(--t3)" }}>
                          <ArrowRight size={10} style={{ color: "var(--t4)", marginTop: 3, flexShrink: 0 }} />{a}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </FadeCard>
      )}

      {/* ── Row 8: Recommendations ── */}
      {bp.recommendations?.length > 0 && (
        <FadeCard delay={0.22}>
          <CardLabel icon={AlertCircle} label="Recommendations" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {bp.recommendations.map((r, i) => (
              <motion.div key={i}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.24 + i * 0.03 }}
                className="flex items-start gap-2.5 p-3 rounded-lg"
                style={{ background: "rgba(255,255,255,0.018)", border: "1px solid var(--bd)" }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4d9ef7", marginTop: 5, flexShrink: 0 }} />
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--t2)" }}>{r}</p>
              </motion.div>
            ))}
          </div>
        </FadeCard>
      )}

      {/* Footer meta */}
      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="text-center text-[10px] font-mono pt-2 pb-4"
        style={{ color: "var(--t4)" }}>
        {bp.applied_rules?.length} rules fired ·{" "}
        {bp.enhancement_method === "llm_enhanced" ? "LLM enhanced" : "rule engine"} ·{" "}
        {req.parse_method} parser ({Math.round((req.parse_confidence || 0) * 100)}% confidence)
      </motion.p>
    </div>
  );
}
