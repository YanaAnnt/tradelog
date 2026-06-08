# TradeLog

A clean, distraction-free trading journal with a coaching score that helps you sharpen your edge. Built with Next.js 14 (App Router), Supabase (Auth + Postgres + RLS), Vercel, and PWA support so it installs on your phone like a native app.

---

## Tech stack

- **Frontend**: Next.js 14, React 18, recharts, lucide-react
- **Backend**: Supabase (Postgres + Auth + Row Level Security)
- **Hosting**: Vercel
- **Mobile**: PWA - users tap "Add to Home Screen" and get a fullscreen app

---

## Step-by-step deploy (from zero to live, ~30 minutes)

You only do this once. After this, every push to GitHub auto-deploys to Vercel.

### 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up (free tier is fine).
2. Click **New project**. Pick a name like `tradelog`, set a strong database password (save it), choose a region close to your users (e.g. Frankfurt for EU/IL).
3. Wait ~2 minutes for provisioning.
4. In the left sidebar, click **SQL Editor** → **New query**.
5. Open the file `supabase/schema.sql` from this repo, paste the whole thing into the editor, and click **Run**. You'll see "Success. No rows returned." That created all your tables and the multi-user security policies.
6. In the sidebar, click **Project Settings** → **API**. Copy two values you'll need shortly:
   - **Project URL** (looks like `https://abcd1234.supabase.co`)
   - **anon public** key (a long string)

### 2. Enable Google OAuth (optional but recommended)

1. Go to [console.cloud.google.com](https://console.cloud.google.com), create a new project.
2. **APIs & Services → Credentials → + Create credentials → OAuth client ID**.
3. App type: **Web application**.
4. Authorized redirect URI: `https://<YOUR-SUPABASE-PROJECT-REF>.supabase.co/auth/v1/callback` (replace the placeholder with what you copied above).
5. Copy the **Client ID** and **Client Secret** that Google gives you.
6. Back in Supabase: **Authentication → Providers → Google**. Toggle Enabled, paste the Client ID + Secret, **Save**.

(If you only want email/password for now, skip this section - it works without Google.)

### 3. Put this code on GitHub

```bash
cd tradelog-app
git init
git add .
git commit -m "TradeLog v1"
git branch -M main
git remote add origin https://github.com/<YOUR-USERNAME>/tradelog.git
git push -u origin main
```

(Create the GitHub repo first at [github.com/new](https://github.com/new). Make it private if you want.)

### 4. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com), sign up with your GitHub account.
2. Click **Add New → Project**, pick the `tradelog` repo you just pushed.
3. Vercel auto-detects Next.js. Before clicking Deploy, expand **Environment Variables** and add three:

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | the Project URL from step 1 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon public key from step 1 |
   | `NEXT_PUBLIC_SITE_URL` | leave blank for now, fill in after first deploy |

4. Click **Deploy**. ~2 minutes later it's live at `https://tradelog-<something>.vercel.app`.
5. Go back to Vercel → your project → **Settings → Environment Variables**, set `NEXT_PUBLIC_SITE_URL` to that URL. Then **Deployments → ... → Redeploy**.

### 5. Tell Supabase about your live URL

1. Supabase → **Authentication → URL Configuration**.
2. Set **Site URL** to `https://tradelog-<something>.vercel.app`.
3. Under **Redirect URLs**, add `https://tradelog-<something>.vercel.app/auth/callback`.
4. (If you set up Google in step 2, also go back to Google Cloud and add this same callback URL to the authorized redirect URIs.)

### 6. You're live!

Open the URL on your phone, sign up, paste your IBKR Flex token + Query ID (or skip and use manual report import), and you're trading-journaling.

To install as an app on your phone: open the site in Safari (iOS) or Chrome (Android), tap the share/menu button, choose **Add to Home Screen**. It now opens fullscreen, with its own icon, like a native app.

---

## Running locally for development

```bash
cd tradelog-app
npm install
cp .env.example .env.local
# edit .env.local with your Supabase keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## What's in this build (Phase 1)

- [x] Email + password sign up / sign in
- [x] Google OAuth sign in
- [x] Multi-user with Supabase Row Level Security (each user only sees their own data)
- [x] Onboarding flow: profile + broker connection
- [x] Dashboard with TradeLog Score gauge, equity curve, calendar, daily bars
- [x] Manual broker-report import (IBKR Flex CSV/HTML, or generic CSV)
- [x] Light/dark theme, currency choice
- [x] Mobile responsive + PWA (installs to home screen)
- [ ] Insights tab (placeholder - port in next iteration)
- [ ] Trades tab (placeholder - port in next iteration)

## What's coming next (Phase 2)

- [x] Automated daily sync from IBKR Flex Web Service (via Vercel Cron - see "Enabling automatic broker sync" below)
- [x] User-triggered "Sync now" button in Settings
- [ ] Encrypted token storage (Supabase Vault or pgcrypto)
- [ ] Insights and Trades tabs ported
- [ ] In-app sync history view (data is already collected in `sync_runs`)
- [ ] Email notification on sync failure

---

## Enabling automatic broker sync

The repo ships with a sync route at `/api/cron/sync` and a Vercel Cron config in `vercel.json` that runs it daily at 22:00 UTC (after US market close). Two extra environment variables turn it on.

### 1. Generate a cron secret

```bash
openssl rand -hex 32
```

Copy the output - this is your `CRON_SECRET`.

### 2. Get the service-role Supabase key

Supabase -> Settings -> API -> **service_role** key (it's right under the anon key). This key bypasses Row Level Security, so it must NEVER ship to the browser - it only lives in the cron route.

### 3. Add both env vars to Vercel

Vercel -> your project -> **Settings -> Environment Variables**. Add:

| Name | Value | Environments |
|---|---|---|
| `CRON_SECRET` | the random hex string from step 1 | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | the service_role key from step 2 | Production, Preview, Development |

Redeploy. Vercel automatically picks up `vercel.json` and starts running the cron.

### 4. (Important) Format your Flex Query as CSV

In IBKR's Flex Queries UI, make sure your Activity Flex Query is set to **Format = CSV** (not XML). The current parser handles CSV; XML support comes in a later iteration.

### How the sync works end-to-end

1. **22:00 UTC daily**, Vercel calls `GET /api/cron/sync` with `Authorization: Bearer <CRON_SECRET>`.
2. The route loads every `broker_connections` row using the service-role client.
3. For each connection:
   - **SendRequest** to `ndcdyn.interactivebrokers.com/.../FlexWebService/SendRequest` -> IBKR returns a Reference Code.
   - **Poll GetStatement** every 5s (up to 60s total) until the statement is ready.
   - **parseReport** the CSV; build trade rows tagged `source: 'sync'`.
   - **Upsert** by `(user_id, broker_trade_id)` for dedup; legacy rows without a broker_trade_id are inserted as-is.
   - Update `broker_connections.last_sync_at` and `sync_runs` with status.
4. Vercel logs show per-user `ok` / `error`. Failed connections get `status='error'` and the error message in `sync_runs.error`.

Each user can also press **Sync now** in Settings, which hits `POST /api/sync/me` (auth-gated by their Supabase session) and syncs just their own connection.

### Running more often than daily

Vercel Hobby caps crons at once-per-day. To go to hourly or every-few-hours:
- **Easiest**: upgrade to Vercel Pro ($20/mo) - change `"schedule": "0 22 * * *"` to e.g. `"0 */4 * * *"` for every 4 hours.
- **Cheaper at scale**: move the worker to Render ($7/mo cron service) - same code lives in `/lib/sync.js` and `/lib/ibkr.js`, just call from a small Node script there.

IBKR Flex itself updates mostly end-of-day, so daily-after-close covers ~99% of use cases.

---

## What's coming after (Phase 3)

- [ ] Native iOS/Android via Capacitor (same codebase, App Store + Play Store)
- [ ] Push notifications
- [ ] Stripe subscriptions
- [ ] Additional brokers (Tradovate, TD/Schwab, Robinhood via Plaid)

---

## Project structure

```
tradelog-app/
├── app/
│   ├── (app)/                  # Signed-in routes (require auth)
│   │   ├── layout.jsx          # Topbar + content shell
│   │   ├── dashboard/page.jsx  # Main dashboard
│   │   ├── insights/page.jsx   # (placeholder)
│   │   └── trades/page.jsx     # (placeholder)
│   ├── auth/
│   │   ├── callback/route.js   # OAuth redirect handler
│   │   └── signout/route.js
│   ├── login/page.jsx          # Sign in / sign up
│   ├── onboarding/page.jsx     # First-run profile + broker
│   ├── layout.jsx              # Root layout + PWA meta
│   ├── page.jsx                # Root redirect
│   └── globals.css             # All styles (theme vars, components)
├── components/
│   ├── Dashboard.jsx           # Dashboard orchestrator
│   ├── SettingsModal.jsx       # Profile + theme + broker + import
│   ├── Topbar.jsx              # Nav
│   └── ui.jsx                  # Primitives, charts, calendar, score gauge
├── lib/
│   ├── parseReport.js          # IBKR Flex + generic CSV parser
│   ├── stats.js                # useStats hook + computeScore
│   ├── supabase-browser.js     # Client-side Supabase
│   ├── supabase-server.js      # Server-side Supabase
│   └── utils.js                # Formatters, currency, asset detection
├── public/
│   ├── manifest.json           # PWA manifest
│   ├── icon-512.svg, icon-192.svg, favicon.svg
├── supabase/
│   └── schema.sql              # Database tables + RLS policies
├── middleware.js               # Auth gate
├── next.config.mjs
├── package.json
└── .env.example
```

---

## Security notes

- All database access is gated by Supabase Row Level Security policies. Even with someone else's anon key, no user can read another user's trades.
- The broker token currently lives in plain text in `broker_connections.token` (still gated by RLS). In Phase 2 it'll be encrypted with pgcrypto using a server-side key, so even a Supabase admin can't read it without the key.
- All Vercel + Supabase traffic is HTTPS only.
- Never commit `.env.local` to git (already in `.gitignore`).
