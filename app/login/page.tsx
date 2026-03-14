"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/auth/supabase-browser";
import { useAuth } from "@/lib/auth/AuthContext";

export default function LoginPage() {
  const router   = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [mode, setMode]       = useState<"login" | "forgot">("login");
  const [forgotSent, setForgotSent] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) router.push("/");
  }, [user, authLoading, router]);

  const sb = getSupabaseBrowser();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else router.push("/");
  };

  const handleGoogle = async () => {
    setGoogleLoading(true); setError("");
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setGoogleLoading(false); }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) { setError(error.message); setLoading(false); }
    else { setForgotSent(true); setLoading(false); }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", background: "#050505",
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      {/* Left panel — branding */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
        style={{
          flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between",
          padding: "48px 56px", borderRight: "1px solid rgba(255,255,255,0.05)",
          background: "linear-gradient(135deg, #070710 0%, #050505 100%)",
          position: "relative", overflow: "hidden",
        }}>
        {/* Grid bg */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.03,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />

        {/* Glow */}
        <div style={{
          position: "absolute", top: "20%", left: "10%", width: 400, height: 400,
          borderRadius: "50%", background: "radial-gradient(circle, rgba(77,158,247,0.06) 0%, transparent 70%)",
          filter: "blur(40px)", pointerEvents: "none",
        }} />

        {/* Logo */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #4d9ef7, #a78bfa)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 900, color: "#fff",
            }}>A</div>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>Scaff</span>
          </div>
        </div>

        {/* Center content */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#4d9ef7", fontFamily: "'JetBrains Mono',monospace", marginBottom: 16 }}>
              AI ARCHITECTURE GENERATOR
            </p>
            <h1 style={{ fontSize: 38, fontWeight: 900, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1.1, marginBottom: 20 }}>
              Design systems,<br />not just code.
            </h1>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, maxWidth: 380 }}>
              Describe your product. Get a production-ready architecture blueprint with services, costs, security, and a team plan — in seconds.
            </p>
          </motion.div>

          {/* Feature bullets */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 40 }}>
            {[
              { icon: "⚡", text: "AI-powered blueprint generation" },
              { icon: "📊", text: "Real pricing across AWS, GCP, Railway" },
              { icon: "🏗️", text: "GitHub issues, ADRs, team structure" },
            ].map(f => (
              <div key={f.text} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{f.icon}</div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{f.text}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Bottom */}
        <p style={{ position: "relative", zIndex: 1, fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
          © {new Date().getFullYear()} Scaff. Free while in beta.
        </p>
      </motion.div>

      {/* Right panel — form */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
        style={{
          width: 480, display: "flex", flexDirection: "column", justifyContent: "center",
          padding: "48px 56px",
        }}>
        <AnimatePresence mode="wait">
          {mode === "login" ? (
            <motion.div key="login" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <h2 style={{ fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", marginBottom: 6 }}>
                Welcome back
              </h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 32 }}>
                Don't have an account?{" "}
                <Link href="/signup" style={{ color: "#4d9ef7", textDecoration: "none", fontWeight: 600 }}>Sign up free</Link>
              </p>

              {/* Google */}
              <button onClick={handleGoogle} disabled={googleLoading}
                style={{
                  width: "100%", padding: "13px 16px", borderRadius: 12, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff", fontSize: 14, fontWeight: 600, transition: "all 0.2s",
                  marginBottom: 24,
                }}
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

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>or email</span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 6 }}>Email</label>
                  <input
                    type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    style={inputStyle} autoComplete="email"
                    onFocus={e => (e.currentTarget.style.borderColor = "rgba(77,158,247,0.5)")}
                    onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>Password</label>
                    <button type="button" onClick={() => setMode("forgot")}
                      style={{ fontSize: 12, color: "#4d9ef7", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                      Forgot password?
                    </button>
                  </div>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPass ? "text" : "password"} required value={password}
                      onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                      style={{ ...inputStyle, paddingRight: 44 }} autoComplete="current-password"
                      onFocus={e => (e.currentTarget.style.borderColor = "rgba(77,158,247,0.5)")}
                      onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                    />
                    <button type="button" onClick={() => setShowPass(s => !s)}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: 0 }}>
                      {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
                    <AlertCircle size={13} style={{ color: "#f87171", flexShrink: 0 }} />
                    <p style={{ fontSize: 12, color: "#f87171" }}>{error}</p>
                  </motion.div>
                )}

                <button type="submit" disabled={loading}
                  style={{
                    width: "100%", padding: "13px", borderRadius: 12, border: "none", cursor: loading ? "not-allowed" : "pointer",
                    background: "linear-gradient(135deg, #4d9ef7, #a78bfa)", color: "#fff",
                    fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    opacity: loading ? 0.7 : 1, transition: "opacity 0.2s, transform 0.15s",
                  }}
                  onMouseEnter={e => !loading && (e.currentTarget.style.transform = "translateY(-1px)")}
                  onMouseLeave={e => (e.currentTarget.style.transform = "none")}>
                  {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <><span>Sign in</span><ArrowRight size={14}/></>}
                </button>
              </form>
            </motion.div>
          ) : (
            // Forgot password form
            <motion.div key="forgot" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <button onClick={() => { setMode("login"); setForgotSent(false); setError(""); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: 12, padding: 0, marginBottom: 24, display: "flex", alignItems: "center", gap: 4 }}>
                ← Back to sign in
              </button>
              <h2 style={{ fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", marginBottom: 8 }}>Reset password</h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 32 }}>
                Enter your email and we'll send a reset link.
              </p>

              {forgotSent ? (
                <div style={{ padding: "20px", borderRadius: 12, background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.2)", textAlign: "center" }}>
                  <p style={{ fontSize: 24, marginBottom: 8 }}>📬</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#4ade80", marginBottom: 4 }}>Check your inbox</p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Reset link sent to {email}</p>
                </div>
              ) : (
                <form onSubmit={handleForgot} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 6 }}>Email</label>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@company.com" style={inputStyle} autoComplete="email"
                      onFocus={e => (e.currentTarget.style.borderColor = "rgba(77,158,247,0.5)")}
                      onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                    />
                  </div>
                  {error && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
                      <AlertCircle size={13} style={{ color: "#f87171" }} />
                      <p style={{ fontSize: 12, color: "#f87171" }}>{error}</p>
                    </div>
                  )}
                  <button type="submit" disabled={loading}
                    style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #4d9ef7, #a78bfa)", color: "#fff", fontSize: 14, fontWeight: 700, opacity: loading ? 0.7 : 1 }}>
                    {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite", display: "inline" }} /> : "Send reset link"}
                  </button>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: 10, boxSizing: "border-box",
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
  color: "#fff", fontSize: 14, outline: "none", transition: "border-color 0.2s",
  fontFamily: "inherit",
};
