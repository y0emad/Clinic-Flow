# ClinicFlow — client

React frontend for the ClinicFlow API.

**Stack:** Vite, React 19, TypeScript, Ant Design 6, Tailwind CSS 4, React Router, TanStack Query, react-i18next, axios, dayjs.

**English / Arabic** (full right-to-left layout) and **light / dark** mode, switchable from the navbar and remembered per browser.

## Run

The API must be running on `http://localhost:3000` (see the root README).

```bash
npm install
npm run dev        # http://localhost:5173
```

In development Vite forwards `/api/*` to the API, so there is no CORS setup. To call another server, set `VITE_API_URL`.

## Pages

| Who | Page |
|---|---|
| Everyone | Services + opening hours, booking (pick day → free time → confirm), log in, sign up, email OTP, forgot / reset password |
| Patient | My appointments (filter, pages, cancel up to 2 hours before) |
| Doctor | Dashboard (stats + today), appointments (filter by day / status, cancel, mark done / no-show), services (add / edit / remove), schedule (weekly hours, days off) |

## Structure

```
src/
├── main.tsx            # providers: antd theme, React Query, auth
├── App.tsx             # routes (each page is lazy-loaded)
├── theme.ts            # brand colors + light/dark theme for antd (same colors in index.css for Tailwind)
├── i18n/               # en / ar texts, Arabic versions of API error messages
├── prefs/              # language + light/dark (PrefsProvider)
├── auth/               # AuthProvider, useAuth, RequireAuth (role-based routes)
├── lib/                # axios client, dates in clinic time (Africa/Cairo), shared hooks
├── components/         # shared UI pieces
├── layouts/            # navbar + page frame
└── pages/              # one file per page (auth/, doctor/)
```

All times are shown in the clinic's timezone, whatever the user's computer is set to.
