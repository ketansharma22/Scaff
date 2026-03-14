# ⚡ Scaff Frontend

Professional Next.js 14 frontend for the AI System Architecture Generator.

**Design:** Vercel-dark aesthetic — obsidian background, electric blue accents, Cabinet Grotesk typography, animated radial mesh gradients.

---

## What's inside

```
scaff/
├── app/
│   ├── layout.tsx          ← Root layout (fonts, providers, mesh background)
│   ├── globals.css         ← Full design system (tokens, animations, components)
│   ├── page.tsx            ← Landing page (hero, input, features)
│   └── dashboard/
│       └── page.tsx        ← Results dashboard (blueprint + diagram tabs)
├── components/
│   ├── layout/Header.tsx
│   ├── blueprint/BlueprintViewer.tsx   ← All result sections
│   └── diagram/DiagramCanvas.tsx       ← React Flow interactive diagram
├── lib/
│   ├── api/client.ts       ← Typed axios wrapper + all API calls
│   └── store/appStore.ts   ← Zustand global state
├── Dockerfile
├── next.config.js
├── tailwind.config.js
└── .env.local              ← NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## ── Running Locally ──────────────────────────────────────────────

### Step 1 — Start the AI engine first

The frontend calls the AI engine at `http://localhost:8000`. It needs to be running.

**Option A: Mock mode (instant, no model download)**
```bash
cd path/to/arch-gen/apps/ai-engine
cp .env.example .env          # MOCK_MODE=true by default
pip install -e ".[dev]" --break-system-packages
uvicorn app.main:app --reload --port 8000
```

**Option B: Real Ollama (~2GB download, real AI)**
```bash
# Start infra
docker compose up -d ollama postgres redis qdrant

# Download model (one-time, ~2GB, takes 5–10 min)
docker compose exec ollama ollama pull llama3.2
docker compose exec ollama ollama pull nomic-embed-text

# Seed knowledge base
cd apps/ai-engine
MOCK_MODE=false python scripts/setup_dev.py

# Start engine
MOCK_MODE=false uvicorn app.main:app --reload --port 8000
```

Verify the engine is running:
```bash
curl http://localhost:8000/health
# Should return: {"status":"ok","mock_mode":true}
```

---

### Step 2 — Start the frontend

```bash
# From this directory (scaff/)
npm install --legacy-peer-deps
npm run dev
```

Open: **http://localhost:3000**

---

### How it works end-to-end

1. User types a product description and clicks Generate
2. Frontend calls `POST /v1/generate/sync` on the AI engine
3. AI engine: parses → 18 decision rules → RAG + LLM → returns JSON blueprint
4. Zustand stores the result, router pushes to `/dashboard`
5. Dashboard renders blueprint cards + React Flow diagram

---

## ── Publishing ───────────────────────────────────────────────────

### Option 1 — Vercel (recommended, free tier)

Vercel is made by the same team as Next.js. Perfect fit.

```bash
# Install Vercel CLI
npm install -g vercel

# From this directory
vercel

# Answer the prompts:
# - Set up and deploy: Y
# - Which scope: your account
# - Link to existing project: N
# - Project name: scaff (or whatever)
# - Directory: ./
# - Override settings: N

# Set environment variable in Vercel dashboard:
# Settings → Environment Variables:
# NEXT_PUBLIC_API_URL = https://your-backend-url.com

# Future deploys are automatic on git push
vercel --prod
```

**Your frontend is live at:** `https://scaff-xyz.vercel.app`

**Important:** Vercel hosts the frontend only. You still need the AI engine running somewhere (see backend deployment below).

---

### Option 2 — Netlify (free tier)

```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=.next
```

---

### Option 3 — Docker (self-hosted)

```bash
# Build image
docker build -t scaff-frontend .

# Run
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=https://your-api.com \
  scaff-frontend
```

---

## ── Backend Deployment ────────────────────────────────────────────

The AI engine needs to run somewhere accessible from the internet if you deploy the frontend.

### Cheapest option: Hetzner VPS (€4.15/month)

```bash
# 1. Rent a Hetzner CX21 (4GB RAM, 2 vCPU): https://hetzner.com/cloud
# 2. SSH into it
ssh root@YOUR_VPS_IP

# 3. Install Docker
curl -fsSL https://get.docker.com | sh

# 4. Clone your repo
git clone https://github.com/you/arch-gen.git
cd arch-gen

# 5. Start infra
cp .env.example .env
docker compose up -d ollama postgres redis qdrant

# 6. Pull Ollama model (~2GB)
docker compose exec ollama ollama pull llama3.2
docker compose exec ollama ollama pull nomic-embed-text

# 7. Set env + start AI engine
echo "MOCK_MODE=false" >> .env
cd apps/ai-engine
pip install -e ".[dev]"
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 &

# 8. Point domain DNS to VPS IP
# Add A record: api.scaff.yourdomain.com → YOUR_VPS_IP

# 9. Optional: SSL with Caddy (easier than nginx)
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
apt install -y caddy

cat > /etc/caddy/Caddyfile << 'CADDY'
api.scaff.yourdomain.com {
    reverse_proxy localhost:8000
}
CADDY

systemctl reload caddy
# SSL is automatic!
```

Then in Vercel dashboard set:
```
NEXT_PUBLIC_API_URL = https://api.scaff.yourdomain.com
```

---

### Railway (easiest backend deploy, ~$5/month)

```bash
npm install -g @railway/cli
railway login
cd apps/ai-engine
railway init
railway up

# Set env vars in Railway dashboard:
# MOCK_MODE=true (free tier doesn't have enough RAM for Ollama)
# or MOCK_MODE=false if you upgrade to $5/month plan
```

---

## ── Common Issues ─────────────────────────────────────────────────

**"Failed to fetch" or CORS error**
→ AI engine is not running. Start it: `cd apps/ai-engine && uvicorn app.main:app --reload`

**"Generation failed. Is the AI engine running on port 8000?"**
→ Check: `curl http://localhost:8000/health`
→ If ECONNREFUSED: engine isn't started
→ If 404: engine started but generate route missing

**Slow generation (45–90 seconds)**
→ Normal on CPU with real Ollama. Use MOCK_MODE=true for development.

**"Module not found: reactflow"**
→ Run: `npm install --legacy-peer-deps`

**Diagram shows blank / crashes**
→ Check browser console. Usually means `blueprint.services` is empty — mock mode still returns valid data.

**Port 3000 already in use**
→ `lsof -ti:3000 | xargs kill -9`

---

## ── Tech Stack ────────────────────────────────────────────────────

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 14 App Router | SSR, file routing, Vercel integration |
| State | Zustand | Lightweight, no boilerplate |
| Server state | TanStack Query | Caching, refetch, loading states |
| Animations | Framer Motion | Production-grade motion |
| Diagram | React Flow | Best-in-class node graph library |
| Styling | Tailwind CSS + CSS vars | Utility + design tokens |
| HTTP | Axios | Typed, interceptors, timeout |
| Fonts | Cabinet Grotesk + JetBrains Mono | Distinctive, not generic |
