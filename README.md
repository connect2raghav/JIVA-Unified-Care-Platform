# JIVA Unified Care Platform

JIVA is an administrative coordination workspace for clinics. It brings patient registration, appointments, emergency dispatch, blood inventory, facilities lookup, and operational dashboards into one multi-tenant application.

The product supports coordination and record keeping only. It does not provide diagnosis, treatment recommendations, or automated clinical decision-making.

## Stack

- React 19, TypeScript, and Vite
- Supabase Auth and PostgreSQL with clinic-scoped row-level security
- Tailwind CSS and the existing Shadcn-style UI primitives
- Lucide icons, Recharts, React Router, Zustand, and jsPDF

## Local setup

1. Install Node.js 20 or newer.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env` and set the Supabase URL and anonymous key.
4. Apply the SQL migrations in `supabase/migrations/` to the target Supabase project.
5. Start the Vite server with `npm run dev`.

Useful checks:

```bash
npm run build
npm run lint
```

The Vite preview and production container should listen on the `PORT` environment variable, defaulting to `8080` in deployment configuration.

## Main views

- Patient Register
- Appointment Queue
- Emergency Dispatch Desk
- Blood Stock Matrix
- Facilities Directory
- Operations Dashboard

The Facilities Directory is clinic-scoped and supports search, facility-type filtering, emergency-capability filtering, ICU-bed visibility, and direct phone or email actions. It is a directory lookup and does not rank or recommend facilities.

## Deployment

Build the static application with `npm run build`, then serve the generated `dist/` directory from a static web server or the project container. Configure the production host to forward client-side routes to `index.html`.

Before release, verify the database migrations, Supabase RLS policies, environment variables, build output, and the administrative-only product boundary.
