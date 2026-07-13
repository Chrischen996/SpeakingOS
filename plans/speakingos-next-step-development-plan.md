# SpeakingOS Next-Step Development Plan

> Phase: Persisted vertical slice  
> Goal: Connect the current web prototype to the real API, queue workers, and database while retaining fake AI providers.

---

## 1. Objective

The next milestone is one reliable, refresh-safe practice session:

```text
Today page
  -> create persisted session
  -> submit simulated audio metadata
  -> Fake STT writes transcript
  -> user confirms transcript
  -> Fake Assessment writes feedback and memory
  -> session reaches completed
  -> refresh restores the completed result
```

This milestone validates the application architecture before adding browser recording, object storage uploads, authentication, or paid AI providers.

## 2. Current Baseline

Already implemented:

- Prisma schema and initial PostgreSQL migration
- Seeded demo user and five IELTS Part 1 questions
- One practice session per user per local calendar day
- Persisted Practice API with state validation
- BullMQ STT and assessment jobs with retries
- Fake STT persistence to `answers`
- Fake assessment persistence to `feedback`, `expressions`, `review_tasks`, and `topic_stats`
- Session completion and failure recording
- Shared Zod request and response schemas
- Next.js home and practice prototype pages

Still simulated or missing:

- The practice page changes state only in React memory
- The page does not call Practice API endpoints
- No polling or refresh recovery exists
- Audio capture and upload are placeholders
- PostgreSQL, Redis, and MinIO cannot currently run because Docker is not installed on the development machine

## 3. Scope

### In scope

- Start and initialize local PostgreSQL and Redis
- Connect the home and practice pages to the API
- Use TanStack Query for queries, mutations, and polling
- Persist the session ID in the URL
- Restore an in-progress or completed session after refresh
- Display loading, empty, conflict, failed, and retry states
- Verify the full flow with Fake STT and Fake Assessment
- Add focused tests around state mapping and API behavior

### Out of scope

- Real microphone recording
- Real MinIO upload or presigned URLs
- Real speech-to-text provider
- Real LLM assessment
- JWT authentication and multiple users
- Dashboard expansion
- Full spaced-repetition completion UI

## 4. Prerequisite: Local Infrastructure

Install Docker Desktop, then run:

```bash
cd /Users/chenjiaxu/Project/SpeakingOS/SpeakingOS
npm run dev:infra
npm run prisma:generate
npm exec -w @speakingos/api prisma migrate deploy
npm exec -w @speakingos/api prisma db seed
```

Expected services:

| Service | Address | Purpose |
|---|---|---|
| PostgreSQL | `localhost:5432` | Source of truth |
| Redis | `localhost:6379` | BullMQ queues |
| MinIO | `localhost:9000` | Reserved for the recording milestone |
| MinIO Console | `localhost:9001` | Local storage inspection |

Infrastructure acceptance checks:

```bash
docker compose -f infra/compose/docker-compose.yml ps
npm exec -w @speakingos/api prisma migrate status
curl http://localhost:3001/api/v1/health
```

## 5. Target API Sequence

The web application must use this sequence without skipping state gates:

| Step | Request | Expected result |
|---|---|---|
| 1 | `GET /practice/today` | Seeded question and optional active session |
| 2 | `POST /practice/sessions` | Persisted `sessionId`, idempotent for the day |
| 3 | `POST /practice/sessions/:id/upload-url` | Storage key and `recording` state |
| 4 | `POST /practice/sessions/:id/audio/complete` | STT job queued, `transcribing` state |
| 5 | `GET /practice/sessions/:id` | Poll until `transcribed` or `failed` |
| 6 | `PATCH /practice/sessions/:id/transcript` | Confirmed transcript |
| 7 | `POST /practice/sessions/:id/assess` | Assessment job queued |
| 8 | `GET /practice/sessions/:id` | Poll until `completed` or `failed` |

Temporary simulated audio request:

```json
{
  "storageKey": "audio/<session-id>.webm",
  "mimeType": "audio/webm",
  "sizeBytes": 128000,
  "durationMs": 30000,
  "checksum": "simulated-audio-v1"
}
```

No browser upload is performed in this phase. The simulated payload exists only to exercise the real state machine and Worker.

## 6. Frontend Design

### 6.1 API client

Create a small typed client under `apps/web/lib/`:

```text
apps/web/lib/
  api-client.ts
  practice-api.ts
```

Responsibilities:

- Centralize `NEXT_PUBLIC_API_BASE_URL`
- Set JSON headers and parse JSON responses
- Convert non-2xx responses into a consistent application error
- Validate important responses with shared Zod schemas
- Keep endpoint details out of React components

### 6.2 Query hooks

Create focused hooks under `apps/web/hooks/`:

```text
use-today-practice.ts
use-practice-session.ts
use-create-practice-session.ts
use-confirm-transcript.ts
use-start-assessment.ts
```

Polling rules:

- Poll every second only while status is `transcribing` or `assessing`
- Stop polling on `transcribed`, `completed`, or `failed`
- Refetch immediately after each mutation
- Do not poll while the browser tab is unfocused unless a job is active

### 6.3 Page state model

The UI state must be derived from server status rather than an independent React `step` value:

| Server status | UI |
|---|---|
| No session | Start practice |
| `created`, `recording` | Simulated recorder action |
| `audio_uploaded`, `transcribing` | Transcribing progress |
| `transcribed` | Editable transcript |
| `transcript_confirmed`, `assessing` | Assessment progress |
| `completed` | Persisted feedback |
| `failed` | Stage-specific error and retry action |

This prevents the browser and database from disagreeing after refresh or navigation.

### 6.4 URL and refresh recovery

After session creation, replace the URL with:

```text
/practice/session/new?questionId=<question-id>&sessionId=<session-id>
```

On page load:

1. Use `sessionId` when present.
2. Otherwise read `activeSessionId` from `GET /practice/today`.
3. Otherwise create a session only after the user presses Start.
4. Never create a second session merely because the page refreshed.

## 7. Error and Retry Behavior

| Failure | Required behavior |
|---|---|
| API unavailable | Show a retry action; do not silently switch to fake local state on the practice page |
| Invalid request | Show the server validation message near the action |
| Daily-session conflict | Reload today's plan and resume the existing session |
| STT failed | Allow re-running the simulated audio step |
| Assessment failed | Preserve confirmed transcript and allow assessment retry |
| Page refreshed during a job | Restore session and resume polling |
| Polling timeout | Stop automatic polling and provide manual refresh |

The existing backend must be extended so a `failed` session can retry the correct failed stage without creating another daily session.

## 8. Implementation Work Packages

### Package A: Environment and smoke test

- Install and start Docker Desktop
- Apply migration and seed
- Start API and Worker
- Confirm queues connect to Redis
- Exercise the API sequence with HTTP requests

Exit condition: a manually created session reaches `completed` and its feedback exists in PostgreSQL.

### Package B: Typed frontend API layer

- Add API client and error type
- Add Practice API functions
- Validate responses against shared schemas
- Remove fallback data from the practice workflow

Exit condition: browser code can create and fetch a real session without UI state changes.

### Package C: Server-driven practice page

- Replace local `Step` state with Session status mapping
- Add mutations for audio completion, transcript confirmation, and assessment
- Add bounded polling
- Render persisted feedback

Exit condition: the existing simulated buttons complete a real database-backed session.

### Package D: Resume and failure states

- Add `sessionId` URL persistence
- Resume active sessions from the Today response
- Add retry behavior for STT and assessment failures
- Add manual refresh after polling timeout

Exit condition: refresh works at every session stage without creating duplicate data.

### Package E: Verification

- Add state-to-view unit tests
- Add API integration coverage for daily session idempotency and invalid transitions
- Test Worker retry idempotency
- Run typecheck, build, and browser interaction checks

Exit condition: all acceptance scenarios below pass consistently.

## 9. Acceptance Criteria

The milestone is complete only when all of these are true:

- The Today page reads a seeded question from PostgreSQL.
- Pressing Start creates exactly one session for the demo user and current local date.
- Repeating session creation returns the same session.
- The simulated audio action causes the Worker to persist a transcript.
- The transcript cannot be assessed until the user confirms it.
- Editing the transcript changes the text used for assessment.
- Fake Assessment persists Band 6.5 feedback.
- Expressions and review tasks are created without duplicates.
- The final Session status is `completed`.
- Refreshing the page at every stage restores the correct screen.
- Worker failures appear as a visible recoverable state.
- Browser console contains no application errors during the happy path.
- `npm run typecheck` and `npm run build` pass.

## 10. Verification Matrix

| Scenario | Expected result |
|---|---|
| First visit today | One active Part 1 question |
| Double-click Start | One database session |
| Refresh while transcribing | Polling resumes |
| Confirm empty transcript | HTTP 400 and inline error |
| Assess before confirmation | HTTP 409 |
| Refresh after completion | Same feedback is displayed |
| Worker processes a retry | No duplicate feedback or memory |
| Redis unavailable during enqueue | Session rolls back to a retryable state |
| API unavailable | Explicit connection error, no fabricated completion |

## 11. Known Technical Debt Accepted for This Phase

- A fixed demo user replaces authentication.
- Fake STT does not read an actual audio object.
- The upload URL is not yet a real presigned PUT URL.
- Assessment, memory extraction, and review scheduling run in one Worker transaction.
- Queue publication and database status updates do not yet use a transactional outbox.
- Review tasks use the first `1 day` interval only.

These constraints are acceptable for validating the vertical slice, but they must not be presented as production-ready behavior.

## 12. Next Milestone After Completion

Once this persisted vertical slice is stable, replace only the input side:

```text
Simulated audio metadata
  -> MediaRecorder
  -> real browser audio Blob
  -> MinIO presigned PUT
  -> upload confirmation
  -> existing STT queue flow
```

After recording and storage are stable, replace Fake STT and Fake Assessment behind provider interfaces. Authentication should follow before any multi-user deployment.
