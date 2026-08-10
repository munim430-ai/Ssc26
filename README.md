# Web-Based Result Publication System for Education Board

A full-stack Bangladesh Education Board Result Publication System (JSC, SSC, HSC, DIBS, Dakhil, Alim, Vocational) built with Next.js 14 (App Router), Supabase PostgreSQL, and custom Admin Dashboard authentication.

## Features
- **Public Portal**: Exact replica interface for looking up SSC/JSC/HSC results by Board, Roll, Registration, and Year.
- **Admin Dashboard** (`/admin`): Complete CRUD interface to view, create, edit, and delete student results and subject marks.
- **Supabase Backend**: Managed PostgreSQL database with Row-Level Security (RLS) for public reads and Service Role key for secure admin writes.
- **Edge-Ready Auth**: HMAC-signed session cookies compatible with Vercel Edge Runtime middleware.

## Deployment to Vercel

1. **Push to GitHub**: This repository is ready to be connected directly to Vercel.
2. **Import Project in Vercel**: Choose `Next.js` as the framework preset (root directory `./`).
3. **Environment Variables**: Add the following in Vercel -> Settings -> Environment Variables:

| Key | Description | Example / Value |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | `https://evpepimbliuuyuugdxwq.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Anon Key | `<your-anon-key>` |
| `SUPABASE_SERVICE_ROLE_KEY` | Private Service Role Key | `<your-service-role-key>` |
| `ADMIN_PASSWORD` | Admin Login Password | `9hc00ZZ633!` |
| `AUTH_SECRET` | HMAC Signing Secret (>=32 chars) | `17a43dee3adc3341cb3c2e4b19da2db915cbad90db021ca04b97d25052d41422` |
| `NEXT_PUBLIC_BASE_URL` | Application URL | `https://<your-app>.vercel.app` |

## Database Setup (Supabase)

Run the SQL script located in [`supabase/migrations/001_schema.sql`](supabase/migrations/001_schema.sql) in your Supabase Dashboard SQL Editor to initialize tables, indexes, RLS policies, and reference data.

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).
