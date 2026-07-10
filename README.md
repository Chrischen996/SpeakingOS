# SpeakingOS

SpeakingOS is an AI speaking coach MVP focused on one reliable IELTS Speaking learning loop:

```text
Practice → Speech-to-Text → Transcript Confirm → Assessment → Memory → Review
```

## Workspace

This repository is organized as an npm monorepo:

```text
apps/
  web/      # Next.js 15 desktop web app
  api/      # NestJS REST + OpenAPI API
  worker/   # BullMQ background workers
packages/
  shared/   # shared zod schemas, enums, DTO types
  prompts/  # versioned prompt templates + output schemas
infra/
  compose/  # local PostgreSQL / Redis / MinIO
plans/
  speakingos-mvp-v1-design.md
```

## Quick start

```bash
npm install
cp .env.example .env
npm run dev:infra
npm run prisma:generate
npm run dev
```

## Useful commands

```bash
npm run dev              # run web, api, and worker concurrently
npm run build            # build all workspaces
npm run typecheck        # typecheck all workspaces
npm run prisma:generate  # generate Prisma client for the API app
npm run dev:infra        # start local postgres/redis/minio
npm run stop:infra       # stop local infra
```

## Design document

The unified product and architecture design lives at [`plans/speakingos-mvp-v1-design.md`](plans/speakingos-mvp-v1-design.md).
