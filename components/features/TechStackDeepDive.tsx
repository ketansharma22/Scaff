"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, ChevronRight, Star, AlertTriangle, BookOpen } from "lucide-react";
import type { GenResult } from "@/lib/api/client";

interface P { result: GenResult; }

interface TechInfo {
  name: string; emoji: string; category: string; color: string;
  why: string; pros: string[]; cons: string[]; setupSteps: string[];
  alternatives: { name: string; when: string }[];
  learnUrl: string; docsUrl: string;
  difficulty: "Easy" | "Medium" | "Hard";
  popularWith: string;
}

const TECH_DB: Record<string, TechInfo> = {
  postgresql: {
    name: "PostgreSQL", emoji: "🐘", category: "Database", color: "#336791",
    why: "The gold standard relational database. ACID compliant, excellent JSON support, mature ecosystem, and free. Handles 99% of use cases perfectly up to millions of rows.",
    pros: ["Full ACID transactions", "Excellent JSON/JSONB support", "Rich indexing (GiST, GIN, BRIN)", "Row-level security built in", "Free and open source"],
    cons: ["Vertical scaling only (read replicas for reads)", "Operational overhead at very large scale", "Connection management needs care (use PgBouncer)"],
    setupSteps: ["Install via Supabase (free) or Railway ($5/mo)", "Run migrations with Alembic (Python) or Prisma (JS)", "Set connection pool size = (CPU cores × 2) + disk spindles", "Enable pg_stat_statements for query monitoring", "Set up daily backups via pg_dump or managed service"],
    alternatives: [
      { name: "MySQL/MariaDB", when: "Team already knows it, simpler replication needs" },
      { name: "MongoDB", when: "Truly schemaless data, document-heavy workloads" },
      { name: "SQLite", when: "Local dev, embedded apps, < 100 concurrent writes" },
      { name: "PlanetScale", when: "Need MySQL with zero-downtime schema changes" },
    ],
    learnUrl: "https://www.postgresqltutorial.com", docsUrl: "https://www.postgresql.org/docs",
    difficulty: "Medium", popularWith: "Django · FastAPI · Rails · Laravel",
  },
  mongodb: {
    name: "MongoDB", emoji: "🍃", category: "Database", color: "#4db33d",
    why: "Document database that stores JSON natively. Great for flexible schemas, nested data, and when your data model changes frequently.",
    pros: ["Flexible schema — no migrations for new fields", "Native JSON documents", "Horizontal scaling via sharding", "Great for nested/hierarchical data", "Atlas free tier available"],
    cons: ["No joins (must embed or reference manually)", "No multi-document transactions in old versions", "Can encourage bad data modeling", "Higher storage overhead"],
    setupSteps: ["Use MongoDB Atlas free tier (512MB)", "Install Mongoose (JS) or Motor (Python async)", "Design your document schema carefully upfront", "Add indexes for all query fields", "Set up Atlas backups"],
    alternatives: [
      { name: "PostgreSQL", when: "Relational data, need transactions, team knows SQL" },
      { name: "DynamoDB", when: "AWS ecosystem, need massive scale, simple access patterns" },
      { name: "Firestore", when: "Real-time sync, mobile apps, GCP ecosystem" },
    ],
    learnUrl: "https://learn.mongodb.com", docsUrl: "https://www.mongodb.com/docs",
    difficulty: "Easy", popularWith: "Node.js · Express · Fastify",
  },
  redis: {
    name: "Redis", emoji: "⚡", category: "Cache / Queue", color: "#dc382c",
    why: "In-memory data store — blazing fast for caching, sessions, rate limiting, and pub/sub. The Swiss Army knife of backend infrastructure.",
    pros: ["Sub-millisecond latency", "Rich data types (lists, sets, sorted sets, streams)", "Built-in pub/sub", "TTL (auto-expiry) on any key", "Upstash free tier available"],
    cons: ["Data lost on restart (unless persistence configured)", "Memory-limited — can get expensive at scale", "Single-threaded (by design)", "Not a primary datastore"],
    setupSteps: ["Use Upstash free tier (10k commands/day)", "Install ioredis (Node) or redis-py (Python)", "Cache hot DB queries with 5–60min TTL", "Use for session storage instead of DB", "Set maxmemory-policy = allkeys-lru to auto-evict"],
    alternatives: [
      { name: "Memcached", when: "Simple key-value caching only, multi-threaded needed" },
      { name: "DragonflyDB", when: "Drop-in Redis replacement, much better memory efficiency" },
      { name: "Valkey", when: "Open-source Redis fork, community-maintained" },
    ],
    learnUrl: "https://redis.io/learn", docsUrl: "https://redis.io/docs",
    difficulty: "Easy", popularWith: "All stacks — universal tool",
  },
  celery: {
    name: "Celery", emoji: "🌿", category: "Task Queue", color: "#b0cc54",
    why: "Distributed task queue for Python. Run background jobs (emails, reports, webhooks) without blocking your API requests.",
    pros: ["Mature Python ecosystem", "Retry logic built in", "Scheduled tasks (cron-like)", "Multiple broker support (Redis, RabbitMQ)", "Result backend for tracking"],
    cons: ["Python only", "Debugging can be tricky", "Monitoring needs Flower or similar", "Can be complex to configure properly"],
    setupSteps: ["pip install celery redis", "Configure CELERY_BROKER_URL = Redis URL", "Define tasks with @app.task decorator", "Run worker: celery -A myapp worker --loglevel=info", "Use Flower for monitoring (celery flower)"],
    alternatives: [
      { name: "Dramatiq", when: "Simpler API than Celery, also Python" },
      { name: "RQ (Redis Queue)", when: "Simpler than Celery, Redis only, easier debugging" },
      { name: "BullMQ", when: "Node.js stack, excellent monitoring UI" },
      { name: "Inngest", when: "Serverless functions, great DX, free tier" },
    ],
    learnUrl: "https://docs.celeryq.dev/en/stable/getting-started", docsUrl: "https://docs.celeryq.dev",
    difficulty: "Medium", popularWith: "Django · FastAPI · Flask",
  },
  kafka: {
    name: "Apache Kafka", emoji: "📨", category: "Message Queue", color: "#231f20",
    why: "Distributed event streaming platform. Use when you need high-throughput event processing, event sourcing, or decoupling many services.",
    pros: ["Extremely high throughput (millions of msg/sec)", "Message replay — consumers can re-read history", "Multiple consumer groups", "Durable storage", "Kafka Streams for processing"],
    cons: ["Complex to operate (ZooKeeper/KRaft)", "Overkill for most apps", "Steep learning curve", "Higher latency than Redis pub/sub", "Expensive managed options"],
    setupSteps: ["Use Confluent Cloud free tier or Upstash Kafka", "Install confluent-kafka-python or node-rdkafka", "Design topics carefully (partition count matters)", "Set retention policy based on replay needs", "Use Schema Registry for message contracts"],
    alternatives: [
      { name: "Redis Streams", when: "< 1M msg/day, simpler, already using Redis" },
      { name: "RabbitMQ", when: "Complex routing rules, per-message acknowledgment" },
      { name: "AWS SQS/SNS", when: "AWS ecosystem, serverless, simple queuing" },
      { name: "NATS", when: "Ultra-low latency, lightweight, Kubernetes-native" },
    ],
    learnUrl: "https://kafka.apache.org/quickstart", docsUrl: "https://kafka.apache.org/documentation",
    difficulty: "Hard", popularWith: "Microservices · Event-driven · Data pipelines",
  },
  elasticsearch: {
    name: "Elasticsearch", emoji: "🔍", category: "Search", color: "#f5a623",
    why: "Full-text search and analytics engine. When your users need powerful search with filtering, facets, fuzzy matching, and relevance ranking.",
    pros: ["Powerful full-text search", "Aggregations and analytics", "Scalable horizontally", "REST API", "Kibana for visualization"],
    cons: ["Resource-heavy (needs 2GB+ RAM)", "Complex to tune relevance", "Operational overhead", "Expensive managed options", "Not a primary DB"],
    setupSteps: ["Use Elastic Cloud free trial or self-host", "Install elasticsearch-py or @elastic/elasticsearch", "Design index mapping before inserting data", "Sync from PostgreSQL with Logstash or custom sync", "Set replicas=0 for dev, replicas=1 for prod"],
    alternatives: [
      { name: "Typesense", when: "Simpler, faster, cheaper, great free self-host option" },
      { name: "Meilisearch", when: "Easiest to set up, great for product search" },
      { name: "PostgreSQL FTS", when: "< 1M documents, don't want another service" },
      { name: "Algolia", when: "Managed, instant results, pay-per-search" },
    ],
    learnUrl: "https://www.elastic.co/guide/en/elasticsearch/reference/current/getting-started.html",
    docsUrl: "https://www.elastic.co/docs",
    difficulty: "Hard", popularWith: "E-commerce · SaaS · Content platforms",
  },
  fastapi: {
    name: "FastAPI", emoji: "🚀", category: "API Framework", color: "#009688",
    why: "Modern Python web framework with automatic OpenAPI docs, async support, and Pydantic validation. The best Python API framework in 2025.",
    pros: ["Auto-generated Swagger/OpenAPI docs", "Async/await natively", "Pydantic for request/response validation", "Excellent performance", "Type hints everywhere"],
    cons: ["Python only", "Smaller ecosystem than Express/NestJS", "Background tasks limited (use Celery for heavy work)", "Async can be tricky for beginners"],
    setupSteps: ["pip install fastapi uvicorn pydantic", "Define routes with @app.get / @app.post", "Use Pydantic models for request/response bodies", "Run: uvicorn app.main:app --reload --port 8000", "Deploy with gunicorn + uvicorn workers in prod"],
    alternatives: [
      { name: "Django REST Framework", when: "Full-featured, admin panel needed, team knows Django" },
      { name: "Flask", when: "Simple API, minimal dependencies" },
      { name: "Express", when: "Node.js stack, huge ecosystem" },
      { name: "NestJS", when: "TypeScript, enterprise structure, Angular-like" },
    ],
    learnUrl: "https://fastapi.tiangolo.com/tutorial", docsUrl: "https://fastapi.tiangolo.com",
    difficulty: "Easy", popularWith: "Python ML/AI teams · Microservices",
  },
};

function getTechsFromResult(result: GenResult): string[] {
  const bp = result.blueprint;
  const all = new Set<string>();
  const add = (v?: string | null) => v && all.add(v.toLowerCase().replace(/[_\s-]/g, ""));

  add(bp.primary_db);
  add(bp.cache);
  add(bp.search_engine);
  add(bp.message_bus);
  bp.services?.forEach(s => s.tech_stack?.forEach(t => add(t)));

  // Map common aliases
  const aliasMap: Record<string, string> = {
    redis: "redis", postgresql: "postgresql", postgres: "postgresql",
    mongodb: "mongodb", mongo: "mongodb", celery: "celery",
    kafka: "kafka", elasticsearch: "elasticsearch", opensearch: "elasticsearch",
    fastapi: "fastapi",
  };

  return Array.from(all).map(t => aliasMap[t]).filter((t): t is string => !!t && !!TECH_DB[t]);
}

const DIFF_COLOR = { Easy: "#4ade80", Medium: "#fbbf24", Hard: "#f87171" };

export default function TechStackDeepDive({ result }: P) {
  const techs = Array.from(new Set(getTechsFromResult(result)));
  const [selected, setSelected] = useState<string | null>(techs[0] || null);

  const info = selected ? TECH_DB[selected] : null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 12, alignItems: "start" }}>
      {/* Sidebar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#6b7280", marginBottom: 6, fontFamily: "'JetBrains Mono',monospace" }}>YOUR STACK</p>
        {techs.length === 0 && <p style={{ fontSize: 11, color: "#374151" }}>No recognized technologies found.</p>}
        {techs.map(t => {
          const ti = TECH_DB[t];
          return (
            <button key={t} onClick={() => setSelected(t)}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
                borderRadius: 9, cursor: "pointer", transition: "all 0.15s", textAlign: "left",
                background: selected === t ? `${ti.color}18` : "rgba(255,255,255,0.02)",
                border: `1px solid ${selected === t ? ti.color + "44" : "rgba(255,255,255,0.06)"}`,
              }}>
              <span style={{ fontSize: 16 }}>{ti.emoji}</span>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: selected === t ? "#fff" : "#9ca3af" }}>{ti.name}</p>
                <p style={{ fontSize: 9, color: "#6b7280" }}>{ti.category}</p>
              </div>
            </button>
          );
        })}

        {/* Other available techs */}
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#374151", marginTop: 10, marginBottom: 6, fontFamily: "'JetBrains Mono',monospace" }}>EXPLORE</p>
        {Object.keys(TECH_DB).filter(t => !techs.includes(t)).slice(0, 4).map(t => {
          const ti = TECH_DB[t];
          return (
            <button key={t} onClick={() => setSelected(t)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 9, cursor: "pointer", transition: "all 0.15s", textAlign: "left", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", opacity: 0.7 }}>
              <span style={{ fontSize: 14 }}>{ti.emoji}</span>
              <p style={{ fontSize: 11, color: "#6b7280" }}>{ti.name}</p>
            </button>
          );
        })}
      </div>

      {/* Detail panel */}
      <AnimatePresence mode="wait">
        {info && (
          <motion.div key={selected} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
            style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Header */}
            <div style={{ padding: "18px 20px", borderRadius: 13, border: `1px solid ${info.color}44`, background: `${info.color}0d`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 32 }}>{info.emoji}</span>
                <div>
                  <p style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 4 }}>{info.name}</p>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: `${info.color}22`, border: `1px solid ${info.color}44`, color: info.color, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>{info.category}</span>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: `${DIFF_COLOR[info.difficulty]}15`, border: `1px solid ${DIFF_COLOR[info.difficulty]}33`, color: DIFF_COLOR[info.difficulty], fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>{info.difficulty}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <a href={info.learnUrl} target="_blank" rel="noopener"
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 7, fontSize: 11, color: "#9ca3af", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", textDecoration: "none" }}>
                  <BookOpen size={11} /> Learn
                </a>
                <a href={info.docsUrl} target="_blank" rel="noopener"
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 7, fontSize: 11, color: "#9ca3af", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", textDecoration: "none" }}>
                  <ExternalLink size={11} /> Docs
                </a>
              </div>
            </div>

            {/* Why */}
            <div style={{ padding: "14px 16px", borderRadius: 11, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", fontFamily: "'JetBrains Mono',monospace", marginBottom: 8 }}>WHY THIS?</p>
              <p style={{ fontSize: 13, color: "#e5e7eb", lineHeight: 1.6 }}>{info.why}</p>
              <p style={{ fontSize: 11, color: "#6b7280", marginTop: 8 }}>Popular with: {info.popularWith}</p>
            </div>

            {/* Pros / Cons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ padding: "14px 16px", borderRadius: 11, border: "1px solid rgba(74,222,128,0.15)", background: "rgba(74,222,128,0.05)" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#4ade80", fontFamily: "'JetBrains Mono',monospace", marginBottom: 8 }}>STRENGTHS</p>
                {info.pros.map(p => (
                  <div key={p} style={{ display: "flex", gap: 6, marginBottom: 5 }}>
                    <Star size={9} style={{ color: "#4ade80", marginTop: 3, flexShrink: 0 }} />
                    <p style={{ fontSize: 11, color: "#d1d5db", lineHeight: 1.4 }}>{p}</p>
                  </div>
                ))}
              </div>
              <div style={{ padding: "14px 16px", borderRadius: 11, border: "1px solid rgba(251,191,36,0.15)", background: "rgba(251,191,36,0.05)" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#fbbf24", fontFamily: "'JetBrains Mono',monospace", marginBottom: 8 }}>WATCH OUT FOR</p>
                {info.cons.map(c => (
                  <div key={c} style={{ display: "flex", gap: 6, marginBottom: 5 }}>
                    <AlertTriangle size={9} style={{ color: "#fbbf24", marginTop: 3, flexShrink: 0 }} />
                    <p style={{ fontSize: 11, color: "#d1d5db", lineHeight: 1.4 }}>{c}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Setup steps */}
            <div style={{ padding: "14px 16px", borderRadius: 11, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", fontFamily: "'JetBrains Mono',monospace", marginBottom: 10 }}>SETUP GUIDE</p>
              {info.setupSteps.map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                  <div style={{ width: 18, height: 18, borderRadius: 5, background: `${info.color}22`, border: `1px solid ${info.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: info.color, flexShrink: 0, fontFamily: "'JetBrains Mono',monospace" }}>{i + 1}</div>
                  <p style={{ fontSize: 12, color: "#d1d5db", lineHeight: 1.5 }}>{step}</p>
                </div>
              ))}
            </div>

            {/* Alternatives */}
            <div style={{ padding: "14px 16px", borderRadius: 11, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", fontFamily: "'JetBrains Mono',monospace", marginBottom: 10 }}>ALTERNATIVES</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {info.alternatives.map(a => (
                  <div key={a.name} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <ChevronRight size={11} style={{ color: "#374151", marginTop: 3, flexShrink: 0 }} />
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#e5e7eb" }}>{a.name}</span>
                      <span style={{ fontSize: 11, color: "#6b7280" }}> — {a.when}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
