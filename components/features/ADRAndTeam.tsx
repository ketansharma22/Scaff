"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, Users, Code, Server, Database, Shield, Wrench } from "lucide-react";
import type { GenResult } from "@/lib/api/client";

// ─────────────────────────────────────────────────────────────────────────────
// ADR GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

interface ADR {
  id: string; title: string; status: "Accepted" | "Proposed" | "Deprecated";
  context: string; decision: string; consequences: string[];
  alternatives: string[]; date: string;
}

function generateADRs(result: GenResult): ADR[] {
  const bp  = result.blueprint;
  const req = result.requirements;
  const adrs: ADR[] = [];
  const date = new Date().toISOString().split("T")[0];

  adrs.push({
    id: "ADR-001",
    title: `Use ${bp.architecture_pattern?.replace(/_/g," ")} as the primary architecture pattern`,
    status: "Accepted",
    context: `We need to choose an architecture pattern for a system targeting ${req.user_scale?.target?.toLocaleString()} users with a team of ${req.team_size || "unknown"} engineers. The system requires ${req.availability_sla_percent || 99.5}% availability and ${req.latency_sla_ms || 200}ms p95 latency.`,
    decision: `We will use ${bp.architecture_pattern?.replace(/_/g," ")} deployed as ${bp.deployment_model?.replace(/_/g," ")}. This balances operational simplicity with the scalability requirements for our target user base. The pattern can be evolved as the team grows.`,
    consequences: [
      `Deployment complexity is ${bp.architecture_pattern === "microservices" ? "higher — need container orchestration" : "lower — single deployable unit"}`,
      `Team can ship features faster with ${bp.architecture_pattern === "microservices" ? "independent service deployments" : "shared codebase and simpler local development"}`,
      `Scaling requires ${bp.architecture_pattern === "microservices" ? "per-service resource allocation" : "horizontal scaling of the entire application"}`,
      "This decision can be revisited at 50k+ users if bottlenecks emerge",
    ],
    alternatives: [
      "Microservices — rejected due to operational overhead for current team size",
      "Serverless — rejected due to cold start latency and complex local development",
      "Modular monolith — considered as stepping stone if microservices needed later",
    ],
    date,
  });

  adrs.push({
    id: "ADR-002",
    title: `Use ${bp.primary_db || "PostgreSQL"} as the primary database`,
    status: "Accepted",
    context: `We need a primary data store. Our data is ${req.data_characteristics?.relational ? "relational" : "mixed"} in nature with an estimated size of ${req.data_characteristics?.estimated_db_size_gb || 10}GB. We need ACID transactions for ${req.features?.includes("payment") ? "payment processing" : "data integrity"}.`,
    decision: `We will use ${bp.primary_db || "PostgreSQL"} as our primary database. It provides ACID compliance, excellent JSON support, and a mature ecosystem. We will use Supabase for managed hosting on the free tier initially.`,
    consequences: [
      "Full ACID transactions available for complex operations",
      "Schema migrations required for structural changes",
      "Connection pooling (PgBouncer) needed at >100 concurrent users",
      "Read replicas can be added for horizontal read scaling",
    ],
    alternatives: [
      "MongoDB — rejected due to lack of join support and eventual consistency complexity",
      "MySQL — familiar but fewer advanced features (JSONB, CTEs, window functions)",
      "DynamoDB — rejected due to AWS lock-in and complex access pattern design",
    ],
    date,
  });

  if (bp.cache) {
    adrs.push({
      id: "ADR-003",
      title: `Use ${bp.cache} for caching and session management`,
      status: "Accepted",
      context: `The application has read-heavy workloads with ${req.user_scale?.target?.toLocaleString()} target users. Database queries for frequently accessed data are a performance bottleneck. Session storage needs to be fast and support TTL-based expiry.`,
      decision: `We will use ${bp.cache} as our caching layer and session store. All user sessions will be stored in ${bp.cache} with a 24-hour TTL. Frequently accessed API responses will be cached with appropriate TTLs (30s–1hr depending on staleness tolerance).`,
      consequences: [
        "API response times reduced by 60–80% for cached endpoints",
        `Additional infrastructure cost (~$3–15/month via Upstash free tier then paid)`,
        "Cache invalidation logic required on write operations",
        "Session data lost if cache is cleared (acceptable — users re-login)",
      ],
      alternatives: [
        "Database-backed sessions — simpler but slower and more DB load",
        "In-memory cache (local) — fast but doesn't work across multiple instances",
        "Memcached — simpler but fewer data types, no pub/sub",
      ],
      date,
    });
  }

  if (bp.message_bus) {
    adrs.push({
      id: "ADR-004",
      title: `Use ${bp.message_bus} for async background processing`,
      status: "Accepted",
      context: `Several operations (email sending, webhook delivery, report generation) are time-consuming and should not block API responses. We need reliable job processing with retry logic.`,
      decision: `We will use ${bp.message_bus} for all background job processing. Long-running operations will be enqueued immediately and processed by dedicated worker processes. Jobs will retry up to 3 times with exponential backoff.`,
      consequences: [
        "API response times improved — heavy work moved off request path",
        "Additional operational complexity — need to monitor queue depth",
        "Job failures need alerting and dead-letter queue",
        "Workers can be scaled independently from API servers",
      ],
      alternatives: [
        "Synchronous processing — simpler but slow responses and timeout risk",
        "Cron-based polling — simple but higher latency for job execution",
        "AWS Lambda / Cloud Functions — serverless but cold starts and vendor lock-in",
      ],
      date,
    });
  }

  adrs.push({
    id: `ADR-00${adrs.length + 1}`,
    title: "API versioning strategy: URL path versioning",
    status: "Proposed",
    context: "We need to version our API to allow breaking changes without affecting existing clients. This becomes important as we onboard external consumers.",
    decision: "We will use URL path versioning (/v1/, /v2/) rather than header-based versioning. This is more visible, easier to test, and simpler to implement with most frameworks.",
    consequences: [
      "Clients must update URLs when migrating to new API version",
      "Multiple versions can run simultaneously during transition periods",
      "Simpler to test and debug — version visible in URL",
      "Need deprecation policy (minimum 6 months support for old versions)",
    ],
    alternatives: [
      "Header versioning (Accept: application/vnd.api+json;version=1) — cleaner URLs but harder to test",
      "Query parameter versioning (?version=1) — easy but pollutes query string",
      "No versioning — simplest but makes breaking changes impossible",
    ],
    date,
  });

  return adrs;
}

function ADRCard({ adr, index }: { adr: ADR; index: number }) {
  const [copied, setCopied] = useState(false);

  const markdown = `# ${adr.id}: ${adr.title}

**Date:** ${adr.date}
**Status:** ${adr.status}

## Context
${adr.context}

## Decision
${adr.decision}

## Consequences
${adr.consequences.map(c => `- ${c}`).join("\n")}

## Alternatives Considered
${adr.alternatives.map(a => `- ${a}`).join("\n")}
`;

  const statusColor = { Accepted: "#4ade80", Proposed: "#fbbf24", Deprecated: "#6b7280" }[adr.status];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}
      style={{ padding: "16px 18px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", fontFamily: "'JetBrains Mono',monospace" }}>{adr.id}</span>
            <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 99, background: `${statusColor}15`, border: `1px solid ${statusColor}33`, color: statusColor, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>{adr.status}</span>
            <span style={{ fontSize: 10, color: "#374151", fontFamily: "'JetBrains Mono',monospace" }}>{adr.date}</span>
          </div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>{adr.title}</p>
        </div>
        <button onClick={() => { navigator.clipboard.writeText(markdown); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 7, fontSize: 11, cursor: "pointer", background: copied ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.05)", border: `1px solid ${copied ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.1)"}`, color: copied ? "#4ade80" : "#6b7280", flexShrink: 0 }}>
          {copied ? <><Check size={10}/> Copied</> : <><Copy size={10}/> Copy MD</>}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <p style={{ fontSize: 9, color: "#6b7280", fontFamily: "'JetBrains Mono',monospace", marginBottom: 5 }}>CONTEXT</p>
          <p style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.6 }}>{adr.context}</p>
        </div>
        <div>
          <p style={{ fontSize: 9, color: "#6b7280", fontFamily: "'JetBrains Mono',monospace", marginBottom: 5 }}>DECISION</p>
          <p style={{ fontSize: 11, color: "#d1d5db", lineHeight: 1.6 }}>{adr.decision}</p>
        </div>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 9, color: "#6b7280", fontFamily: "'JetBrains Mono',monospace", marginBottom: 5 }}>CONSEQUENCES</p>
          {adr.consequences.slice(0,2).map((c, i) => <p key={i} style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.5, marginBottom: 2 }}>→ {c}</p>)}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 9, color: "#6b7280", fontFamily: "'JetBrains Mono',monospace", marginBottom: 5 }}>ALTERNATIVES</p>
          {adr.alternatives.slice(0,2).map((a, i) => <p key={i} style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.5, marginBottom: 2 }}>✗ {a.split("—")[0]}</p>)}
        </div>
      </div>
    </motion.div>
  );
}

export function ADRGenerator({ result }: { result: GenResult }) {
  const adrs = generateADRs(result);
  const [copiedAll, setCopiedAll] = useState(false);

  const copyAll = () => {
    const text = adrs.map(a =>
      `# ${a.id}: ${a.title}\n\nDate: ${a.date}\nStatus: ${a.status}\n\n## Context\n${a.context}\n\n## Decision\n${a.decision}\n\n## Consequences\n${a.consequences.map(c => `- ${c}`).join("\n")}\n\n## Alternatives\n${a.alternatives.map(alt => `- ${alt}`).join("\n")}\n\n---`
    ).join("\n\n");
    navigator.clipboard.writeText(text);
    setCopiedAll(true); setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 3 }}>Architecture Decision Records</p>
          <p style={{ fontSize: 11, color: "#6b7280" }}>{adrs.length} ADRs generated · Industry-standard format for documenting decisions</p>
        </div>
        <button onClick={copyAll}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", background: copiedAll ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.05)", border: `1px solid ${copiedAll ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.1)"}`, color: copiedAll ? "#4ade80" : "#9ca3af" }}>
          {copiedAll ? <><Check size={12}/> Copied all!</> : <><Copy size={12}/> Copy all ADRs</>}
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {adrs.map((adr, i) => <ADRCard key={adr.id} adr={adr} index={i} />)}
      </div>
      <p style={{ fontSize: 11, color: "#374151", textAlign: "center" }}>Copy individual ADRs or all at once · Save as /docs/adr/ADR-NNN.md in your repo</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAM STRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

interface Role {
  title: string; count: number; icon: React.ElementType; color: string;
  responsibilities: string[]; skills: string[]; hireWhen: string;
  salary: string;
}

function generateTeamStructure(result: GenResult): { phase: string; roles: Role[]; notes: string }[] {
  const { blueprint: bp, requirements: req } = result;
  const isMicro    = bp.architecture_pattern === "microservices";
  const hasML      = req.features?.some(f => f.includes("ml") || f.includes("ai"));
  const hasMobile  = req.features?.some(f => f.includes("mobile"));
  const hasPayment = req.features?.some(f => f.includes("payment") || f.includes("billing"));

  return [
    {
      phase: "0–1k users (MVP)",
      notes: "Move fast. Everyone does everything. Hire generalists.",
      roles: [
        {
          title: "Full-Stack Engineer", count: 2, icon: Code, color: "#4d9ef7",
          responsibilities: ["Build features end-to-end", "Write tests", "Deploy and monitor", "Code review"],
          skills: ["Python/Node.js", bp.primary_db || "PostgreSQL", "React/Vue", "Docker"],
          hireWhen: "Day 1 — founding team",
          salary: "$120k–$180k",
        },
        {
          title: "DevOps / Platform", count: isMicro ? 1 : 0, icon: Server, color: "#a78bfa",
          responsibilities: ["CI/CD pipeline", "Infrastructure as Code", "Monitoring setup", "Security"],
          skills: ["Kubernetes", "Terraform", "AWS/GCP", "Prometheus"],
          hireWhen: "When deployments take > 1 day or infra is a bottleneck",
          salary: "$130k–$190k",
        },
      ].filter(r => r.count > 0),
    },
    {
      phase: "1k–10k users (Growth)",
      notes: "Start specializing. Frontend/backend split. Add QA.",
      roles: [
        {
          title: "Backend Engineer", count: 2, icon: Server, color: "#4d9ef7",
          responsibilities: ["API development", "Database optimization", "Background jobs", "Performance tuning"],
          skills: ["Python/Go/Node.js", bp.primary_db || "PostgreSQL", bp.cache || "Redis", "API design"],
          hireWhen: "When backend tickets > frontend tickets consistently",
          salary: "$130k–$190k",
        },
        {
          title: "Frontend Engineer", count: hasMobile ? 2 : 1, icon: Code, color: "#a78bfa",
          responsibilities: ["React/Vue components", "Performance", "Accessibility", hasMobile ? "React Native / Swift" : ""],
          skills: ["React/Vue", "TypeScript", "CSS", hasMobile ? "React Native" : ""],
          hireWhen: "When UI work is blocking product velocity",
          salary: "$110k–$170k",
        },
        {
          title: "QA Engineer", count: 1, icon: Shield, color: "#4ade80",
          responsibilities: ["Test automation", "Integration tests", "Performance testing", "Bug triage"],
          skills: ["Playwright/Cypress", "k6/Artillery", "API testing", "CI integration"],
          hireWhen: "When bugs reach production more than once/week",
          salary: "$90k–$130k",
        },
        {
          title: "DevOps Engineer", count: 1, icon: Wrench, color: "#fbbf24",
          responsibilities: ["Infrastructure", "CI/CD", "Observability", "Security", "Cost optimization"],
          skills: ["Kubernetes", "Terraform", "AWS/GCP", "Prometheus/Grafana", "Security"],
          hireWhen: "When deployment takes > 30 min or infra issues happen weekly",
          salary: "$130k–$180k",
        },
      ],
    },
    {
      phase: "10k–100k users (Scale)",
      notes: "Platform team forms. Data team if analytics needed. Security hire.",
      roles: [
        {
          title: "Staff/Principal Engineer", count: 1, icon: Code, color: "#4d9ef7",
          responsibilities: ["Architecture decisions", "Tech debt strategy", "Mentoring", "Cross-team coordination"],
          skills: ["System design", "Leadership", "All backend/infra", "Communication"],
          hireWhen: "When technical decisions are slowing team velocity",
          salary: "$200k–$300k+",
        },
        {
          title: "Platform/Infra Team", count: 2, icon: Server, color: "#a78bfa",
          responsibilities: ["Developer experience", "Internal tooling", "Shared services", "Reliability"],
          skills: ["Kubernetes", "Service mesh", "Developer tooling", "SRE practices"],
          hireWhen: "When engineers spend > 20% time on infra instead of features",
          salary: "$140k–$200k",
        },
        {
          title: "Data Engineer", count: hasML ? 2 : 1, icon: Database, color: "#fbbf24",
          responsibilities: ["Data pipeline", "Analytics", hasML ? "ML infrastructure" : "Reporting", "Data warehouse"],
          skills: ["Python", "SQL", "dbt", hasML ? "MLflow/Sagemaker" : "Metabase/Looker", "Airflow"],
          hireWhen: "When data questions take > 1 week to answer",
          salary: "$130k–$190k",
        },
        {
          title: "Security Engineer", count: 1, icon: Shield, color: "#f87171",
          responsibilities: ["Penetration testing", "Security reviews", "Compliance", hasPayment ? "PCI compliance" : "SOC2"],
          skills: ["AppSec", "Network security", "Compliance frameworks", "OWASP"],
          hireWhen: "When you have enterprise customers or handle sensitive data",
          salary: "$150k–$220k",
        },
      ],
    },
  ];
}

export function TeamStructure({ result }: { result: GenResult }) {
  const [phase, setPhase] = useState(0);
  const structure = generateTeamStructure(result);
  const current   = structure[phase];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Phase selector */}
      <div style={{ display: "flex", gap: 6 }}>
        {structure.map((s, i) => (
          <button key={i} onClick={() => setPhase(i)}
            style={{ flex: 1, padding: "10px 12px", borderRadius: 9, cursor: "pointer", fontSize: 11, fontWeight: 600, transition: "all 0.15s", textAlign: "center",
              background: phase === i ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${phase === i ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)"}`,
              color: phase === i ? "#fff" : "#6b7280",
            }}>{s.phase}</button>
        ))}
      </div>

      {/* Phase note */}
      <div style={{ padding: "10px 14px", borderRadius: 9, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic" }}>💡 {current.notes}</p>
      </div>

      {/* Team size badge */}
      <div style={{ display: "flex", gap: 8 }}>
        {[
          { label: "Total headcount", val: current.roles.reduce((s, r) => s + r.count, 0), color: "#4d9ef7" },
          { label: "Avg salary (US)", val: "$" + (current.roles.reduce((s, r) => s + parseInt(r.salary.replace(/[^0-9]/g,"").slice(0,3)), 0) / current.roles.length).toFixed(0) + "k+", color: "#4ade80" },
          { label: "Roles", val: current.roles.length, color: "#a78bfa" },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, padding: "12px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", textAlign: "center" }}>
            <p style={{ fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1, marginBottom: 3, fontFamily: "'JetBrains Mono',monospace" }}>{s.val}</p>
            <p style={{ fontSize: 10, color: "#6b7280" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Role cards */}
      <AnimatePresence mode="wait">
        <motion.div key={phase} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          {current.roles.map((role, i) => (
            <div key={role.title} style={{ padding: "16px", borderRadius: 12, border: `1px solid ${role.color}33`, background: `${role.color}08` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: `${role.color}18`, border: `1px solid ${role.color}33` }}>
                  <role.icon size={14} style={{ color: role.color }} />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{role.title}</p>
                  <p style={{ fontSize: 10, color: role.color, fontFamily: "'JetBrains Mono',monospace" }}>×{role.count} · {role.salary}</p>
                </div>
              </div>

              <div style={{ marginBottom: 8 }}>
                <p style={{ fontSize: 9, color: "#6b7280", fontFamily: "'JetBrains Mono',monospace", marginBottom: 5 }}>RESPONSIBILITIES</p>
                {role.responsibilities.filter(Boolean).slice(0,3).map(r => (
                  <p key={r} style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.5, marginBottom: 2 }}>→ {r}</p>
                ))}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                {role.skills.filter(Boolean).map(s => (
                  <span key={s} style={{ fontSize: 9, padding: "2px 7px", borderRadius: 99, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#6b7280", fontFamily: "'JetBrains Mono',monospace" }}>{s}</span>
                ))}
              </div>

              <div style={{ padding: "7px 9px", borderRadius: 7, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <p style={{ fontSize: 10, color: "#6b7280" }}>⏰ Hire when: {role.hireWhen}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </AnimatePresence>

      <p style={{ fontSize: 11, color: "#374151", textAlign: "center" }}>Salaries are US market rates · Adjust for your location · Remote teams can hire globally</p>
    </div>
  );
}
