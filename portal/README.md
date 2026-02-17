# BOW Sports Capital Portal

This folder contains the class portal implementation for the March 2, 2026 launch target.

## What is implemented

1. Next.js app router project structure.
2. Student and admin screens for the required launch modules.
3. API routes matching the planned contract.
4. Firebase Auth integration points for invite activation and reset.
5. Firestore chat support.
6. Apps Script action routing integration using signed server-to-server calls.

## Required environment variables

Copy `.env.example` to `.env.local` and fill values:

1. `NEXT_PUBLIC_FIREBASE_*` values from Firebase client app.
2. `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` for server admin SDK.
3. `APPS_SCRIPT_WEB_APP_URL` from deployed Apps Script web app.
4. `APPS_SCRIPT_SHARED_SECRET` must match Apps Script Script Property `PORTAL_SHARED_SECRET`.
5. Optional local shortcut: `DEV_ACTOR_EMAIL` and `DEV_ACTOR_ROLE`.
6. Optional client-side dev headers: `NEXT_PUBLIC_DEV_ACTOR_EMAIL` and `NEXT_PUBLIC_DEV_ACTOR_ROLE`.

## Local run

```bash
cd portal
npm install
npm run dev
```

If Firebase token wiring is not finished yet, set `DEV_ACTOR_EMAIL` to use authenticated API routes in development.

## Apps Script setup checklist

1. Deploy latest `Code.gs` + `PortalActions.gs` as web app (`Execute as: Me`, restricted app access via signatures).
2. Set Script Property:
   - key: `PORTAL_SHARED_SECRET`
   - value: same secret as `APPS_SCRIPT_SHARED_SECRET`
3. Run `setup()` once to ensure all required sheets/headers exist.
4. Confirm optional defaults were seeded:
   - `Help_FAQ` entries
   - portal schema tabs

## Raffle model currently enforced

1. Earned tickets: `floor(total_net_xp_earned / 100)`.
2. Entering raffle consumes tickets.
3. One active raffle at a time.
4. Manual close/draw by admin.
5. Closing raffle expires remaining tickets for all users.

## Notes

1. XP Store remains excluded from this launch scope.
2. Admin features are hybrid with Sheets still available for bulk edits.
