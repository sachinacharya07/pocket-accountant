import React, { useState } from "react";
import {
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { Wallet, Mail, Lock, Sun, Moon } from "lucide-react";
import { useTheme, themeVars, NEU_CSS } from "./theme.js";

export default function AuthScreen() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { mode: theme, colors, toggle } = useTheme();

  async function handleGoogle() {
    setError("");
    setBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleEmail(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ ...themeVars(colors), background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap');
        ${NEU_CSS}
      `}</style>

      <div className="neu" style={{ width: 360, maxWidth: "100%", padding: 28, position: "relative" }}>
        <div
          className="neu-circle" onClick={toggle}
          style={{ position: "absolute", top: 20, right: 20, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          title="Toggle theme"
        >
          {theme === "light" ? <Moon size={13} color="var(--text-2)" /> : <Sun size={13} color="var(--text-2)" />}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 22 }}>
          <div className="neu-circle" style={{ width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <Wallet size={24} color="var(--accent)" />
          </div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: "var(--text-1)" }}>Pocket Accountant</div>
          <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2 }}>Know where every rupee goes</div>
        </div>

        <button className="neu-btn" onClick={handleGoogle} disabled={busy} style={{ width: "100%", padding: "12px", fontSize: 14, fontWeight: 600, color: "var(--text-1)", marginBottom: 16 }}>
          Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0 16px" }}>
          <div style={{ flex: 1, height: 1, background: "var(--divider)" }} />
          <span style={{ fontSize: 11, color: "var(--text-2)" }}>or</span>
          <div style={{ flex: 1, height: 1, background: "var(--divider)" }} />
        </div>

        <form onSubmit={handleEmail}>
          <div className="neu-in" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", marginBottom: 10 }}>
            <Mail size={15} color="var(--text-2)" />
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, color: "var(--text-1)", width: "100%" }}
            />
          </div>
          <div className="neu-in" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", marginBottom: 14 }}>
            <Lock size={15} color="var(--text-2)" />
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Password" minLength={6}
              style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, color: "var(--text-1)", width: "100%" }}
            />
          </div>

          {error && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 12 }}>{error}</div>}

          <button type="submit" className="neu-btn" disabled={busy} style={{ width: "100%", padding: "12px", fontSize: 14, fontWeight: 600, color: "var(--accent)" }}>
            {mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "var(--text-2)" }}>
          {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
          <span
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            style={{ color: "var(--accent)", fontWeight: 600, cursor: "pointer" }}
          >
            {mode === "signup" ? "Sign in" : "Create one"}
          </span>
        </div>
      </div>
    </div>
  );
}

function friendlyError(e) {
  const code = e?.code || "";
  if (code.includes("wrong-password") || code.includes("invalid-credential")) return "Wrong email or password.";
  if (code.includes("user-not-found")) return "No account with that email yet.";
  if (code.includes("email-already-in-use")) return "That email already has an account — try signing in.";
  if (code.includes("weak-password")) return "Password should be at least 6 characters.";
  if (code.includes("popup-closed-by-user")) return "";
  return "Something went wrong. Try again.";
}
