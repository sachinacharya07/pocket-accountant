import React, { useEffect, useState, useRef } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  doc, setDoc, updateDoc, onSnapshot, increment,
  collection, addDoc, deleteDoc, query, where, orderBy, serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import AuthScreen from "./AuthScreen.jsx";
import { buildCatList, catMetaFrom, SWATCHES } from "./categories.js";
import { exportCSV, exportPDF } from "./export.js";
import { useTheme, themeVars, NEU_CSS } from "./theme.js";
import {
  Plus, Home, PieChart as PieIcon, Target, Settings as SettingsIcon,
  X, Check, Award, MapPin, LogOut, Trash2, Pencil, AlertTriangle,
  Download, FileText, Bell, BellOff, Sun, Moon, Repeat, Smartphone as PhoneIcon,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";

/* ---------- constants ---------- */
const rupee = (n) => "\u20B9" + Math.round(n || 0).toLocaleString("en-IN");
const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const dayKey = (d) => d.toISOString().slice(0, 10);
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ============================================================ */
export default function App() {
  const [user, setUser] = useState(undefined);
  const [installEvent, setInstallEvent] = useState(null);
  const { mode: theme, colors, toggle } = useTheme();

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    function onPrompt(e) {
      e.preventDefault();
      setInstallEvent(e);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (user === undefined) {
    return (
      <div style={{ ...themeVars(colors), background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif", color: "var(--text-2)", fontSize: 13 }}>
        Loading…
      </div>
    );
  }
  if (!user) return <AuthScreen />;
  return (
    <PocketAccountant
      user={user} theme={theme} colors={colors} onToggleTheme={toggle}
      installEvent={installEvent} onInstalled={() => setInstallEvent(null)}
    />
  );
}

/* ============================================================ */
function PocketAccountant({ user, theme, colors, onToggleTheme, installEvent, onInstalled }) {
  const [tab, setTab] = useState("home");
  const [showAdd, setShowAdd] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [profile, setProfile] = useState(null);
  const [expenses, setExpenses] = useState(null);
  const [recurring, setRecurring] = useState(null);
  const [notifPerm, setNotifPerm] = useState(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
  const notifiedRef = useRef({});
  const recurringProcessedRef = useRef(new Set());

  const userRef = doc(db, "users", user.uid);

  useEffect(() => {
    const unsub = onSnapshot(userRef, (snap) => {
      if (!snap.exists()) {
        setDoc(userRef, {
          allowance: 5000,
          goal: { name: "Headphones", target: 4000, saved: 0 },
          customCategories: [],
          categoryBudgets: {},
          createdAt: serverTimestamp(),
        });
      } else {
        setProfile(snap.data());
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.uid]);

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

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users", user.uid, "recurring"), (snap) => {
      setRecurring(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.uid]);

  // auto-log recurring expenses once per month, once their day-of-month has arrived
  useEffect(() => {
    if (!recurring) return;
    const mk = monthKey();
    const today = new Date();
    const dayNow = today.getDate();
    recurring.forEach(async (r) => {
      if (r.lastRunMonth === mk) return;
      if (dayNow < r.dayOfMonth) return;
      const guard = r.id + "-" + mk;
      if (recurringProcessedRef.current.has(guard)) return;
      recurringProcessedRef.current.add(guard);
      await addDoc(collection(db, "users", user.uid, "expenses"), {
        category: r.category, amount: r.amount, note: r.note || "Auto: recurring",
        monthKey: mk, createdAt: serverTimestamp(), recurringId: r.id,
      });
      await updateDoc(doc(db, "users", user.uid, "recurring", r.id), { lastRunMonth: mk });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurring]);

  useEffect(() => {
    if (notifPerm !== "granted" || !profile || !expenses) return;
    const allowance = profile.allowance ?? 5000;
    const spent = expenses.reduce((s, e) => s + e.amount, 0);
    const remaining = allowance - spent;
    const pctUsed = allowance > 0 ? Math.round((spent / allowance) * 100) : 0;
    const mk = monthKey();
    if (remaining < 0 && !notifiedRef.current[mk + "-over"]) {
      notifiedRef.current[mk + "-over"] = true;
      new Notification("Pocket Accountant", { body: `You're ${rupee(-remaining)} over your allowance this month.` });
    } else if (pctUsed >= 80 && !notifiedRef.current[mk + "-80"]) {
      notifiedRef.current[mk + "-80"] = true;
      new Notification("Pocket Accountant", { body: `You've used ${pctUsed}% of this month's allowance.` });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, expenses, notifPerm]);

  if (!profile || !expenses || !recurring) {
    return (
      <div style={{ ...themeVars(colors), background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif", color: "var(--text-2)", fontSize: 13 }}>
        Loading your ledger…
      </div>
    );
  }

  const allowance = profile.allowance ?? 5000;
  const goal = profile.goal ?? { name: "Headphones", target: 4000, saved: 0 };
  const customCategories = profile.customCategories ?? [];
  const categoryBudgets = profile.categoryBudgets ?? {};
  const allCats = buildCatList(customCategories);

  const categoryTotals = allCats.reduce((acc, c) => {
    acc[c.key] = expenses.filter((e) => e.category === c.key).reduce((s, e) => s + e.amount, 0);
    return acc;
  }, {});
  const spent = expenses.reduce((s, e) => s + e.amount, 0);
  const remaining = allowance - spent;
  const pctUsed = Math.min(999, allowance > 0 ? Math.round((spent / allowance) * 100) : 0);

  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(1, daysInMonth - today.getDate());
  const dailyBudget = Math.max(0, remaining / daysRemaining);

  const donutData = allCats.filter((c) => categoryTotals[c.key] > 0).map((c) => ({
    name: c.key, value: categoryTotals[c.key], color: c.color,
  }));

  const biggestCat = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0] || ["—", 0];

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
  const weeklyData = last7Days(expenses, today);


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
  async function addCategory(name, color) {
    const key = name.trim();
    if (!key) return;
    if (allCats.some((c) => c.key.toLowerCase() === key.toLowerCase())) return;
    await updateDoc(userRef, { customCategories: [...customCategories, { key, color }] });
  }
  async function removeCategory(key) {
    await updateDoc(userRef, { customCategories: customCategories.filter((c) => c.key !== key) });
  }
  async function addRecurring(category, amount, note, dayOfMonth) {
    await addDoc(collection(db, "users", user.uid, "recurring"), {
      category, amount, note: note || "", dayOfMonth, lastRunMonth: null,
    });
  }
  async function removeRecurring(id) {
    await deleteDoc(doc(db, "users", user.uid, "recurring", id));
  }
  async function saveCategoryBudget(key, amount) {
    await updateDoc(userRef, { [`categoryBudgets.${key}`]: amount });
  }
  async function updateExpense(id, category, amount, note) {
    await updateDoc(doc(db, "users", user.uid, "expenses", id), { category, amount, note: note || "" });
    setEditingExpense(null);
  }
  function requestNotifications() {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then(setNotifPerm);
  }
  async function promptInstall() {
    if (!installEvent) return;
    installEvent.prompt();
    await installEvent.userChoice;
    onInstalled();
  }

  return (
    <div style={{ ...themeVars(colors), background: "var(--bg)", minHeight: "100vh", display: "flex", justifyContent: "center", padding: "24px 12px", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap');
        .phone { width: 380px; max-width: 100%; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 40px; padding: 22px 18px 18px; backdrop-filter: blur(24px) saturate(160%); -webkit-backdrop-filter: blur(24px) saturate(160%); box-shadow: 0 20px 60px var(--shadow-d); }
        ${NEU_CSS}
      `}</style>

      <div className="phone">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, padding: "0 4px" }}>
          <div>
            <div className="display" style={{ fontSize: 20, fontWeight: 700, color: "var(--text-1)" }}>Pocket Accountant</div>
            <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2 }}>Know where every rupee goes</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div className="neu-circle" onClick={onToggleTheme} style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} title="Toggle theme">
              {theme === "light" ? <Moon size={15} color="var(--text-2)" /> : <Sun size={15} color="var(--text-2)" />}
            </div>
            <div className="neu-circle" onClick={() => signOut(auth)} style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} title="Sign out">
              <LogOut size={15} color="var(--text-2)" />
            </div>
          </div>
        </div>

        {tab === "home" && (
          <HomeTab
            allowance={allowance} spent={spent} remaining={remaining} pctUsed={pctUsed}
            dailyBudget={dailyBudget} daysRemaining={daysRemaining}
            expenses={expenses.slice(0, 8)} allCats={allCats} onDelete={deleteExpense}
            onEditAllowance={saveAllowance} onEditExpense={setEditingExpense}
          />
        )}
        {tab === "stats" && (
          <StatsTab
            donutData={donutData} categoryTotals={categoryTotals} frequentSpots={frequentSpots} spent={spent}
            weeklyData={weeklyData} allCats={allCats} categoryBudgets={categoryBudgets}
          />
        )}
        {tab === "goals" && (
          <GoalsTab
            goal={goal} goalPct={goalPct} spent={spent} remaining={remaining}
            biggestCat={biggestCat} achievements={achievements}
            onSaveGoal={saveGoal} onAddToSavings={addToSavings}
          />
        )}
        {tab === "settings" && (
          <SettingsTab
            customCategories={customCategories} onAddCategory={addCategory} onRemoveCategory={removeCategory}
            expenses={expenses} spent={spent}
            notifPerm={notifPerm} onRequestNotifications={requestNotifications}
            recurring={recurring} allCats={allCats} onAddRecurring={addRecurring} onRemoveRecurring={removeRecurring}
            installEvent={installEvent} onInstall={promptInstall}
            categoryBudgets={categoryBudgets} onSaveCategoryBudget={saveCategoryBudget}
          />
        )}

        <div className="neu" style={{ marginTop: 18, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <NavBtn icon={Home} label="Home" active={tab === "home"} onClick={() => setTab("home")} />
          <NavBtn icon={PieIcon} label="Stats" active={tab === "stats"} onClick={() => setTab("stats")} />
          <div className="neu-circle" onClick={() => setShowAdd(true)} style={{ width: 54, height: 54, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginTop: -26, border: "5px solid var(--bg)" }}>
            <Plus size={24} color="var(--accent)" strokeWidth={2.5} />
          </div>
          <NavBtn icon={Target} label="Goals" active={tab === "goals"} onClick={() => setTab("goals")} />
          <NavBtn icon={SettingsIcon} label="Settings" active={tab === "settings"} onClick={() => setTab("settings")} />
        </div>
      </div>

      {showAdd && <QuickAdd allCats={allCats} onClose={() => setShowAdd(false)} onAdd={addExpense} />}
      {editingExpense && (
        <EditExpense
          allCats={allCats} expense={editingExpense}
          onClose={() => setEditingExpense(null)}
          onSave={updateExpense}
          onDelete={(id) => { deleteExpense(id); setEditingExpense(null); }}
        />
      )}
    </div>
  );
}

/* ---------- derived data helpers ---------- */
function computeAchievements({ expenses, spent, allowance, goal, today }) {
  const days = new Set(expenses.map((e) => dayKey(e.createdAt)));
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

function last7Days(expenses, today) {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = dayKey(d);
    const total = expenses.filter((e) => dayKey(e.createdAt) === key).reduce((s, e) => s + e.amount, 0);
    out.push({ label: DAY_LABELS[d.getDay()], total: Math.round(total) });
  }
  return out;
}

/* ---------- nav ---------- */
function NavBtn({ icon: Icon, label, active, onClick }) {
  return (
    <div onClick={onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", width: 50 }}>
      <div className={"neu-circle" + (active ? " active" : "")} style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={16} color={active ? "var(--accent)" : "var(--text-2)"} strokeWidth={2} />
      </div>
      <span style={{ fontSize: 10, color: active ? "var(--accent)" : "var(--text-2)", fontWeight: 500 }}>{label}</span>
    </div>
  );
}

/* ---------- budget banner ---------- */
function BudgetBanner({ pctUsed, remaining }) {
  if (remaining < 0) {
    return (
      <div className="neu-in" style={{ padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
        <AlertTriangle size={16} color="var(--danger)" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: "var(--danger)", fontWeight: 500 }}>You're {rupee(-remaining)} over your allowance this month.</span>
      </div>
    );
  }
  if (pctUsed >= 80) {
    return (
      <div className="neu-in" style={{ padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
        <AlertTriangle size={16} color="var(--warn)" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: "var(--warn-text)", fontWeight: 500 }}>Heads up — you've used {pctUsed}% of your allowance.</span>
      </div>
    );
  }
  return null;
}

/* ---------- home ---------- */
function HomeTab({ allowance, spent, remaining, pctUsed, dailyBudget, daysRemaining, expenses, allCats, onDelete, onEditAllowance, onEditExpense }) {
  const r = 52, c = 2 * Math.PI * r;
  const dash = c * (Math.min(100, pctUsed) / 100);
  const dialColor = pctUsed > 90 ? "var(--danger)" : pctUsed > 70 ? "var(--warn)" : "var(--accent)";
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(allowance);

  return (
    <div>
      <BudgetBanner pctUsed={pctUsed} remaining={remaining} />

      <div className="neu" style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 14 }}>
        <div style={{ position: "relative", width: 140, height: 140 }}>
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r={r} fill="none" stroke="var(--divider)" strokeWidth="10" />
            <circle cx="70" cy="70" r={r} fill="none" stroke={dialColor} strokeWidth="10"
              strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
              transform="rotate(-90 70 70)" style={{ transition: "stroke-dasharray .4s ease" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span className="mono" style={{ fontSize: 26, fontWeight: 700, color: "var(--text-1)" }}>{pctUsed}%</span>
            <span style={{ fontSize: 10, color: "var(--text-2)" }}>allowance used</span>
          </div>
        </div>
        <div style={{ display: "flex", width: "100%", marginTop: 16, gap: 8 }}>
          <div className="neu-in" style={{ flex: 1, padding: "10px 6px", textAlign: "center" }}>
            <div style={{ fontSize: 9, color: "var(--text-2)", marginBottom: 3 }}>Allowance</div>
            {editing ? (
              <input
                autoFocus type="number" value={val} onChange={(e) => setVal(e.target.value)}
                onBlur={() => { setEditing(false); const n = parseFloat(val); if (n > 0) onEditAllowance(n); }}
                onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                className="mono"
                style={{ width: "100%", textAlign: "center", border: "none", outline: "none", background: "transparent", fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}
              />
            ) : (
              <div className="mono" onClick={() => { setVal(allowance); setEditing(true); }} style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                {rupee(allowance)} <Pencil size={9} color="var(--text-2)" />
              </div>
            )}
          </div>
          <Stat label="Spent" value={rupee(spent)} accent="var(--danger)" />
          <Stat label="Remaining" value={rupee(remaining)} accent={remaining >= 0 ? "var(--accent)" : "var(--danger)"} />
        </div>
      </div>

      <div className="neu" style={{ padding: 16, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-2)" }}>Recommended daily spend</div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)" }}>{rupee(dailyBudget)}</div>
        </div>
        <div className="neu-in" style={{ padding: "8px 14px", textAlign: "center" }}>
          <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: "var(--text-1)" }}>{daysRemaining}</div>
          <div style={{ fontSize: 9, color: "var(--text-2)" }}>days left</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "0 4px 8px" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: 0.4 }}>Recent expenses</span>
        <span style={{ fontSize: 10, color: "var(--text-3)" }}>tap to edit</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {expenses.length === 0 && (
          <div className="neu-in" style={{ padding: 16, textAlign: "center", fontSize: 12, color: "var(--text-2)" }}>
            No expenses logged yet — tap + to add one.
          </div>
        )}
        {expenses.map((e) => {
          const meta = catMetaFrom(allCats, e.category);
          const Icon = meta.icon;
          return (
            <div key={e.id} className="neu" onClick={() => onEditExpense(e)}
              style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
              <div className="neu-circle" style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={15} color={meta.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-1)" }}>{e.note || e.category}</div>
                <div style={{ fontSize: 10, color: "var(--text-2)" }}>{e.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
              </div>
              <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>{rupee(e.amount)}</div>
              <Trash2 size={13} color="var(--text-3)" style={{ cursor: "pointer" }} onClick={(evt) => { evt.stopPropagation(); onDelete(e.id); }} />
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
      <div style={{ fontSize: 9, color: "var(--text-2)", marginBottom: 3 }}>{label}</div>
      <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: accent || "var(--text-1)" }}>{value}</div>
    </div>
  );
}

/* ---------- stats ---------- */
function StatsTab({ donutData, categoryTotals, frequentSpots, spent, weeklyData, allCats, categoryBudgets }) {
  const budgeted = allCats
    .filter((c) => categoryBudgets[c.key] > 0)
    .map((c) => ({
      ...c,
      spent: categoryTotals[c.key] || 0,
      budget: categoryBudgets[c.key],
      pct: Math.min(100, Math.round(((categoryTotals[c.key] || 0) / categoryBudgets[c.key]) * 100)),
    }));
  const weekTotal = weeklyData.reduce((s, d) => s + d.total, 0);
  const maxDay = Math.max(1, ...weeklyData.map((d) => d.total));

  return (
    <div>
      <div className="neu" style={{ padding: 18, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>
          Spending breakdown
        </div>
        {donutData.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--text-2)", padding: "20px 0", textAlign: "center" }}>Nothing logged this month yet.</div>
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
                  <span style={{ color: "var(--text-1)", flex: 1 }}>{d.name}</span>
                  <span className="mono" style={{ color: "var(--text-2)" }}>{Math.round((d.value / spent) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {budgeted.length > 0 && (
        <div className="neu" style={{ padding: 18, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.4 }}>
            Category budgets
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {budgeted.map((b) => (
              <div key={b.key}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: "var(--text-1)" }}>{b.key}</span>
                  <span className="mono" style={{ color: b.spent > b.budget ? "var(--danger)" : "var(--text-2)" }}>
                    {rupee(b.spent)} / {rupee(b.budget)}
                  </span>
                </div>
                <div className="neu-in" style={{ height: 8, borderRadius: 6, overflow: "hidden", padding: 1 }}>
                  <div style={{ height: "100%", width: `${b.pct}%`, background: b.spent > b.budget ? "var(--danger)" : b.color, borderRadius: 5, transition: "width .4s ease" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="neu" style={{ padding: 18, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: 0.4 }}>Last 7 days</div>
          <div className="mono" style={{ fontSize: 12, color: "var(--text-1)", fontWeight: 700 }}>{rupee(weekTotal)}</div>
        </div>
        <div style={{ height: 110 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--text-2)" }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, maxDay]} />
              <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="var(--accent)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", margin: "0 4px 8px", textTransform: "uppercase", letterSpacing: 0.4 }}>
        Frequent spending
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {frequentSpots.length === 0 && (
          <div className="neu-in" style={{ padding: 16, textAlign: "center", fontSize: 12, color: "var(--text-2)" }}>
            Add a few expenses with notes (like "Canteen") to see your frequent spots.
          </div>
        )}
        {frequentSpots.map((s, i) => (
          <div key={i} className="neu" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
            <div className="neu-circle" style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <MapPin size={15} color="var(--text-1)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-1)", textTransform: "capitalize" }}>{s.name}</div>
              <div style={{ fontSize: 10, color: "var(--text-2)" }}>{s.visits} {s.visits === 1 ? "visit" : "visits"}</div>
            </div>
            <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>{rupee(s.total)}</div>
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
              <input value={name} onChange={(e) => setName(e.target.value)} className="neu-in" style={{ border: "none", outline: "none", padding: "6px 10px", fontSize: 13, color: "var(--text-1)" }} placeholder="Goal name" />
              <input type="number" value={target} onChange={(e) => setTarget(e.target.value)} className="neu-in" style={{ border: "none", outline: "none", padding: "6px 10px", fontSize: 13, color: "var(--text-1)" }} placeholder="Target amount" />
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 12, color: "var(--text-2)" }}>Saving for</div>
              <div className="display" style={{ fontSize: 18, fontWeight: 700, color: "var(--text-1)" }}>{goal.name || "Set a goal"}</div>
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
            {editingGoal ? <Check size={13} color="var(--accent)" /> : <Pencil size={12} color="var(--text-2)" />}
          </div>
        </div>
        <div className="neu-in" style={{ height: 14, borderRadius: 10, overflow: "hidden", padding: 2 }}>
          <div style={{ height: "100%", width: `${goalPct}%`, background: "var(--warn)", borderRadius: 8, transition: "width .4s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "var(--text-2)" }}>
          <span className="mono">{rupee(goal.saved)} saved</span>
          <span className="mono">target {rupee(goal.target)}</span>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input
            type="number" value={addAmt} onChange={(e) => setAddAmt(e.target.value)}
            placeholder="Add to savings" className="neu-in mono"
            style={{ border: "none", outline: "none", padding: "8px 12px", fontSize: 12, color: "var(--text-1)", flex: 1 }}
          />
          <button
            className="neu-btn" style={{ padding: "8px 14px", fontSize: 12, fontWeight: 600, color: "var(--accent)" }}
            onClick={() => { const n = parseFloat(addAmt); if (n > 0) { onAddToSavings(n); setAddAmt(""); } }}
          >
            Add
          </button>
        </div>
      </div>

      <div className="neu" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.4 }}>
          Monthly summary
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <SummaryBox label="Total spent" value={rupee(spent)} />
          <SummaryBox label="Biggest expense" value={biggestCat[1] > 0 ? biggestCat[0] : "—"} small />
          <SummaryBox label="Money left" value={rupee(remaining)} accent={remaining >= 0 ? "var(--accent)" : "var(--danger)"} />
          <SummaryBox label="Budget status" value={remaining >= 0 ? "Within limit" : "Over limit"} accent={remaining >= 0 ? "var(--accent)" : "var(--danger)"} small />
        </div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", margin: "0 4px 8px", textTransform: "uppercase", letterSpacing: 0.4 }}>
        Achievements
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {achievements.map((a, i) => (
          <div key={i} className="neu" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, opacity: a.earned ? 1 : 0.5 }}>
            <div className={"neu-circle" + (a.earned ? " active" : "")} style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {a.earned ? <Check size={14} color="var(--accent)" /> : <Award size={14} color="var(--text-2)" />}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--text-1)", fontWeight: 500 }}>{a.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryBox({ label, value, accent, small }) {
  return (
    <div className="neu-in" style={{ padding: "10px 12px" }}>
      <div style={{ fontSize: 10, color: "var(--text-2)", marginBottom: 4 }}>{label}</div>
      <div className={small ? "" : "mono"} style={{ fontSize: small ? 13 : 15, fontWeight: 700, color: accent || "var(--text-1)" }}>{value}</div>
    </div>
  );
}

/* ---------- settings ---------- */
function SettingsTab({
  customCategories, onAddCategory, onRemoveCategory, expenses, spent,
  notifPerm, onRequestNotifications,
  recurring, allCats, onAddRecurring, onRemoveRecurring,
  installEvent, onInstall,
  categoryBudgets, onSaveCategoryBudget,
}) {
  const [newCat, setNewCat] = useState("");
  const [color, setColor] = useState(SWATCHES[0]);
  const [budgetDrafts, setBudgetDrafts] = useState({});

  const [rCat, setRCat] = useState(allCats[0]?.key || "Food");
  const [rAmt, setRAmt] = useState("");
  const [rNote, setRNote] = useState("");
  const [rDay, setRDay] = useState(1);

  return (
    <div>
      {installEvent && (
        <div className="neu" style={{ padding: 16, marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
          <div className="neu-circle" style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <PhoneIcon size={15} color="var(--accent)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>Install Pocket Accountant</div>
            <div style={{ fontSize: 11, color: "var(--text-2)" }}>Add it to your home screen for the full app feel.</div>
          </div>
          <button className="neu-btn" style={{ padding: "8px 14px", fontSize: 12, fontWeight: 600, color: "var(--accent)" }} onClick={onInstall}>
            Install
          </button>
        </div>
      )}

      <div className="neu" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.4 }}>
          Recurring expenses
        </div>
        {recurring.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 10 }}>None yet — good for things like a monthly recharge.</div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {recurring.map((r) => {
            const meta = catMetaFrom(allCats, r.category);
            const Icon = meta.icon;
            return (
              <div key={r.id} className="neu-in" style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                <Icon size={14} color={meta.color} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: "var(--text-1)" }}>{r.note || r.category}</div>
                  <div style={{ fontSize: 10, color: "var(--text-2)" }}>Day {r.dayOfMonth} · {rupee(r.amount)}</div>
                </div>
                <Repeat size={12} color="var(--text-3)" />
                <X size={13} color="var(--text-3)" style={{ cursor: "pointer" }} onClick={() => onRemoveRecurring(r.id)} />
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {allCats.map((c) => (
            <div key={c.key} onClick={() => setRCat(c.key)}
              className={rCat === c.key ? "neu-in chip" : "neu-btn chip"}
              style={{ padding: "5px 10px", fontSize: 11, color: rCat === c.key ? "var(--text-1)" : "var(--text-2)" }}>
              {c.key}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <input type="number" value={rAmt} onChange={(e) => setRAmt(e.target.value)} placeholder="Amount" className="neu-in mono"
            style={{ border: "none", outline: "none", padding: "8px 10px", fontSize: 12, color: "var(--text-1)", flex: 1 }} />
          <input type="number" min={1} max={28} value={rDay} onChange={(e) => setRDay(e.target.value)} placeholder="Day" className="neu-in mono"
            style={{ border: "none", outline: "none", padding: "8px 10px", fontSize: 12, color: "var(--text-1)", width: 60 }} />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input value={rNote} onChange={(e) => setRNote(e.target.value)} placeholder="Note (e.g. Mobile recharge)" className="neu-in"
            style={{ border: "none", outline: "none", padding: "8px 10px", fontSize: 12, color: "var(--text-1)", flex: 1 }} />
          <button className="neu-btn" style={{ padding: "8px 14px", fontSize: 12, fontWeight: 600, color: "var(--accent)" }}
            onClick={() => {
              const amt = parseFloat(rAmt);
              const day = Math.min(28, Math.max(1, parseInt(rDay, 10) || 1));
              if (amt > 0) { onAddRecurring(rCat, amt, rNote, day); setRAmt(""); setRNote(""); }
            }}>
            Add
          </button>
        </div>
        <div style={{ fontSize: 10, color: "var(--text-2)", marginTop: 8 }}>
          Auto-logged once each month on the day you set (max 28, to keep every month safe).
        </div>
      </div>

      <div className="neu" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.4 }}>
          Category budgets
        </div>
        <div style={{ fontSize: 11, color: "var(--text-2)", marginBottom: 10 }}>
          Set a monthly cap per category. Leave blank for no cap.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {allCats.map((c) => {
            const Icon = c.icon;
            const current = budgetDrafts[c.key] ?? (categoryBudgets[c.key] || "");
            return (
              <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Icon size={14} color={c.color} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, color: "var(--text-1)", flex: 1 }}>{c.key}</span>
                <div className="neu-in" style={{ display: "flex", alignItems: "center", padding: "4px 8px", width: 90 }}>
                  <span className="mono" style={{ fontSize: 11, color: "var(--text-2)", marginRight: 3 }}>{"\u20B9"}</span>
                  <input
                    type="number" value={current}
                    onChange={(e) => setBudgetDrafts((d) => ({ ...d, [c.key]: e.target.value }))}
                    onBlur={(e) => onSaveCategoryBudget(c.key, parseFloat(e.target.value) || 0)}
                    onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                    placeholder="—" className="mono"
                    style={{ border: "none", outline: "none", background: "transparent", fontSize: 12, color: "var(--text-1)", width: "100%" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="neu" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.4 }}>
          Custom categories
        </div>
        {customCategories.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 10 }}>No custom categories yet.</div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {customCategories.map((c) => (
            <div key={c.key} className="neu-in" style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, color: "var(--text-1)", flex: 1 }}>{c.key}</span>
              <X size={13} color="var(--text-3)" style={{ cursor: "pointer" }} onClick={() => onRemoveCategory(c.key)} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          {SWATCHES.map((sw) => (
            <div key={sw} onClick={() => setColor(sw)}
              style={{ width: 20, height: 20, borderRadius: "50%", background: sw, cursor: "pointer", border: color === sw ? "2px solid var(--text-1)" : "2px solid transparent" }} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={newCat} onChange={(e) => setNewCat(e.target.value)}
            placeholder="New category name" className="neu-in"
            style={{ border: "none", outline: "none", padding: "8px 12px", fontSize: 12, color: "var(--text-1)", flex: 1 }}
          />
          <button className="neu-btn" style={{ padding: "8px 14px", fontSize: 12, fontWeight: 600, color: "var(--accent)" }}
            onClick={() => { if (newCat.trim()) { onAddCategory(newCat, color); setNewCat(""); } }}>
            Add
          </button>
        </div>
      </div>

      <div className="neu" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.4 }}>
          Export this month
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="neu-btn" style={{ flex: 1, padding: "12px", fontSize: 12, fontWeight: 600, color: "var(--text-1)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            onClick={() => exportCSV(expenses, `pocket-accountant-${monthKey()}.csv`)}
          >
            <Download size={14} /> CSV
          </button>
          <button
            className="neu-btn" style={{ flex: 1, padding: "12px", fontSize: 12, fontWeight: 600, color: "var(--text-1)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            onClick={() => exportPDF(expenses, { month: monthKey(), total: spent }, `pocket-accountant-${monthKey()}.pdf`)}
          >
            <FileText size={14} /> PDF
          </button>
        </div>
      </div>

      <div className="neu" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.4 }}>
          Budget alerts
        </div>
        {notifPerm === "unsupported" ? (
          <div style={{ fontSize: 12, color: "var(--text-2)" }}>Notifications aren't supported in this browser.</div>
        ) : notifPerm === "granted" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--accent)" }}>
            <Bell size={14} /> Browser alerts are on — you'll be notified at 80% and over-budget.
          </div>
        ) : (
          <button
            className="neu-btn" style={{ width: "100%", padding: "12px", fontSize: 12, fontWeight: 600, color: "var(--text-1)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            onClick={onRequestNotifications}
          >
            <BellOff size={14} /> Enable browser alerts
          </button>
        )}
        <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 8 }}>
          In-app warnings on the Home tab always show at 80% used and when you go over — this just adds a browser notification too.
        </div>
      </div>
    </div>
  );
}

/* ---------- quick add modal ---------- */
function QuickAdd({ allCats, onClose, onAdd }) {
  const [cat, setCat] = useState(allCats[0]?.key || "Food");
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
    <div style={{ position: "fixed", inset: 0, background: "var(--overlay)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}>
      <div className="neu" style={{ width: 380, maxWidth: "100%", borderRadius: "28px 28px 0 0", padding: 22, boxShadow: "0 -10px 30px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span className="display" style={{ fontSize: 17, fontWeight: 700, color: "var(--text-1)" }}>Quick add</span>
          <div className="neu-circle" onClick={onClose} style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={14} color="var(--text-2)" />
          </div>
        </div>

        <div className="neu-in" style={{ padding: "14px 16px", marginBottom: 14, display: "flex", alignItems: "center" }}>
          <span className="mono" style={{ fontSize: 22, color: "var(--text-2)", marginRight: 6 }}>{"\u20B9"}</span>
          <input
            type="number" value={amt} onChange={(e) => setAmt(e.target.value)}
            placeholder="0" autoFocus className="mono"
            style={{ border: "none", outline: "none", background: "transparent", fontSize: 26, fontWeight: 700, color: "var(--text-1)", width: "100%" }}
          />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          {allCats.map((c) => {
            const Icon = c.icon;
            const active = cat === c.key;
            return (
              <div key={c.key} onClick={() => setCat(c.key)}
                className={active ? "neu-in chip" : "neu-btn chip"}
                style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <Icon size={13} color={active ? c.color : "var(--text-2)"} />
                <span style={{ color: active ? "var(--text-1)" : "var(--text-2)", fontWeight: active ? 600 : 400 }}>{c.key}</span>
              </div>
            );
          })}
        </div>

        <input
          type="text" value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="What was it for? (optional)" className="neu-in"
          style={{ border: "none", outline: "none", padding: "12px 16px", fontSize: 13, color: "var(--text-1)", width: "100%", marginBottom: 16, boxSizing: "border-box" }}
        />

        <button className="neu-btn" onClick={submit} disabled={saving}
          style={{ width: "100%", padding: "14px", fontSize: 15, fontWeight: 600, color: "var(--accent)" }}>
          {saving ? "Adding…" : "Add expense"}
        </button>
      </div>
    </div>
  );
}

/* ---------- edit expense modal ---------- */
function EditExpense({ allCats, expense, onClose, onSave, onDelete }) {
  const [cat, setCat] = useState(expense.category);
  const [amt, setAmt] = useState(String(expense.amount));
  const [note, setNote] = useState(expense.note || "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const n = parseFloat(amt);
    if (!(n > 0) || saving) return;
    setSaving(true);
    try {
      await onSave(expense.id, cat, n, note);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--overlay)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}>
      <div className="neu" style={{ width: 380, maxWidth: "100%", borderRadius: "28px 28px 0 0", padding: 22, boxShadow: "0 -10px 30px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span className="display" style={{ fontSize: 17, fontWeight: 700, color: "var(--text-1)" }}>Edit expense</span>
          <div className="neu-circle" onClick={onClose} style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={14} color="var(--text-2)" />
          </div>
        </div>

        <div className="neu-in" style={{ padding: "14px 16px", marginBottom: 14, display: "flex", alignItems: "center" }}>
          <span className="mono" style={{ fontSize: 22, color: "var(--text-2)", marginRight: 6 }}>{"\u20B9"}</span>
          <input
            type="number" value={amt} onChange={(e) => setAmt(e.target.value)}
            placeholder="0" autoFocus className="mono"
            style={{ border: "none", outline: "none", background: "transparent", fontSize: 26, fontWeight: 700, color: "var(--text-1)", width: "100%" }}
          />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          {allCats.map((c) => {
            const Icon = c.icon;
            const active = cat === c.key;
            return (
              <div key={c.key} onClick={() => setCat(c.key)}
                className={active ? "neu-in chip" : "neu-btn chip"}
                style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <Icon size={13} color={active ? c.color : "var(--text-2)"} />
                <span style={{ color: active ? "var(--text-1)" : "var(--text-2)", fontWeight: active ? 600 : 400 }}>{c.key}</span>
              </div>
            );
          })}
        </div>

        <input
          type="text" value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="What was it for? (optional)" className="neu-in"
          style={{ border: "none", outline: "none", padding: "12px 16px", fontSize: 13, color: "var(--text-1)", width: "100%", marginBottom: 16, boxSizing: "border-box" }}
        />

        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="neu-btn" onClick={() => onDelete(expense.id)}
            style={{ padding: "14px 18px", fontSize: 14, fontWeight: 600, color: "var(--danger)", display: "flex", alignItems: "center", gap: 6 }}
          >
            <Trash2 size={15} /> Delete
          </button>
          <button className="neu-btn" onClick={submit} disabled={saving}
            style={{ flex: 1, padding: "14px", fontSize: 15, fontWeight: 600, color: "var(--accent)" }}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
