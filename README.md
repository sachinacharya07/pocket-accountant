# Pocket Accountant

A neumorphic expense tracker for students — allowance tracking, category
breakdown, savings goals, and achievements, backed by Firebase.

## 1. Create the Firebase project

1. Go to the [Firebase console](https://console.firebase.google.com) → **Add project**.
2. **Build → Authentication → Get started.** Enable **Google** and **Email/Password** sign-in providers.
3. **Build → Firestore Database → Create database.** Start in production mode (rules are provided below).
4. **Project settings → General → Your apps → Add app → Web (`</>`).** Register the app and copy the `firebaseConfig` values.

## 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in `.env` with the values from step 1.4 (each `VITE_FIREBASE_*` maps directly to a `firebaseConfig` field).

## 3. Deploy Firestore security rules

The rules in `firestore.rules` restrict every user to their own `users/{uid}` doc and `users/{uid}/expenses` subcollection. Paste the contents of that file into **Firestore Database → Rules** in the console and publish, or use the CLI:

```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # point it at this project, keep firestore.rules
firebase deploy --only firestore:rules
```

## 4. Run locally

```bash
npm install
npm run dev
```

## 5. Deploy to Vercel

1. Push this project to a GitHub repo.
2. Import it in Vercel.
3. Add the same `VITE_FIREBASE_*` variables under **Project Settings → Environment Variables**.
4. Deploy. Vercel auto-detects Vite (`npm run build`, output `dist`).

**One extra step for Google sign-in:** in the Firebase console under **Authentication → Settings → Authorized domains**, add your Vercel domain (e.g. `your-app.vercel.app`), or the popup will fail on the live site.

## Data model

```
users/{uid}
  allowance: number
  goal: { name: string, target: number, saved: number }
  customCategories: [{ key: string, color: string }]
  categoryBudgets: { [categoryKey]: number }   — optional per-category monthly cap

users/{uid}/expenses/{expenseId}
  category: string
  amount: number
  note: string
  monthKey: string    ("2026-07") — used to scope the current month's totals
  createdAt: Timestamp
  recurringId?: string   — present if this expense was auto-logged

users/{uid}/recurring/{recurringId}
  category: string
  amount: number
  note: string
  dayOfMonth: number   (1–28)
  lastRunMonth: string | null   — prevents double-logging in the same month
```

Category totals, frequent spots, and achievements are all computed client-side from this month's expenses — nothing is precomputed or denormalized, so it stays accurate as you add or delete expenses.

**If you deployed the old `firestore.rules` before this update**, redeploy it — the rule now covers *any* subcollection under `users/{uid}` (so `recurring` is included) instead of only `expenses`.

## New in this version

- **Recurring expenses** (Settings tab) — set up something like a monthly recharge once, and it auto-logs itself on the day you pick, once per month. Checked client-side on app load, so it fires the first time you open the app on or after that day.
- **Dark mode** — toggle in the header (moon/sun icon). Preference is saved to `localStorage`, so it's per-device, not synced across devices.
- **PWA install** — a manifest, service worker, and app icons are included under `public/`. On supported browsers (Chrome/Edge on Android and desktop), an "Install Pocket Accountant" card appears in Settings once the browser decides the app is installable. iOS Safari doesn't support the install prompt API — there, users add it via Share → Add to Home Screen instead.
- **Category budgets** (Settings tab) — set a monthly cap per category; the Stats tab shows a progress bar per capped category and turns red if you go over.
- **Editable expenses** — tap any expense on the Home tab (not the trash icon) to open an edit sheet with the same delete option built in.
