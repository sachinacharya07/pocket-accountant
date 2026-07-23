import React, { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  doc, setDoc, updateDoc, onSnapshot, increment,
  collection, addDoc, deleteDoc, query, where, orderBy, serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import AuthScreen from "./AuthScreen.jsx";
import {
  Coffee, BookOpen, Bus, Shirt, PartyPopper, Clapperboard,
  Smartphone, Package, Plus, Home, PieChart as PieIcon, Target,
  X, Check, TrendingUp, TrendingDown, Award, MapPin, LogOut, Trash2, Pencil,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

/* ---------- constants ---------- */
const CATS = [
  { key: "Food", icon: Coffee, color: "#1F7A5C" },
  { key: "Stationery", icon: BookOpen, color: "#4C6B8A" },
  { key: "Transport", icon: Bus, color: "#7A8B6F" },
  { key: "Shopping", icon: Shirt, color: "#E2A63B" },
  { key: "Friends", icon: PartyPopper, color: "#8A5C7A" },
  { key: "Entertainment", icon: Clapperboard, color: "#C1584B" },
  { key: "Recharge", icon: Smartphone, color: "#A69F91" },
  { key: "Other", icon: Package, color: "#D98A7D" },
];
const catMeta = (name) => CATS.find((c) => c.key === name) || CATS[CATS.length - 1];
const rupee = (n) => "\u20B9" + Math.round(n || 0).toLocaleString("en-IN");
const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const dayKey = (d) => d.toISOString().slice(0, 10);

const GLOBAL_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap');
  .phone { width: 380px; max-width: 100%; background: #EDEAE2; border-radius: 40px; padding: 22px 18px 18px; box-shadow: 20px 20px 40px #c9c6bd, -20px -20px 40px #ffffff; }
  .neu { background: #EDEAE2; border-radius: 20px; box-shadow: 8px 8px 16px #c8c5bc, -8px -8px 16px #ffffff; }
  .neu-in { background: #EDEAE2; border-radius: 16px; box-shadow: inset 6px 6px 12px #c8c5bc, inset -6px -6px 12px #ffffff; }
  .neu-btn { background: #EDEAE2; border-radius: 14px; box-shadow: 6px 6px 12px #c8c5bc, -6px -6px 12px #ffffff; transition: all .12s ease; cursor: pointer; border: none; }
  .neu-btn:active { box-shadow: inset 4px 4px 8px #c8c5bc, inset -4px -4px 8px #ffffff; }
  .neu-circle { background: #EDEAE2; border-radius: 50%; box-shadow: 6px 6px 12px #c8c5bc, -6px -6px 12px #ffffff; }
  .neu-circle.active { box-shadow: inset 4px 4px 8px #c8c5bc, inset -4px -4px 8px #ffffff; }
  .mono { font-family: 'Space Grotesk', monospace; }
  .display { font-family: 'Fraunces', serif; }
  .chip { transition: all .12s ease; }
`;

/* ============================================================ */
export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  if (user === undefined) {
    return (
      <div style={{ background: "#F4F1E9", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif", color: "#9A9484", fontSize: 13 }}>
        Loading…
      </div>
    );
  }
  if (!user) return <AuthScreen />;
  return <PocketAccountant user={user} />;
}

/* ============================================================ */
function PocketAccountant({ user }) {
  const [tab, setTab] = useState("home");
  const [showAdd, setShowAdd] = useState(false);
  const [profile, setProfile] = useState(null);
  const [expenses, setExpenses] = useState(null);

  const userRef = doc(db, "users", user.uid);

  // subscribe to profile doc (allowance + goal), create default if missing
  useEffect(() => {
    const unsub = onSnapshot(userRef, (snap) => {
      if (!snap.exists()) {
        setDoc(userRef, {
          allowance: 5000,
          goal: { name: "Headphones", target: 4000, saved: 0 },
          createdAt: serverTimestamp(),
        });
      } else {
        setProfile(snap.data());
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.uid]);

  // subscribe to this month's expenses
  useEffect(() => {
    const q = query(
      collection(db, "users", user.uid, "expenses"),
      where("monthKey", "==", monthKey()),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.() || new Date() })));
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.uid]);

  if (!profile || !expenses) {
    return (
      <div style={{ background: "#F4F1E9", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif", color: "#9A9484", fontSize: 13 }}>
        Loading your ledger…
      </div>
    );
  }

  const allowance = profile.allowance ?? 5000;
  const goal = profile.goal ?? { name: "Headphones", target: 4000, saved: 0 };

  const categoryTotals = CATS.reduce((acc, c) => {
    acc[c.key] = expenses.filter((e) => e.category === c.key).reduce((s, e) => s + e.amount, 0);
    return acc;
  }, {});
  const spent = expenses.reduce((s, e) => s + e.amount, 0);
  const remaining = allowance - spent;
  const pctUsed = Math.min(100, allowance > 0 ? Math.round((spent / allowance) * 100) : 0);

  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(1, daysInMonth - today.getDate());
  const dailyBudget = Math.max(0, remaining / daysRemaining);

  const donutData = CATS.filter((c) => categoryTotals[c.key] > 0).map((c) => ({
    name: c.key, value: categoryTotals[c.key], color: c.color,
  }));

  const biggestCat = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0] || ["—", 0];

  // frequent spots derived from the note field
  const spotMap = {};
  expenses.forEach((e) => {
    const key = (e.note || e.category).trim().toLowerCase();
    if (!spotMap[key]) spotMap[key] = { name: e.note || e.category, visits: 0, total: 0 };
    spotMap[key].visits += 1;
    spotMap[key].total += e.amount;
  });
  const frequentSpots = Object.values(spotMap).sort((a, b) => b.visits - a.visits).slice(0, 4);

  const goalPct = goal.target > 0 ? Math.min(100, Math.round((goal.saved / goal.target) * 100)) : 0;

  const achievements = computeAchievements({ expenses, spent, allowance, goal, today });

  async function addExpense(category, amount, note) {
    await addDoc(collection(db, "users", user.uid, "expenses"), {
      category, amount, note: note || "",
      monthKey: monthKey(),
      createdAt: serverTimestamp(),
    });
    setShowAdd(false);
  }
  async function deleteExpense(id) {
    await deleteDoc(doc(db, "users", user.uid, "expenses", id));
  }
  async function saveAllowance(n) {
    await updateDoc(userRef, { allowance: n });
  }
  async function saveGoal(patch) {
    await updateDoc(userRef, { goal: { ...goal, ...patch } });
  }
  async function addToSavings(n) {
    await updateDoc(userRef, { "goal.saved": increment(n) });
  }

  return (
    <div style={{ background: "#F4F1E9", minHeight: "100vh", display: "flex", justifyContent: "center", padding: "24px 12px", fontFamily: "'Inter', sans-serif" }}>
      <style>{GLOBAL_STYLE}</style>

      <div className="phone">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, padding: "0 4px" }}>
          <div>
            <div className="display" style={{ fontSize: 20, fontWeight: 700, color: "#3A362E" }}>Pocket Accountant</div>
            <div style={{ fontSize: 12, color: "#9A9484", marginTop: 2 }}>Know where every rupee goes</div>
          </div>
          <div className="neu-circle" onClick={() => signOut(auth)} style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} title="Sign out">
            <LogOut size={15} color="#9A9484" />
          </div>
        </div>

        {tab === "home" && (
          <HomeTab
            allowance={allowance} spent={spent} remaining={remaining} pctUsed={pctUsed}
            dailyBudget={dailyBudget} daysRemaining={daysRemaining}
            expenses={expenses.slice(0, 8)} onDelete={deleteExpense}
            onEditAllowance={saveAllowance}
          />
        )}
        {tab === "stats" && (
          <StatsTab donutData={donutData} categoryTotals={categoryTotals} frequentSpots={frequentSpots} spent={spent} />
        )}
        {tab === "goals" && (
          <GoalsTab
            goal={goal} goalPct={goalPct} spent={spent} remaining={remaining}
            biggestCat={biggestCat} achievements={achievements}
            onSaveGoal={saveGoal} onAddToSavings={addToSavings}
          />
        )}

        <div className="neu" style={{ marginTop: 18, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <NavBtn icon={Home} label="Home" active={tab === "home"} onClick={() => setTab("home")} />
          <NavBtn icon={PieIcon} label="Stats" active={tab === "stats"} onClick={() => setTab("stats")} />
          <div className="neu-circle" onClick={() => setShowAdd(true)} style={{ width: 54, height: 54, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginTop: -26, border: "5px solid #F4F1E9" }}>
            <Plus size={24} color="#1F7A5C" strokeWidth={2.5} />
          </div>
          <NavBtn icon={Target} label="Goals" active={tab === "goals"} onClick={() => setTab("goals")} />
          <NavBtn icon={Award} label="More" active={false} onClick={() => setTab("goals")} />
        </div>
      </div>

      {showAdd && <QuickAdd onClose={() => setShowAdd(false)} onAdd={addExpense} />}
    </div>
  );
}

/* ---------- achievements ---------- */
function computeAchievements({ expenses, spent, allowance, goal, today }) {
  const days = new Set(expenses.map((e) => dayKey(e.createdAt)));

  // most recent Sunday that has already passed
  const lastSunday = new Date(today);
  lastSunday.setDate(today.getDate() - today.getDay());
  const noSpendSunday = lastSunday <= today && !days.has(dayKey(lastSunday));

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  const noImpulseWeek = !expenses.some(
    (e) => (e.category === "Shopping" || e.category === "Entertainment") && e.createdAt >= sevenDaysAgo
  );

  return [
    { name: "No-Spend Sunday", earned: noSpendSunday },
    { name: "Stayed Within Budget", earned: spent <= allowance },
    { name: "Saved \u20B91,000", earned: (goal.saved || 0) >= 1000 },
    { name: "Logged Expenses for 30 Days", earned: days.size >= 30 },
    { name: "One Week Without Impulse Shopping", earned: noImpulseWeek },
  ];
}

/* ---------- nav ---------- */
function NavBtn({ icon: Icon, label, active, onClick }) {
  return (
    <div onClick={onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", width: 50 }}>
      <div className={"neu-circle" + (active ? " active" : "")} style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={16} color={active ? "#1F7A5C" : "#9A9484"} strokeWidth={2} />
      </div>
      <span style={{ fontSize: 10, color: active ? "#1F7A5C" : "#9A9484", fontWeight: 500 }}>{label}</span>
    </div>
  );
}

/* ---------- home ---------- */
function HomeTab({ allowance, spent, remaining, pctUsed, dailyBudget, daysRemaining, expenses, onDelete, onEditAllowance }) {
  const r = 52, c = 2 * Math.PI * r;
  const dash = c * (pctUsed / 100);
  const dialColor = pctUsed > 90 ? "#C1584B" : pctUsed > 70 ? "#E2A63B" : "#1F7A5C";
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(allowance);

  return (
    <div>
      <div className="neu" style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 14 }}>
        <div style={{ position: "relative", width: 140, height: 140 }}>
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r={r} fill="none" stroke="#DAD6CB" strokeWidth="10" />
            <circle cx="70" cy="70" r={r} fill="none" stroke={dialColor} strokeWidth="10"
              strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
              transform="rotate(-90 70 70)" style={{ transition: "stroke-dasharray .4s ease" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span className="mono" style={{ fontSize: 26, fontWeight: 700, color: "#3A362E" }}>{pctUsed}%</span>
            <span style={{ fontSize: 10, color: "#9A9484" }}>allowance used</span>
          </div>
        </div>
        <div style={{ display: "flex", width: "100%", marginTop: 16, gap: 8 }}>
          <div className="neu-in" style={{ flex: 1, padding: "10px 6px", textAlign: "center", position: "relative" }}>
            <div style={{ fontSize: 9, color: "#9A9484", marginBottom: 3 }}>Allowance</div>
            {editing ? (
              <input
                autoFocus type="number" value={val} onChange={(e) => setVal(e.target.value)}
                onBlur={() => { setEditing(false); const n = parseFloat(val); if (n > 0) onEditAllowance(n); }}
                onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                className="mono"
                style={{ width: "100%", textAlign: "center", border: "none", outline: "none", background: "transparent", fontSize: 13, fontWeight: 700, color: "#3A362E" }}
              />
            ) : (
              <div className="mono" onClick={() => { setVal(allowance); setEditing(true); }} style={{ fontSize: 13, fontWeight: 700, color: "#3A362E", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                {rupee(allowance)} <Pencil size={9} color="#9A9484" />
              </div>
            )}
          </div>
          <Stat label="Spent" value={rupee(spent)} accent="#C1584B" />
          <Stat label="Remaining" value={rupee(remaining)} accent="#1F7A5C" />
        </div>
      </div>

      <div className="neu" style={{ padding: 16, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 11, color: "#9A9484" }}>Recommended daily spend</div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: "#1F7A5C" }}>{rupee(dailyBudget)}</div>
        </div>
        <div className="neu-in" style={{ padding: "8px 14px", textAlign: "center" }}>
          <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: "#3A362E" }}>{daysRemaining}</div>
          <div style={{ fontSize: 9, color: "#9A9484" }}>days left</div>
        </div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: "#9A9484", margin: "0 4px 8px", textTransform: "uppercase", letterSpacing: 0.4 }}>
        Recent expenses
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {expenses.length === 0 && (
          <div className="neu-in" style={{ padding: 16, textAlign: "center", fontSize: 12, color: "#9A9484" }}>
            No expenses logged yet — tap + to add one.
          </div>
        )}
        {expenses.map((e) => {
          const meta = catMeta(e.category);
          const Icon = meta.icon;
          return (
            <div key={e.id} className="neu" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              <div className="neu-circle" style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={15} color={meta.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#3A362E" }}>{e.note || e.category}</div>
                <div style={{ fontSize: 10, color: "#9A9484" }}>{e.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
              </div>
              <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: "#3A362E" }}>{rupee(e.amount)}</div>
              <Trash2 size={13} color="#C7C2B4" style={{ cursor: "pointer" }} onClick={() => onDelete(e.id)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="neu-in" style={{ flex: 1, padding: "10px 6px", textAlign: "center" }}>
      <div style={{ fontSize: 9, color: "#9A9484", marginBottom: 3 }}>{label}</div>
      <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: accent || "#3A362E" }}>{value}</div>
    </div>
  );
}

/* ---------- stats ---------- */
function StatsTab({ donutData, categoryTotals, frequentSpots, spent }) {
  return (
    <div>
      <div className="neu" style={{ padding: 18, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#9A9484", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>
          Spending breakdown
        </div>
        {donutData.length === 0 ? (
          <div style={{ fontSize: 12, color: "#9A9484", padding: "20px 0", textAlign: "center" }}>Nothing logged this month yet.</div>
        ) : (
          <div style={{ height: 170, display: "flex", alignItems: "center" }}>
            <div style={{ width: 130, height: 130 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} dataKey="value" innerRadius={38} outerRadius={62} paddingAngle={2} stroke="none">
                    {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, paddingLeft: 8 }}>
              {donutData.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                  <span style={{ color: "#3A362E", flex: 1 }}>{d.name}</span>
                  <span className="mono" style={{ color: "#9A9484" }}>{Math.round((d.value / spent) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: "#9A9484", margin: "0 4px 8px", textTransform: "uppercase", letterSpacing: 0.4 }}>
        Frequent spending
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {frequentSpots.length === 0 && (
          <div className="neu-in" style={{ padding: 16, textAlign: "center", fontSize: 12, color: "#9A9484" }}>
            Add a few expenses with notes (like "Canteen") to see your frequent spots.
          </div>
        )}
        {frequentSpots.map((s, i) => (
          <div key={i} className="neu" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
            <div className="neu-circle" style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <MapPin size={15} color="#4C6B8A" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#3A362E", textTransform: "capitalize" }}>{s.name}</div>
              <div style={{ fontSize: 10, color: "#9A9484" }}>{s.visits} {s.visits === 1 ? "visit" : "visits"}</div>
            </div>
            <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: "#3A362E" }}>{rupee(s.total)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- goals ---------- */
function GoalsTab({ goal, goalPct, spent, remaining, biggestCat, achievements, onSaveGoal, onAddToSavings }) {
  const [editingGoal, setEditingGoal] = useState(false);
  const [name, setName] = useState(goal.name);
  const [target, setTarget] = useState(goal.target);
  const [addAmt, setAddAmt] = useState("");

  return (
    <div>
      <div className="neu" style={{ padding: 18, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          {editingGoal ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, marginRight: 10 }}>
              <input value={name} onChange={(e) => setName(e.target.value)} className="neu-in" style={{ border: "none", outline: "none", padding: "6px 10px", fontSize: 13, color: "#3A362E" }} placeholder="Goal name" />
              <input type="number" value={target} onChange={(e) => setTarget(e.target.value)} className="neu-in" style={{ border: "none", outline: "none", padding: "6px 10px", fontSize: 13, color: "#3A362E" }} placeholder="Target amount" />
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 12, color: "#9A9484" }}>Saving for</div>
              <div className="display" style={{ fontSize: 18, fontWeight: 700, color: "#3A362E" }}>{goal.name || "Set a goal"}</div>
            </div>
          )}
          <div
            className="neu-circle"
            onClick={() => {
              if (editingGoal) onSaveGoal({ name, target: parseFloat(target) || 0 });
              setEditingGoal(!editingGoal);
            }}
            style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          >
            {editingGoal ? <Check size={13} color="#1F7A5C" /> : <Pencil size={12} color="#9A9484" />}
          </div>
        </div>
        <div className="neu-in" style={{ height: 14, borderRadius: 10, overflow: "hidden", padding: 2 }}>
          <div style={{ height: "100%", width: `${goalPct}%`, background: "#E2A63B", borderRadius: 8, transition: "width .4s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "#9A9484" }}>
          <span className="mono">{rupee(goal.saved)} saved</span>
          <span className="mono">target {rupee(goal.target)}</span>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input
            type="number" value={addAmt} onChange={(e) => setAddAmt(e.target.value)}
            placeholder="Add to savings" className="neu-in mono"
            style={{ border: "none", outline: "none", padding: "8px 12px", fontSize: 12, color: "#3A362E", flex: 1 }}
          />
          <button
            className="neu-btn" style={{ padding: "8px 14px", fontSize: 12, fontWeight: 600, color: "#1F7A5C" }}
            onClick={() => { const n = parseFloat(addAmt); if (n > 0) { onAddToSavings(n); setAddAmt(""); } }}
          >
            Add
          </button>
        </div>
      </div>

      <div className="neu" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#9A9484", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.4 }}>
          Monthly summary
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <SummaryBox label="Total spent" value={rupee(spent)} />
          <SummaryBox label="Biggest expense" value={biggestCat[1] > 0 ? biggestCat[0] : "—"} small />
          <SummaryBox label="Money left" value={rupee(remaining)} accent={remaining >= 0 ? "#1F7A5C" : "#C1584B"} />
          <SummaryBox label="Budget status" value={remaining >= 0 ? "Within limit" : "Over limit"} accent={remaining >= 0 ? "#1F7A5C" : "#C1584B"} small />
        </div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: "#9A9484", margin: "0 4px 8px", textTransform: "uppercase", letterSpacing: 0.4 }}>
        Achievements
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {achievements.map((a, i) => (
          <div key={i} className="neu" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, opacity: a.earned ? 1 : 0.5 }}>
            <div className={"neu-circle" + (a.earned ? " active" : "")} style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {a.earned ? <Check size={14} color="#1F7A5C" /> : <Award size={14} color="#9A9484" />}
            </div>
            <div style={{ fontSize: 12.5, color: "#3A362E", fontWeight: 500 }}>{a.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryBox({ label, value, accent, small }) {
  return (
    <div className="neu-in" style={{ padding: "10px 12px" }}>
      <div style={{ fontSize: 10, color: "#9A9484", marginBottom: 4 }}>{label}</div>
      <div className={small ? "" : "mono"} style={{ fontSize: small ? 13 : 15, fontWeight: 700, color: accent || "#3A362E" }}>{value}</div>
    </div>
  );
}

/* ---------- quick add modal ---------- */
function QuickAdd({ onClose, onAdd }) {
  const [cat, setCat] = useState("Food");
  const [amt, setAmt] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const n = parseFloat(amt);
    if (!(n > 0) || saving) return;
    setSaving(true);
    try {
      await onAdd(cat, n, note);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(58,54,46,0.35)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}>
      <div className="neu" style={{ width: 380, maxWidth: "100%", background: "#EDEAE2", borderRadius: "28px 28px 0 0", padding: 22, boxShadow: "0 -10px 30px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span className="display" style={{ fontSize: 17, fontWeight: 700, color: "#3A362E" }}>Quick add</span>
          <div className="neu-circle" onClick={onClose} style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={14} color="#9A9484" />
          </div>
        </div>

        <div className="neu-in" style={{ padding: "14px 16px", marginBottom: 14, display: "flex", alignItems: "center" }}>
          <span className="mono" style={{ fontSize: 22, color: "#9A9484", marginRight: 6 }}>{"\u20B9"}</span>
          <input
            type="number" value={amt} onChange={(e) => setAmt(e.target.value)}
            placeholder="0" autoFocus className="mono"
            style={{ border: "none", outline: "none", background: "transparent", fontSize: 26, fontWeight: 700, color: "#3A362E", width: "100%" }}
          />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          {CATS.map((c) => {
            const Icon = c.icon;
            const active = cat === c.key;
            return (
              <div key={c.key} onClick={() => setCat(c.key)}
                className={active ? "neu-in chip" : "neu-btn chip"}
                style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <Icon size={13} color={active ? c.color : "#9A9484"} />
                <span style={{ color: active ? "#3A362E" : "#9A9484", fontWeight: active ? 600 : 400 }}>{c.key}</span>
              </div>
            );
          })}
        </div>

        <input
          type="text" value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="What was it for? (optional)" className="neu-in"
          style={{ border: "none", outline: "none", padding: "12px 16px", fontSize: 13, color: "#3A362E", width: "100%", marginBottom: 16, boxSizing: "border-box" }}
        />

        <button className="neu-btn" onClick={submit} disabled={saving}
          style={{ width: "100%", padding: "14px", fontSize: 15, fontWeight: 600, color: "#1F7A5C" }}>
          {saving ? "Adding…" : "Add expense"}
        </button>
      </div>
    </div>
  );
}
