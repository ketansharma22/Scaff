"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Github, Tag, ChevronDown, ChevronRight } from "lucide-react";
import type { GenResult } from "@/lib/api/client";

interface P { result: GenResult; }

interface Issue {
  title: string;
  body: string;
  labels: string[];
  milestone: string;
  priority: "P0" | "P1" | "P2" | "P3";
}

const PRIORITY_COLOR = {
  P0: { bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.3)", text: "#f87171", label: "Critical" },
  P1: { bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.3)",  text: "#fbbf24", label: "High"     },
  P2: { bg: "rgba(77,158,247,0.12)",  border: "rgba(77,158,247,0.3)",  text: "#4d9ef7", label: "Medium"   },
  P3: { bg: "rgba(156,163,175,0.1)",  border: "rgba(156,163,175,0.2)", text: "#9ca3af", label: "Low"      },
};

function generateIssues(result: GenResult): Issue[] {
  const { blueprint: bp, requirements: req } = result;
  const issues: Issue[] = [];
  const hasAuth    = req.features?.some(f => f.includes("auth"));
  const hasPayment = req.features?.some(f => f.includes("payment") || f.includes("billing"));
  const hasSearch  = !!bp.search_engine;
  const hasRealtime= !!bp.realtime_transport;
  const hasQueue   = !!bp.message_bus;

  // ── Milestone 1: Foundation ──────────────────────────────────────────────
  issues.push({
    title: "Project Setup: Initialize repo and CI/CD pipeline",
    labels: ["infrastructure", "setup", "P0"],
    milestone: "Milestone 1: Foundation",
    priority: "P0",
    body: `## Overview
Set up the project foundation including repository structure, CI/CD, and development environment.

## Tasks
- [ ] Initialize monorepo structure
- [ ] Set up GitHub Actions CI pipeline (lint, test, build)
- [ ] Configure pre-commit hooks (prettier, eslint)
- [ ] Set up staging and production environments
- [ ] Add .env.example with all required variables

## Acceptance Criteria
- [ ] Pipeline runs on every PR
- [ ] All branches protected — no direct pushes to main
- [ ] Environment variables documented

## Notes
Use Railway or Render for initial deployment. Set up separate staging environment.`,
  });

  issues.push({
    title: `Infrastructure: Provision ${bp.primary_db || "PostgreSQL"} and ${bp.cache || "Redis"}`,
    labels: ["infrastructure", "database", "P0"],
    milestone: "Milestone 1: Foundation",
    priority: "P0",
    body: `## Overview
Provision and configure the core data infrastructure.

## Tasks
- [ ] Set up ${bp.primary_db || "PostgreSQL"} (Supabase free tier recommended)
- [ ] Configure connection pooling
${bp.cache ? `- [ ] Set up ${bp.cache} (Upstash free tier recommended)` : ""}
- [ ] Run initial schema migrations
- [ ] Configure automated backups
- [ ] Add health check endpoints for all services

## Connection Details
Document all connection strings in team password manager (1Password / Bitwarden).

## Acceptance Criteria
- [ ] Database accessible from all environments
- [ ] Migrations run automatically on deploy
- [ ] Backups verified to work`,
  });

  if (hasAuth) {
    issues.push({
      title: "Feature: User authentication (register, login, JWT)",
      labels: ["feature", "auth", "P0"],
      milestone: "Milestone 1: Foundation",
      priority: "P0",
      body: `## Overview
Implement core authentication flow with JWT tokens.

## Endpoints
- \`POST /auth/register\` — email + password
- \`POST /auth/login\` — returns access_token + refresh_token
- \`POST /auth/refresh\` — exchange refresh for new access token
- \`POST /auth/logout\` — invalidate refresh token
- \`GET /users/me\` — current user profile

## Tasks
- [ ] Password hashing with bcrypt (cost factor 12)
- [ ] JWT with 15min access token + 30day refresh token
- [ ] Store refresh tokens in ${bp.cache || "Redis"} for fast invalidation
- [ ] Rate limit login endpoint (5 attempts per 15min per IP)
- [ ] Email verification flow

## Security Requirements
- [ ] Passwords never logged
- [ ] Tokens invalidated on password change
- [ ] Account lockout after repeated failures

## Acceptance Criteria
- [ ] All auth endpoints tested with integration tests
- [ ] Postman collection added to repo`,
    });
  }

  issues.push({
    title: "API: Core CRUD endpoints for primary resource",
    labels: ["feature", "api", "P1"],
    milestone: "Milestone 1: Foundation",
    priority: "P1",
    body: `## Overview
Implement the main resource CRUD operations.

## Endpoints
- \`GET /{resource}\` — list with pagination
- \`POST /{resource}\` — create
- \`GET /{resource}/{id}\` — get by ID
- \`PATCH /{resource}/{id}\` — update
- \`DELETE /{resource}/{id}\` — soft delete

## Tasks
- [ ] Request validation with Pydantic / Zod
- [ ] Pagination (cursor-based for large datasets)
- [ ] Proper HTTP status codes
- [ ] Error response format standardized
- [ ] OpenAPI docs auto-generated

## Acceptance Criteria
- [ ] 80%+ test coverage on endpoints
- [ ] Response time < 100ms p95 on staging`,
  });

  // ── Milestone 2: Features ────────────────────────────────────────────────
  req.features?.slice(0, 4).forEach(f => {
    issues.push({
      title: `Feature: Implement ${f.replace(/_/g," ")}`,
      labels: ["feature", "P1"],
      milestone: "Milestone 2: Core Features",
      priority: "P1",
      body: `## Overview
Implement ${f.replace(/_/g," ")} feature as described in the architecture blueprint.

## Tasks
- [ ] Design data model / schema
- [ ] Implement API endpoints
- [ ] Add frontend integration
- [ ] Write unit and integration tests

## Acceptance Criteria
- [ ] Feature works end-to-end
- [ ] Error cases handled gracefully
- [ ] Performance acceptable under load`,
    });
  });

  if (hasPayment) {
    issues.push({
      title: "Feature: Stripe billing integration",
      labels: ["feature", "payments", "P1"],
      milestone: "Milestone 2: Core Features",
      priority: "P1",
      body: `## Overview
Integrate Stripe for subscription billing.

## Tasks
- [ ] Set up Stripe account and products/prices
- [ ] Implement checkout session creation
- [ ] Handle \`customer.subscription.updated\` webhook
- [ ] Handle \`invoice.payment_failed\` webhook
- [ ] Add billing portal for customers
- [ ] Store subscription status in DB

## ⚠️ Security
- Never store card data — Stripe handles this
- Verify webhook signatures with Stripe-Signature header
- Test with Stripe CLI: \`stripe listen --forward-to localhost:8000/webhooks/stripe\`

## Acceptance Criteria
- [ ] Successful payment flow tested
- [ ] Failed payment flow tested
- [ ] Subscription cancellation tested`,
    });
  }

  // ── Milestone 3: Scale ───────────────────────────────────────────────────
  if (bp.cache) {
    issues.push({
      title: `Performance: Add ${bp.cache} caching for hot read paths`,
      labels: ["performance", "infrastructure", "P2"],
      milestone: "Milestone 3: Scale & Polish",
      priority: "P2",
      body: `## Overview
Cache expensive database queries to improve response times.

## Targets
- List endpoints: 60s TTL
- User profile: 5min TTL
- Static config/lookups: 1hr TTL

## Tasks
- [ ] Identify top 5 slow endpoints via profiling
- [ ] Implement cache-aside pattern
- [ ] Add cache invalidation on write
- [ ] Monitor cache hit rate (target >80%)

## Acceptance Criteria
- [ ] p95 latency reduced by >50% for cached endpoints
- [ ] Cache hit rate >80% in production`,
    });
  }

  if (hasSearch) {
    issues.push({
      title: `Feature: ${bp.search_engine} full-text search`,
      labels: ["feature", "search", "P2"],
      milestone: "Milestone 3: Scale & Polish",
      priority: "P2",
      body: `## Overview
Implement full-text search using ${bp.search_engine}.

## Tasks
- [ ] Set up ${bp.search_engine} instance
- [ ] Design index schema and mappings
- [ ] Implement sync from ${bp.primary_db || "PostgreSQL"}
- [ ] Build search API endpoint with filtering
- [ ] Add relevance tuning

## Acceptance Criteria
- [ ] Search returns results in < 100ms
- [ ] Handles typos/fuzzy matching
- [ ] Results stay in sync with DB`,
    });
  }

  if (hasQueue) {
    issues.push({
      title: `Infrastructure: Set up ${bp.message_bus} background job queue`,
      labels: ["infrastructure", "performance", "P2"],
      milestone: "Milestone 3: Scale & Polish",
      priority: "P2",
      body: `## Overview
Move heavy operations off the request path into background jobs.

## Jobs to implement
- Email sending
- Webhook delivery
- Report generation
- Data exports

## Tasks
- [ ] Configure ${bp.message_bus}
- [ ] Implement retry logic with exponential backoff
- [ ] Add job monitoring dashboard
- [ ] Dead letter queue for failed jobs
- [ ] Alerting on job failures

## Acceptance Criteria
- [ ] Jobs survive worker restart
- [ ] Failed jobs retried 3x before DLQ
- [ ] Monitoring alerts on queue depth > 1000`,
    });
  }

  // ── Milestone 4: Operations ──────────────────────────────────────────────
  issues.push({
    title: "Operations: Add observability (logging, metrics, tracing)",
    labels: ["infrastructure", "operations", "P2"],
    milestone: "Milestone 4: Operations",
    priority: "P2",
    body: `## Overview
Add production-grade observability so we can debug issues quickly.

## Tasks
- [ ] Structured JSON logging (every request logged with trace_id)
- [ ] Error tracking with Sentry (free tier)
- [ ] Uptime monitoring with Betterstack or UptimeRobot (free)
- [ ] Basic metrics dashboard
- [ ] Alerting on error rate > 1%

## Acceptance Criteria
- [ ] Can find any request by trace ID in logs
- [ ] Errors automatically create Sentry issues
- [ ] On-call alert if service goes down`,
  });

  issues.push({
    title: "Security: Penetration testing and security hardening",
    labels: ["security", "P2"],
    milestone: "Milestone 4: Operations",
    priority: "P2",
    body: `## Overview
Security review and hardening before launch.

## Tasks
- [ ] Run OWASP ZAP or Burp Suite scan
- [ ] Review all endpoints for auth bypass
- [ ] Check for SQL injection vulnerability
- [ ] Rate limiting on all public endpoints
- [ ] Security headers (HSTS, CSP, X-Frame-Options)
- [ ] Dependency audit (npm audit / safety check)

## Acceptance Criteria
- [ ] No critical OWASP top 10 vulnerabilities
- [ ] All endpoints authenticated where required`,
  });

  return issues;
}

function IssueCard({ issue, index }: { issue: Issue; index: number }) {
  const [open, setOpen]   = useState(false);
  const [copied, setCopied] = useState(false);
  const p = PRIORITY_COLOR[issue.priority];

  const markdownText = `## ${issue.title}\n\n**Labels:** ${issue.labels.join(", ")}\n**Milestone:** ${issue.milestone}\n**Priority:** ${issue.priority}\n\n${issue.body}`;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}
      style={{ borderRadius: 11, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden", background: "rgba(255,255,255,0.02)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", cursor: "pointer" }} onClick={() => setOpen(o => !o)}>
        <div style={{ padding: "2px 7px", borderRadius: 5, background: p.bg, border: `1px solid ${p.border}`, fontSize: 9, fontWeight: 800, color: p.text, fontFamily: "'JetBrains Mono',monospace", flexShrink: 0 }}>{issue.priority}</div>
        <p style={{ fontSize: 12, fontWeight: 600, color: "#e5e7eb", flex: 1, lineHeight: 1.3 }}>{issue.title}</p>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {issue.labels.slice(0,2).map(l => (
            <span key={l} style={{ fontSize: 9, padding: "1px 6px", borderRadius: 99, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#6b7280", fontFamily: "'JetBrains Mono',monospace" }}>{l}</span>
          ))}
        </div>
        {open ? <ChevronDown size={12} style={{ color: "#6b7280", flexShrink: 0 }} /> : <ChevronRight size={12} style={{ color: "#6b7280", flexShrink: 0 }} />}
      </div>

      {/* Body */}
      {open && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "12px 14px" }}>
          <pre style={{ fontSize: 11, color: "#d1d5db", whiteSpace: "pre-wrap", lineHeight: 1.7, margin: 0, fontFamily: "inherit" }}>{issue.body}</pre>
          <button onClick={() => { navigator.clipboard.writeText(markdownText); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: copied ? "#4ade80" : "#9ca3af" }}>
            {copied ? <><Check size={11}/> Copied!</> : <><Copy size={11}/> Copy issue</>}
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default function GitHubIssuesExport({ result }: P) {
  const issues    = generateIssues(result);
  const [copied, setCopied]   = useState(false);
  const [filter, setFilter]   = useState<string>("All");

  const milestones = ["All", ...Array.from(new Set(issues.map(i => i.milestone)))];
  const filtered   = filter === "All" ? issues : issues.filter(i => i.milestone === filter);

  const copyAll = () => {
    const text = issues.map(i =>
      `# ${i.title}\n**Labels:** ${i.labels.join(", ")}\n**Milestone:** ${i.milestone}\n\n${i.body}\n\n---`
    ).join("\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 3 }}>GitHub Issues Export</p>
          <p style={{ fontSize: 11, color: "#6b7280" }}>{issues.length} issues generated from your architecture and roadmap</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={copyAll}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", background: copied ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.05)", border: `1px solid ${copied ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.1)"}`, color: copied ? "#4ade80" : "#9ca3af" }}>
            {copied ? <><Check size={12}/> Copied all!</> : <><Copy size={12}/> Copy all issues</>}
          </button>
          <a href="https://github.com/issues" target="_blank" rel="noopener"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#9ca3af", textDecoration: "none" }}>
            <Github size={12}/> GitHub
          </a>
        </div>
      </div>

      {/* Milestone filter */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        {milestones.map(m => (
          <button key={m} onClick={() => setFilter(m)}
            style={{ padding: "4px 10px", borderRadius: 99, fontSize: 10, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
              background: filter === m ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${filter === m ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)"}`,
              color: filter === m ? "#fff" : "#6b7280",
            }}>{m === "All" ? `All (${issues.length})` : m.split(":")[0]}</button>
        ))}
      </div>

      {/* Issues */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {filtered.map((issue, i) => <IssueCard key={i} issue={issue} index={i} />)}
      </div>

      <p style={{ fontSize: 11, color: "#374151", textAlign: "center" }}>
        Click any issue to expand · Copy individual issues or all at once to paste into GitHub
      </p>
    </div>
  );
}
