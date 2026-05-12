# SBC Modern App

Modern Next.js frontend for the Sauti Business Community loan and member management platform.

## Stack

- Next.js App Router
- React + TypeScript
- Supabase-ready data layer
- SQL scripts for full bootstrap and delta updates

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Database workflow

- Fresh Supabase setup: run `database/fullupdate.sql`
- Incremental database changes: run the newest file in `database/updates/`
- Every future schema change should come with a new SQL file in `database/updates/`

## M-Pesa

The callback endpoint is `POST /api/mpesa/callback`.
When Supabase keys are configured, raw callbacks are stored in `mpesa_callback_logs` and normalized rows are written to `mpesa_transactions`.
