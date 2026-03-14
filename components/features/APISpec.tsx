"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, ChevronDown, ChevronRight } from "lucide-react";
import type { GenResult } from "@/lib/api/client";

interface P { result: GenResult; }

function inferEndpoints(result: GenResult) {
  const { blueprint: bp, requirements: req } = result;
  const features = req.features || [];
  const endpoints: { method: string; path: string; summary: string; body?: object; response: object; tag: string }[] = [];

  const hasAuth    = features.some(f => f.includes("auth"));
  const hasPayment = features.some(f => f.includes("payment") || f.includes("billing"));
  const hasSearch  = features.some(f => f.includes("search")) || !!bp.search_engine;
  const hasFiles   = features.some(f => f.includes("file") || f.includes("upload"));
  const hasTeams   = features.some(f => f.includes("team") || f.includes("org"));

  // Auth
  if (hasAuth) {
    endpoints.push(
      { method: "POST", path: "/auth/register",  summary: "Register a new user",   tag: "Auth",
        body: { email: "string", password: "string", name: "string" },
        response: { token: "string", refresh_token: "string", user: { id: "uuid", email: "string" } } },
      { method: "POST", path: "/auth/login",     summary: "Login with credentials", tag: "Auth",
        body: { email: "string", password: "string" },
        response: { token: "string", refresh_token: "string" } },
      { method: "POST", path: "/auth/refresh",   summary: "Refresh access token",  tag: "Auth",
        body: { refresh_token: "string" },
        response: { token: "string" } },
      { method: "POST", path: "/auth/logout",    summary: "Logout current session", tag: "Auth",
        response: { success: true } },
      { method: "GET",  path: "/users/me",       summary: "Get current user profile", tag: "Users",
        response: { id: "uuid", email: "string", name: "string", created_at: "datetime" } },
      { method: "PATCH", path: "/users/me",      summary: "Update profile", tag: "Users",
        body: { name: "string?", avatar_url: "string?" },
        response: { id: "uuid", email: "string", name: "string" } },
    );
  }

  // Teams / Orgs
  if (hasTeams) {
    endpoints.push(
      { method: "POST", path: "/teams",              summary: "Create a team",         tag: "Teams",
        body: { name: "string", slug: "string" },
        response: { id: "uuid", name: "string", slug: "string" } },
      { method: "GET",  path: "/teams/{team_id}",    summary: "Get team details",      tag: "Teams",
        response: { id: "uuid", name: "string", members: "Member[]" } },
      { method: "POST", path: "/teams/{team_id}/members", summary: "Invite member",   tag: "Teams",
        body: { email: "string", role: "admin | member | viewer" },
        response: { invitation_id: "uuid" } },
      { method: "DELETE", path: "/teams/{team_id}/members/{user_id}", summary: "Remove member", tag: "Teams",
        response: { success: true } },
    );
  }

  // Main resource (infer from services)
  const mainService = bp.services?.find(s => !["worker","gateway","api_gateway","cache"].some(w => s.name.toLowerCase().includes(w)));
  const resource = mainService?.name || "items";
  endpoints.push(
    { method: "GET",    path: `/${resource}`,            summary: `List ${resource}`,     tag: "Core",
      response: { data: `${resource}[]`, total: "number", page: "number", limit: "number" } },
    { method: "POST",   path: `/${resource}`,            summary: `Create ${resource}`,   tag: "Core",
      body: { name: "string", description: "string?" },
      response: { id: "uuid", name: "string", created_at: "datetime" } },
    { method: "GET",    path: `/${resource}/{id}`,       summary: `Get ${resource} by ID`, tag: "Core",
      response: { id: "uuid", name: "string", description: "string", created_at: "datetime", updated_at: "datetime" } },
    { method: "PATCH",  path: `/${resource}/{id}`,       summary: `Update ${resource}`,   tag: "Core",
      body: { name: "string?", description: "string?" },
      response: { id: "uuid", name: "string" } },
    { method: "DELETE", path: `/${resource}/{id}`,       summary: `Delete ${resource}`,   tag: "Core",
      response: { success: true } },
  );

  // Search
  if (hasSearch) {
    endpoints.push(
      { method: "GET", path: "/search", summary: "Full-text search", tag: "Search",
        response: { results: "SearchResult[]", total: "number", took_ms: "number" } }
    );
  }

  // Payments
  if (hasPayment) {
    endpoints.push(
      { method: "POST", path: "/billing/checkout",    summary: "Create Stripe checkout session", tag: "Billing",
        body: { plan_id: "string", success_url: "string", cancel_url: "string" },
        response: { checkout_url: "string" } },
      { method: "GET",  path: "/billing/subscription", summary: "Get current subscription",     tag: "Billing",
        response: { plan: "string", status: "active|canceled", next_billing: "datetime" } },
      { method: "POST", path: "/webhooks/stripe",      summary: "Stripe webhook receiver",       tag: "Billing",
        response: { received: true } },
    );
  }

  // Files
  if (hasFiles) {
    endpoints.push(
      { method: "POST", path: "/uploads",         summary: "Upload file (multipart)", tag: "Files",
        body: { file: "binary", purpose: "string" },
        response: { url: "string", key: "string", size: "number" } },
      { method: "DELETE", path: "/uploads/{key}", summary: "Delete uploaded file",   tag: "Files",
        response: { success: true } },
    );
  }

  // Health
  endpoints.push(
    { method: "GET", path: "/health", summary: "Health check", tag: "System",
      response: { status: "ok", version: "string", uptime: "number" } }
  );

  return endpoints;
}

const METHOD_COLOR: Record<string, { bg: string; text: string }> = {
  GET:    { bg: "rgba(74,222,128,0.12)",  text: "#4ade80" },
  POST:   { bg: "rgba(77,158,247,0.12)",  text: "#4d9ef7" },
  PATCH:  { bg: "rgba(251,191,36,0.12)",  text: "#fbbf24" },
  PUT:    { bg: "rgba(251,191,36,0.12)",  text: "#fbbf24" },
  DELETE: { bg: "rgba(248,113,113,0.12)", text: "#f87171" },
};

function EndpointRow({ ep }: { ep: ReturnType<typeof inferEndpoints>[0] }) {
  const [open, setOpen] = useState(false);
  const mc = METHOD_COLOR[ep.method] || { bg: "rgba(255,255,255,0.06)", text: "#9ca3af" };

  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 12,
          padding: "11px 16px", background: "none", border: "none", cursor: "pointer",
          textAlign: "left", transition: "background 0.15s",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
        onMouseLeave={e => (e.currentTarget.style.background = "none")}
      >
        <span style={{
          fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 5,
          background: mc.bg, color: mc.text,
          fontFamily: "'JetBrains Mono', monospace", minWidth: 52, textAlign: "center",
        }}>{ep.method}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#e5e7eb", flex: 1 }}>{ep.path}</span>
        <span style={{ fontSize: 11, color: "#6b7280", flex: 2 }}>{ep.summary}</span>
        <span style={{ color: "#374151" }}>{open ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            style={{ overflow: "hidden" }}>
            <div style={{ padding: "0 16px 14px 16px", display: "grid", gridTemplateColumns: ep.body ? "1fr 1fr" : "1fr", gap: 12, marginLeft: 64 }}>
              {ep.body && (
                <div>
                  <p style={{ fontSize: 10, color: "#6b7280", fontFamily: "'JetBrains Mono',monospace", marginBottom: 6 }}>REQUEST BODY</p>
                  <pre style={{ fontSize: 11, color: "#a78bfa", background: "rgba(255,255,255,0.03)", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", overflow: "auto", lineHeight: 1.6, margin: 0 }}>
                    {JSON.stringify(ep.body, null, 2)}
                  </pre>
                </div>
              )}
              <div>
                <p style={{ fontSize: 10, color: "#6b7280", fontFamily: "'JetBrains Mono',monospace", marginBottom: 6 }}>RESPONSE 200</p>
                <pre style={{ fontSize: 11, color: "#4ade80", background: "rgba(255,255,255,0.03)", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", overflow: "auto", lineHeight: 1.6, margin: 0 }}>
                  {JSON.stringify(ep.response, null, 2)}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function APISpec({ result }: P) {
  const [copied, setCopied] = useState(false);
  const [activeTag, setActiveTag] = useState("All");
  const endpoints = inferEndpoints(result);
  const tags = ["All", ...Array.from(new Set(endpoints.map(e => e.tag)))];
  const filtered = activeTag === "All" ? endpoints : endpoints.filter(e => e.tag === activeTag);

  const handleCopyOpenAPI = () => {
    const spec = {
      openapi: "3.0.0",
      info: { title: `${result.blueprint.architecture_pattern} API`, version: "1.0.0" },
      paths: Object.fromEntries(
        endpoints.map(e => [e.path, {
          [e.method.toLowerCase()]: {
            summary: e.summary,
            tags: [e.tag],
            responses: { "200": { description: "Success" } },
          }
        }])
      ),
    };
    navigator.clipboard.writeText(JSON.stringify(spec, null, 2));
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 3 }}>API Specification Preview</p>
          <p style={{ fontSize: 11, color: "#6b7280" }}>{endpoints.length} endpoints inferred from your architecture</p>
        </div>
        <button onClick={handleCopyOpenAPI}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", background: "rgba(77,158,247,0.08)", border: "1px solid rgba(77,158,247,0.2)", color: "#4d9ef7", transition: "all 0.15s" }}>
          {copied ? <><Check size={12}/> Copied OpenAPI</> : <><Copy size={12}/> Copy OpenAPI JSON</>}
        </button>
      </div>

      {/* Tag filter */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {tags.map(t => (
          <button key={t} onClick={() => setActiveTag(t)}
            style={{ padding: "4px 12px", borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
              background: activeTag === t ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${activeTag === t ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)"}`,
              color: activeTag === t ? "#fff" : "#6b7280",
            }}>{t}</button>
        ))}
      </div>

      {/* Endpoints */}
      <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden", background: "rgba(255,255,255,0.02)" }}>
        {/* Table header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          <span style={{ fontSize: 9, color: "#374151", fontFamily: "'JetBrains Mono',monospace", minWidth: 52 }}>METHOD</span>
          <span style={{ fontSize: 9, color: "#374151", fontFamily: "'JetBrains Mono',monospace", flex: 1 }}>PATH</span>
          <span style={{ fontSize: 9, color: "#374151", fontFamily: "'JetBrains Mono',monospace", flex: 2 }}>DESCRIPTION</span>
          <span style={{ width: 13 }} />
        </div>
        {filtered.map((ep, i) => <EndpointRow key={i} ep={ep} />)}
      </div>

      <p style={{ fontSize: 11, color: "#374151", textAlign: "center" }}>
        Click any endpoint to expand request/response schema · Inferred from your services & features
      </p>
    </div>
  );
}
