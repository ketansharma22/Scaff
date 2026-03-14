"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/auth/supabase-browser";
import { useAuth } from "@/lib/auth/AuthContext";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "Number", ok: /[0-9]/.test(password) },
    { label: "Special char", ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ["#f87171", "#f87171", "#fbbf24", "#4ade80"];
  const labels = ["Weak", "Weak", "Fair", "Strong"];

  if (!password) return null;

  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i < score ? colors[score - 1] : "rgba(255,255,255,0.08)", transition: "background 0.2s" }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontSize: 10, color: score > 0 ? colors[score - 1] : "#6b7280", fontFamily: "'JetBrains Mono',monospace" }}>
          {score > 0 ? labels[score - 1] : ""}
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          {checks.map(c => (
            <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: c.ok ? "#4ade80" : "rgba(255,255,255,0.1)", transition: "background 0.2s" }} />
              <span style={{ fontSize: 9, color: c.ok ? "#4ade80" : "rgba(255,255,255,0.25)" }}>{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function SignupPage() {
  const router  = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPass, setShowPass]   = useState(false);
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess]     = useState(false);

  useEffect(() => {
    if (!authLoading && user) router.push("/");
  }, [user, authLoading, router]);

  const sb = getSupabaseBrowser();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true); setError("");

    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) { setError(error.message); setLoading(false); return; }

    // If email confirmation is disabled in Supabase — user is immediately active
    if (data.session) {
      router.push("/");
    } else {
      // Email confirmation required
      setSuccess(true);
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setGoogleLoading(true); setError("");
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setGoogleLoading(false); }
  };

  if (success) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#050505", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          style={{ maxWidth: 400, textAlign: "center", padding: "48px 40px", borderRadius: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>📬</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 10, letterSpacing: "-0.03em" }}>Check your email</h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, marginBottom: 24 }}>
            We sent a confirmation link to <strong style={{ color: "#fff" }}>{email}</strong>. Click it to activate your account.
          </p>
          <Link href="/login" style={{ display: "inline-block", padding: "10px 24px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            Back to sign in
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#050505", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Left panel */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
        style={{
          flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between",
          padding: "48px 56px", borderRight: "1px solid rgba(255,255,255,0.05)",
          background: "linear-gradient(135deg, #070710 0%, #050505 100%)",
          position: "relative", overflow: "hidden",
        }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.03, backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div style={{ position: "absolute", top: "30%", right: "5%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(167,139,250,0.07) 0%, transparent 70%)", filter: "blur(40px)" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #4d9ef7, #a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: "#fff" }}>A</div>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>Scaff</span>
          </div>
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#a78bfa", fontFamily: "'JetBrains Mono',monospace", marginBottom: 16 }}>JOIN THE BETA</p>
          <h1 style={{ fontSize: 38, fontWeight: 900, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1.1, marginBottom: 20 }}>
            Ship architecture<br />with confidence.
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, maxWidth: 380 }}>
            From idea to production blueprint in 30 seconds. No architecture degree required.
          </p>

          {/* Social proof */}
          <div style={{ marginTop: 40, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex" }}>
              {["#4d9ef7","#a78bfa","#4ade80","#fbbf24"].map((c, i) => (
                <div key={c} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: "2px solid #050505", marginLeft: i > 0 ? -8 : 0, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700 }}>
                  {["K","A","R","S"][i]}
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
              Join engineers already using Scaff
            </p>
          </div>
        </div>

        <p style={{ position: "relative", zIndex: 1, fontSize: 11, color: "rgba(255,255,255,0.2)" }}>Free during beta · No credit card required</p>
      </motion.div>

      {/* Right panel — form */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
        style={{ width: 480, display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px 56px" }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", marginBottom: 6 }}>Create your account</h2>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 32 }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#4d9ef7", textDecoration: "none", fontWeight: 600 }}>Sign in</Link>
        </p>

        {/* Google */}
        <button onClick={handleGoogle} disabled={googleLoading}
          style={{ width: "100%", padding: "13px 16px", borderRadius: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 14, fontWeight: 600, transition: "all 0.2s", marginBottom: 24 }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.09)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}>
          {googleLoading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : (
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>or email</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
        </div>

        <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>Full name</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)}
              placeholder="Ketan Sharma" style={inputStyle} autoComplete="name"
              onFocus={e => (e.currentTarget.style.borderColor = "rgba(77,158,247,0.5)")}
              onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
            />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com" style={inputStyle} autoComplete="email"
              onFocus={e => (e.currentTarget.style.borderColor = "rgba(77,158,247,0.5)")}
              onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
            />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <div style={{ position: "relative" }}>
              <input type={showPass ? "text" : "password"} required value={password}
                onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters"
                style={{ ...inputStyle, paddingRight: 44 }} autoComplete="new-password"
                onFocus={e => (e.currentTarget.style.borderColor = "rgba(77,158,247,0.5)")}
                onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
              />
              <button type="button" onClick={() => setShowPass(s => !s)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: 0 }}>
                {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
            <PasswordStrength password={password} />
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
              <AlertCircle size={13} style={{ color: "#f87171", flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: "#f87171" }}>{error}</p>
            </motion.div>
          )}

          <button type="submit" disabled={loading}
            style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", cursor: loading ? "not-allowed" : "pointer", background: "linear-gradient(135deg, #4d9ef7, #a78bfa)", color: "#fff", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: loading ? 0.7 : 1, transition: "opacity 0.2s, transform 0.15s" }}
            onMouseEnter={e => !loading && (e.currentTarget.style.transform = "translateY(-1px)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "none")}>
            {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <><span>Create account</span><ArrowRight size={14}/></>}
          </button>

          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center", lineHeight: 1.5 }}>
            By signing up you agree to our Terms of Service and Privacy Policy.
          </p>
        </form>
      </motion.div>
      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "12px 14px", borderRadius: 10, boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 14, outline: "none", transition: "border-color 0.2s", fontFamily: "inherit" };
