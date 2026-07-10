# SpeakingOS MVP Setup Complete ✅

The monorepo skeleton is bootstrapped and validated. All packages build and typecheck successfully.

## What was created

### Root workspace
- [`package.json`](package.json) — npm workspaces monorepo root
- [`tsconfig.base.json`](tsconfig.base.json) — shared TypeScript config
- [`.env.example`](.env.example) — environment template
- [`.gitignore`](.gitignore), [`.editorconfig`](.editorconfig), [`.prettierrc.json`](.prettierrc.json) — code style

### Packages
- [`packages/shared/`](packages/shared/) — Zod schemas for API DTOs, practice, assessment, review
- [`packages/prompts/`](packages/prompts/) — Versioned prompt templates + output schemas

### Apps
- [`apps/api/`](apps/api/) — NestJS REST API with:
  - OpenAPI + Swagger docs
  - Prisma schema (14 models: users, questions, practice_sessions, answers, feedback, expressions, mistakes, review_tasks, topic_stats, llm_usage_logs, media_assets, refresh_tokens)
  - Module skeleton: auth, practice, review, memory, dashboard, health
  - BullMQ queue registration for stt/assessment
- [`apps/worker/`](apps/worker/) — BullMQ background workers with:
  - 4 queue processors: stt, assessment, memory, review
  - Fake speech tool (returns mock transcripts)
  - Fake assessment agent (returns Band 6.5 with feedback)
- [`apps/web/`](apps/web/) — Next.js 15 desktop web with:
  - Home page showing today's practice + due reviews
  - Practice session flow placeholder (`/practice/session/new`)
  - TanStack Query provider
  - Tailwind + basic styling

### Infrastructure
- [`infra/compose/docker-compose.yml`](infra/compose/docker-compose.yml) — Local PostgreSQL, Redis, MinIO (S3-compatible storage)

### Documentation
- [`plans/speakingos-mvp-v1-design.md`](plans/speakingos-mvp-v1-design.md) — Unified product + architecture design
- [`README.md`](README.md) — Quick start commands

---

## Verification results

✅ **npm install** — 284 node_modules, lockfile created  
✅ **npm run build** — All workspaces compile (API, web, worker, packages)  
✅ **npm run typecheck** — All workspaces pass strict TypeScript checks  

---

## Quick start

### 1. Copy environment file
```bash
cp .env.example .env
```

Edit `.env` and set JWT secrets (replace the placeholder values).

### 2. Start local infrastructure
```bash
npm run dev:infra
```

This starts:
- PostgreSQL on `:5432`
- Redis on `:6379`
- MinIO on `:9000` (API), `:9001` (console)

### 3. Generate Prisma client + run migrations
```bash
npm run prisma:generate
cd apps/api
npx prisma migrate dev --name init
npx prisma db seed
cd ../..
```

This:
- Generates `@prisma/client` types
- Creates database tables
- Seeds 5 sample IELTS Part 1 questions

### 4. Run all services
```bash
npm run dev
```

This starts concurrently:
- Web: http://localhost:3000
- API: http://localhost:3001/api/v1
- API docs: http://localhost:3001/docs
- Worker: background console logs

---

## Next implementation steps

### Phase A — Wire real practice flow (Week 1-2)

1. **Auth implementation** ([`apps/api/src/modules/auth/`](apps/api/src/modules/auth/))
   - Implement JWT access + refresh token rotation
   - Hash passwords with bcrypt
   - Add auth guards to protected routes

2. **Practice API real implementation** ([`apps/api/src/modules/practice/`](apps/api/src/modules/practice/))
   - Implement `getTodayPractice()` with real Planner logic
   - Wire signed upload URL generation (MinIO presigned PUT)
   - Persist session state transitions in `practice_sessions` table
   - Enqueue STT job after audio upload confirmation

3. **STT processor** ([`apps/worker/src/processors/stt.processor.ts`](apps/worker/src/processors/))
   - Replace `FakeSpeechTool` with real Whisper API or OpenAI Speech
   - Save transcript to `answers` table
   - Update session status to `transcribed`

4. **Web recorder** ([`apps/web/app/practice/session/new/`](apps/web/app/practice/session/new/))
   - Implement `MediaRecorder` audio capture
   - Upload to signed URL
   - Poll session status until `transcribed`
   - Show transcript editor with confirm CTA

### Phase B — Assessment + Memory (Week 3-4)

5. **Assessment agent** ([`apps/worker/src/agents/`](apps/worker/src/agents/))
   - Replace `FakeAssessmentAgent` with real LLM call
   - Use prompt from [`packages/prompts/prompts/assessment/v1.md`](packages/prompts/prompts/assessment/v1.md)
   - Validate output against [`assessmentResultSchema`](packages/shared/src/schemas/assessment.ts)
   - Persist to `feedback` table

6. **Memory extraction** ([`apps/worker/src/processors/memory.processor.ts`](apps/worker/src/processors/))
   - Extract up to 5 expressions → `expressions` table
   - Extract up to 5 mistakes → `mistakes` table
   - Update `topic_stats` rolling average

7. **Review scheduling** ([`apps/worker/src/processors/review.processor.ts`](apps/worker/src/processors/))
   - Create review tasks for new expressions + high-severity mistakes
   - Use 1/3/7/14 day SRS intervals
   - Store in `review_tasks` table

8. **Dashboard** ([`apps/api/src/modules/dashboard/`](apps/api/src/modules/dashboard/))
   - Implement `GET /dashboard/summary`: streak, recent band, weak topics
   - Implement `GET /dashboard/progress`: time-series band scores

### Phase C — Review + Planner personalization (Week 5)

9. **Review completion** ([`apps/api/src/modules/review/`](apps/api/src/modules/review/))
   - Implement `GET /reviews/today`
   - Implement `POST /reviews/:id/complete` with remembered/fuzzy/forgot
   - Update SRS fields based on result

10. **Planner Agent** (currently stub in practice service)
    - Read user weak topics from `topic_stats`
    - Prefer questions not used in last 14 days
    - Return personalized question for today

### Phase D — Hardening (Week 6)

11. **Observability**
    - Add structured logging with `request_id`/`session_id`
    - Track queue lag, assessment success rate, cost per session
    - Add alert thresholds for assessment failure rate

12. **Evaluation harness**
    - Create golden transcript samples
    - Validate band scores within tolerance
    - Regression test after prompt changes

13. **Production readiness**
    - Rate limiting (IP + user)
    - Cost caps per user per day
    - Signed upload URL expiry enforcement
    - Account deletion cascade

---

## API endpoints (current state)

All routes are prefixed with `/api/v1`.

### Auth
- `POST /auth/register` ✅ Mock
- `POST /auth/login` ✅ Mock
- `POST /auth/refresh` ✅ Stub
- `POST /auth/logout` ✅ Stub
- `GET /me` ✅ Mock
- `PATCH /me` ✅ Mock

### Practice
- `GET /practice/today` ✅ Mock (returns demo question + empty reviews)
- `POST /practice/sessions` ✅ Mock (returns demo session ID)
- `POST /practice/sessions/:id/upload-url` ✅ Returns MinIO URL
- `POST /practice/sessions/:id/audio/complete` ✅ Enqueues STT job
- `GET /practice/sessions/:id` ✅ Mock (returns transcribed state)
- `PATCH /practice/sessions/:id/transcript` ✅ Stub (confirm transcript)
- `POST /practice/sessions/:id/assess` ✅ Enqueues assessment job

### Review / Memory / Dashboard
- `GET /reviews/today` ✅ Stub (empty array)
- `POST /reviews/:id/complete` ✅ Stub
- `GET /memory/expressions` ✅ Stub (empty array)
- `GET /memory/mistakes` ✅ Stub (empty array)
- `GET /dashboard/summary` ✅ Stub (zeros)
- `GET /dashboard/progress` ✅ Stub (empty points)

### Health
- `GET /health` ✅ Returns `{ ok: true, service: 'api' }`

---

## Database schema highlights

Key tables from [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma):

- **users** — email, password_hash, target_band, exam_date, timezone, onboarding_status
- **questions** — IELTS Part 1 questions (part, topic, difficulty, content, tags, source, active)
- **practice_sessions** — session lifecycle (user, question, practice_date, status, error tracking)
- **media_assets** — audio blobs (storage_key, mime_type, size, duration, checksum)
- **answers** — transcripts (raw_transcript, confirmed_transcript, stt_provider, confidence)
- **feedback** — assessment results (5 dimension scores, band, comments, native/band7 versions, rationale, model, prompt_version)
- **expressions** — learned expressions (text, meaning, example, topic, mastery)
- **mistakes** — tracked mistakes (type, span_text, correction, explanation, severity)
- **review_tasks** — spaced repetition (target_type, target_id, due_at, interval_days, ease_factor, repetition, status, last_result)
- **topic_stats** — rolling topic performance (attempt_count, avg_band, last_practiced_at, weak_score)
- **llm_usage_logs** — cost tracking (purpose, provider, model, tokens, latency, cost_usd)
- **refresh_tokens** — auth rotation (token_hash, expires_at, revoked_at)

Run `npx prisma studio` from `apps/api/` to browse data visually.

---

## Important commands

```bash
# Development
npm run dev                    # run web + api + worker concurrently
npm run dev:infra              # start postgres + redis + minio
npm run stop:infra             # stop local infra

# Build & validation
npm run build                  # build all workspaces
npm run typecheck              # typecheck all workspaces

# Database
npm run prisma:generate        # generate Prisma client after schema changes
cd apps/api && npx prisma migrate dev --name <name>  # create migration
cd apps/api && npx prisma db seed                     # seed questions
cd apps/api && npx prisma studio                      # visual DB browser

# Individual workspace
npm run start:dev -w @speakingos/api      # run API only
npm run start:dev -w @speakingos/worker   # run worker only
npm run dev -w @speakingos/web            # run web only
```

---

## Architecture decisions applied

From [`plans/speakingos-mvp-v1-design.md`](plans/speakingos-mvp-v1-design.md):

✅ **Desktop web first** (Chrome/Safari). Mobile later.  
✅ **1 new Part 1 question per day** + due reviews.  
✅ **Transcript must be confirmed** before assessment.  
✅ **NestJS REST + OpenAPI** (not tRPC).  
✅ **Workflow-orchestrated specialist agents** (not autonomous multi-agent chat).  
✅ **Structured memory first** (no vector DB in V1).  
✅ **Fake providers** for local development without paid AI calls.

---

## What's mocked vs real

| Component | Status |
|---|---|
| Auth endpoints | Mock (returns demo tokens) |
| Practice today plan | Mock (returns demo question) |
| Session creation | Mock (returns demo session ID) |
| Upload URL generation | **Real** (MinIO presigned URL) |
| STT job enqueue | **Real** (BullMQ) |
| STT processor | Fake (returns hardcoded transcript) |
| Transcript confirm | Stub (updates in-memory state) |
| Assessment job enqueue | **Real** (BullMQ) |
| Assessment processor | Fake (returns Band 6.5 + mock feedback) |
| Memory/review processors | Stub (returns `{ ok: true }`) |
| Web recorder | UI placeholder (no MediaRecorder yet) |
| Web polling | Placeholder (hardcoded state transitions) |

---

## Known limitations / TODOs

1. **No auth enforcement yet** — All routes are public until JWT guards are wired.
2. **No Prisma integration in endpoints** — Practice/review/memory controllers return mock data; need to wire PrismaService.
3. **No real STT provider** — Worker uses `FakeSpeechTool`; replace with Whisper API or OpenAI Speech.
4. **No real LLM calls** — Assessment agent is fake; wire OpenAI/Claude/DeepSeek via prompt package.
5. **No MediaRecorder** — Web recorder page is a placeholder; need audio capture + upload flow.
6. **No polling logic** — Web practice flow manually steps through states; need status polling with TanStack Query.
7. **No review completion UX** — Review routes are stubs.
8. **No dashboard charts** — Dashboard endpoints return zeros.
9. **No MinIO bucket auto-creation validation** — Compose init container runs but may need manual bucket check.

---

## File structure summary

```
├── apps/
│   ├── api/                    # NestJS REST API
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # 14 models, migrations
│   │   │   └── seed.ts         # 5 sample questions
│   │   └── src/
│   │       ├── main.ts         # Bootstrap with OpenAPI
│   │       ├── app.module.ts   # Root module + Redis/BullMQ config
│   │       └── modules/
│   │           ├── auth/       # Mock auth endpoints
│   │           ├── practice/   # Mock practice endpoints + queue enqueue
│   │           ├── review/     # Stub review endpoints
│   │           ├── memory/     # Stub memory endpoints
│   │           ├── dashboard/  # Stub dashboard endpoints
│   │           ├── health/     # Health check
│   │           └── prisma/     # Global PrismaService
│   ├── worker/                 # BullMQ processors
│   │   └── src/
│   │       ├── main.ts         # Register 4 workers + queue events
│   │       ├── agents/
│   │       │   └── fake-assessment.agent.ts
│   │       └── tools/
│   │           └── fake-speech.tool.ts
│   └── web/                    # Next.js 15 desktop app
│       ├── app/
│       │   ├── page.tsx        # Home: today practice + due reviews
│       │   ├── layout.tsx      # Root layout + TanStack Query provider
│       │   └── practice/session/new/
│       │       └── page.tsx    # Practice flow placeholder
│       └── components/
│           └── query-provider.tsx
├── packages/
│   ├── shared/                 # Zod schemas
│   │   └── src/schemas/
│   │       ├── common.ts       # UUID, date, error codes
│   │       ├── practice.ts     # Session status, today practice, DTOs
│   │       ├── assessment.ts   # AssessmentResult schema
│   │       └── review.ts       # Review task schemas
│   └── prompts/                # Versioned prompts
│       ├── prompts/
│       │   ├── assessment/v1.md
│       │   ├── memory/v1.md
│       │   ├── planner/v1.md
│       │   └── review/v1.md
│       └── src/index.ts
├── infra/compose/
│   └── docker-compose.yml      # Postgres + Redis + MinIO
├── plans/
│   └── speakingos-mvp-v1-design.md   # Unified design doc
├── .env.example
├── package.json                # npm workspaces root
├── tsconfig.base.json
└── README.md
```

---

## Troubleshooting

### Port conflicts
If `:3000`, `:3001`, `:5432`, `:6379`, `:9000`, or `:9001` are in use:
```bash
lsof -i :<port>   # find process
kill -9 <pid>     # kill it
```

Or edit compose ports / app env vars.

### Prisma client not found
```bash
npm run prisma:generate
```

### Worker not processing jobs
1. Check Redis is running: `redis-cli ping`
2. Check worker console for connection errors
3. Verify `REDIS_URL` in `.env`

### Web can't reach API
1. Check API is running on `:3001`
2. Check `NEXT_PUBLIC_API_BASE_URL` in web env (defaults to `http://localhost:3001/api/v1`)
3. CORS is enabled for `http://localhost:3000` in API

### MinIO bucket doesn't exist
```bash
docker exec -it speakingos-minio mc alias set local http://localhost:9000 speakingos speakingos-secret
docker exec -it speakingos-minio mc mb local/speakingos-audio
```

---

## Success criteria checklist

✅ Monorepo structure matches design doc  
✅ All workspaces install and build cleanly  
✅ TypeScript strict mode passes  
✅ Prisma schema covers learning loop (sessions/answers/feedback/memory/review)  
✅ API has OpenAPI docs at `/docs`  
✅ Worker registers 4 queues  
✅ Web shows today practice placeholder  
✅ Local infra compose starts postgres/redis/minio  
✅ Fake providers allow local dev without AI costs  

Next: Wire real auth → practice flow → STT → assessment → memory → review → dashboard.

---

**Ready to implement Phase A.** Start with auth + real practice API wiring per the roadmap above.
