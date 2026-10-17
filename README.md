# The Daily Practice — My Discipline Journal

A personal, single-user productivity journal for daily habit check-offs, food and nutrition logging, guided reflection, and rewards. The project uses Next.js App Router, TypeScript, Bootstrap 5, Prisma, and PostgreSQL.

## Requirements

- Node.js 20.9 or later
- PostgreSQL 14 or later

## Run locally

1. Install packages:

   ```bash
   npm install
   ```

2. Create a PostgreSQL database, copy `.env.example` to `.env`, and set `DATABASE_URL` to your connection string.

3. Generate Prisma Client and apply the initial migration:

   ```bash
   npm run db:generate
   npm run db:deploy
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

The first dashboard request creates a local journal profile, starter habits, sample rewards, estimated food references, and default nutrition targets. These are ordinary records and can be changed in the database; nutrition reference values are explicitly marked as estimates. They are not medical or dietary advice.

## Included features

- Dashboard showing saved habit, food, point, nutrition, and seven-day intake data.
- Date navigation and a monthly habit completion calendar.
- Habit creation, weekday completion, pause/resume, archive, and reversible completion points.
- Guided morning/evening journal prompts, mood, energy, free writing, and date-specific saves.
- Food search, custom food saving, per-100-g and per-serving calculations, meal grouping, editable quantity/meal, duplication, deletion, configurable targets, and a seven-day calorie chart.
- A reward shelf with transaction-backed redemption and balance checks.
- Responsive navigation and layouts for mobile and desktop.

## Data and security notes

This version is intentionally a **single-user local journal** and does not implement authentication. It uses one dedicated local profile in the configured database. Do not expose this deployment to untrusted users or the public internet. Add authentication and per-user account selection before operating this as a multi-user service.

Every mutation scopes records to the local profile, validates request data on the server, and calculates nutrition and points server-side. Calendar days and food logs are stored as PostgreSQL `DATE` values represented as `YYYY-MM-DD` strings in the application to avoid UTC timestamp day shifts. Food log rows preserve the nutrition basis and values at logging time, so later edits to a reusable food do not rewrite historical intake.

Without `DATABASE_URL`, the interface displays a setup notice and remains read-only. No external nutrition API is configured; food search uses the built-in estimated references and user-entered foods.

For local schema changes, use `npm run db:migrate -- --name <migration-name>`. For production, apply committed migrations with `npm run db:deploy`.

## Checks

```bash
npm run lint
npm test
npx tsc --noEmit
npm run build
```
