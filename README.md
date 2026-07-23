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

users/{uid}/expenses/{expenseId}
  category: string   (Food, Stationery, Transport, Shopping, Friends, Entertainment, Recharge, Other)
  amount: number
  note: string
  monthKey: string    ("2026-07") — used to scope the current month's totals
  createdAt: Timestamp
```

Category totals, frequent spots, and achievements are all computed client-side from this month's expenses — nothing is precomputed or denormalized, so it stays accurate as you add or delete expenses.
