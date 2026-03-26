# Postcard

Direct-mail operating system scaffold for real estate agents.

## Stack

- Next.js 15 App Router
- TypeScript
- Tailwind CSS 4
- Prisma + PostgreSQL
- Redis + BullMQ

## Quick Start

1. Copy `.env.example` to `.env`.
2. Start local services:

   ```bash
   docker compose up -d
   ```

3. Install dependencies:

   ```bash
   pnpm install
   ```

4. Generate Prisma client and apply schema:

   ```bash
   pnpm prisma:generate
   pnpm db:push
   ```

5. Seed the system templates:

   ```bash
   pnpm db:seed
   ```

6. Start the app:

   ```bash
   pnpm dev
   ```

## Current Scope

This scaffold establishes:

- Core app shell and route structure
- Initial Prisma domain model for contacts, templates, campaigns, and mailings
- Health and bootstrap API routes
- Magic-link auth with dev preview fallback
- Contacts CSV import, mock/Lob-backed address validation, and campaign draft creation
- Styled working screens for dashboard, editor, templates, contacts, campaigns, and login

## Next Implementation Targets

1. Fabric editor integration
2. Lob provider adapter and webhook ingestion
3. BullMQ worker and scheduled campaign dispatch
4. Scheduled send execution and webhook-driven status updates
5. AI-assisted copy and layout generation
