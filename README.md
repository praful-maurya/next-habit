# The Daily Practice — My Discipline Journal

A multi-user productivity journal for daily habit check-offs, food and nutrition logging, guided reflection, and rewards. The project uses Next.js App Router, TypeScript, Bootstrap 5, Prisma, PostgreSQL, and Neon Managed Auth.

## Requirements

- Node.js 20.9 or later
- PostgreSQL 14 or later

## Run locally

1. Install packages:

   ```bash
   npm install
   ```

2. Link the project to Neon and run `neon deploy` so the branch's Postgres and Auth URLs are pulled into `.env.local`. Set `NEON_AUTH_COOKIE_SECRET` to a private random value of at least 32 characters (for example, `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`). Keep secrets out of `.env.example`.

3. Generate Prisma Client and apply committed migrations:

   ```bash
   npm run db:generate
   npm run db:deploy
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

The first signed-in dashboard request creates an application profile linked to the user's Neon Auth identity, starter habits, sample rewards, estimated food references, and default nutrition targets. Starter habits, rewards, and targets are created per account; built-in food references are shared and read-only. Nutrition reference values are estimates, not medical or dietary advice.

## Included features

- Dashboard showing saved habit, food, point, nutrition, and seven-day intake data.
- Date navigation and a monthly habit completion calendar.
- Habit creation, weekday completion, pause/resume, archive, and reversible completion points.
- Guided morning/evening journal prompts, mood, energy, free writing, and date-specific saves.
- Food search, custom food saving, per-100-g and per-serving calculations, meal grouping, editable quantity/meal, duplication, deletion, configurable targets, and a seven-day calorie chart.
- A Reward Vault that calculates a server-persisted Monday–Sunday discipline score from scheduled habit occurrences, unlocks at 80%, and supports one redemption per active reward each eligible week.
- Analytics for habit completion and recorded calorie/protein trends over 7, 30, or 90 days.
- Responsive navigation and layouts for mobile and desktop, with a collapsible desktop sidebar and reduced-motion support.

## Authentication and data isolation

- `/sign-in` and `/sign-up` use Neon Managed Auth; `/forgot-password` and `/reset-password` use the provider's supported reset UI. Signed-in users can update their display name and sign out in `/settings`.
- The root journal and profile settings page are protected by Next.js `proxy.ts`. Every data API independently checks the Neon Auth session and scopes personal reads and writes to the authenticated application profile.
- Existing rows owned by the former local profile remain attached to that profile and are not transferred to the first registering account. New identities are connected through the nullable unique `User.authUserId` field.
- `DATABASE_URL` is the pooled connection for application traffic. `DATABASE_URL_UNPOOLED` is Prisma's direct migration URL. `NEON_AUTH_BASE_URL` is supplied by `neon deploy`; `NEON_AUTH_COOKIE_SECRET` is app-generated and must stay private.
- Password reset links expire after 15 minutes. Neon Auth email verification is not enabled by default; enable and test it in the Neon Auth settings before public launch. Production also requires a custom SMTP provider and adding the deployed app origin to the branch's trusted domains. The shared development email provider is rate-limited.

Calendar days and food logs are stored as PostgreSQL `DATE` values represented as `YYYY-MM-DD` strings in the application to avoid UTC timestamp day shifts. Food log rows preserve nutrition values at logging time, so later edits to a reusable food do not rewrite historical intake. No external nutrition API is configured; food search uses built-in estimated references and user-entered foods.

The Prisma scripts load `.env.local`, where `neon deploy` writes `DATABASE_URL_UNPOOLED`. For local schema changes, use `npm run db:migrate -- --name <migration-name>`. For production, apply committed migrations with `npm run db:deploy`.

Weekly discipline scores count scheduled occurrences for active habits; missed past occurrences count as incomplete, while today's unfinished and future occurrences do not count against the live score. The score for the prior week is finalized on the next dashboard load or before a habit status change, preserving the recorded snapshot from later edits. Historical scores are not backfilled for weeks before this feature is deployed.

## Checks

```bash
npm run lint
npm test
npx tsc --noEmit
npm run build
```
