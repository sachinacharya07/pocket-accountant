import React, { useState } from "react";
import {
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { Wallet, Mail, Lock } from "lucide-react";

export default function AuthScreen() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
    <div style={{ background: "#F4F1E9", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap');
        .neu { background: #EDEAE2; border-radius: 20px; box-shadow: 8px 8px 16px #c8c5bc, -8px -8px 16px #ffffff; }
        .neu-in { background: #EDEAE2; border-radius: 14px; box-shadow: inset 6px 6px 12px #c8c5bc, inset -6px -6px 12px #ffffff; }
        .neu-btn { background: #EDEAE2; border-radius: 14px; box-shadow: 6px 6px 12px #c8c5bc, -6px -6px 12px #ffffff; transition: all .12s ease; cursor: pointer; border: none; }
        .neu-btn:active { box-shadow: inset 4px 4px 8px #c8c5bc, inset -4px -4px 8px #ffffff; }
        .neu-circle { background: #EDEAE2; border-radius: 50%; box-shadow: 6px 6px 12px #c8c5bc, -6px -6px 12px #ffffff; }
      `}</style>

      <div className="neu" style={{ width: 360, maxWidth: "100%", padding: 28 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 22 }}>
          <div className="neu-circle" style={{ width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <Wallet size={24} color="#1F7A5C" />
          </div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: "#3A362E" }}>Pocket Accountant</div>
          <div style={{ fontSize: 12, color: "#9A9484", marginTop: 2 }}>Know where every rupee goes</div>
        </div>

        <button className="neu-btn" onClick={handleGoogle} disabled={busy} style={{ width: "100%", padding: "12px", fontSize: 14, fontWeight: 600, color: "#3A362E", marginBottom: 16 }}>
          Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0 16px" }}>
          <div style={{ flex: 1, height: 1, background: "#DAD6CB" }} />
          <span style={{ fontSize: 11, color: "#9A9484" }}>or</span>
          <div style={{ flex: 1, height: 1, background: "#DAD6CB" }} />
        </div>

        <form onSubmit={handleEmail}>
          <div className="neu-in" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", marginBottom: 10 }}>
            <Mail size={15} color="#9A9484" />
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, color: "#3A362E", width: "100%" }}
            />
          </div>
          <div className="neu-in" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", marginBottom: 14 }}>
            <Lock size={15} color="#9A9484" />
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Password" minLength={6}
              style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, color: "#3A362E", width: "100%" }}
            />
          </div>

          {error && <div style={{ fontSize: 12, color: "#C1584B", marginBottom: 12 }}>{error}</div>}

          <button type="submit" className="neu-btn" disabled={busy} style={{ width: "100%", padding: "12px", fontSize: 14, fontWeight: 600, color: "#1F7A5C" }}>
            {mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "#9A9484" }}>
          {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
          <span
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            style={{ color: "#1F7A5C", fontWeight: 600, cursor: "pointer" }}
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
