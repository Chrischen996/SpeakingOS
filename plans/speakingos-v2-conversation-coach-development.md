# SpeakingOS V2 - AI Conversation Coach Development Plan

> Status: Proposed  
> Product direction: Pingo-style voice interaction with an IELTS-specific learning system  
> Relationship to V1: V2 extends the current persisted practice loop; it does not replace the V1 design until the realtime conversation milestone is validated.

---

## 1. Product Decision

SpeakingOS V2 will be an AI IELTS speaking examiner and coach with long-term learner memory.

The product should adopt the interaction model of a modern AI language companion:

- Voice-first, multi-turn conversations
- Scenario and goal-driven sessions
- Immediate conversational follow-up
- Session transcripts and learning summaries
- Persistent memory of level, mistakes, vocabulary, and goals
- Personalized future sessions and reviews

The product should not become a general-purpose clone of Pingo. The initial differentiation is narrow and explicit:

> Help IELTS learners around Band 5.5-6.5 reach Band 7 through realistic examiner conversations, evidence-based scoring, and personalized review.

Pingo is a product reference, not an integration provider. No Pingo API dependency should be designed until a documented commercial developer API is available.

## 2. V2 Learning Loop

```text
Open today's plan
  -> choose or resume an IELTS scenario
  -> enter a 3-5 minute voice conversation
  -> AI examiner asks adaptive follow-up questions
  -> session transcript and audio events are persisted
  -> post-session IELTS assessment runs asynchronously
  -> expressions, mistakes, and topic signals are saved
  -> review tasks and the next conversation are personalized
```

The session should feel conversational during practice and analytical only after the conversation ends. Corrections must not interrupt every learner sentence.

## 3. Goals and Non-Goals

### 3.1 V2 MVP goals

- English only
- IELTS Speaking Part 1 only
- One AI examiner persona
- One 3-5 minute conversation per daily practice
- Five to eight learner turns per session
- Browser microphone and audio playback
- WebRTC realtime transport
- Live finalized transcript for each turn
- Adaptive follow-up questions
- End-session IELTS assessment
- Long-term error, expression, and topic memory
- Refresh-safe session history and completed report
- Desktop web first, with responsive layouts

### 3.2 Explicit non-goals

- Multiple learning languages
- Native iOS or Android applications
- Voice cloning
- Social feeds, rankings, or user-generated content
- Teacher or institution dashboards
- Offline AI conversation
- Fully autonomous multi-agent systems
- IELTS Part 2 and Part 3 in the first V2 milestone
- Provider switching during an active session
- Official IELTS score claims

## 4. Product Experience

### 4.1 Today page

The Today page becomes a conversation launch surface:

- Today's examiner scenario
- Estimated duration
- Topic and learning objective
- Resume state when a session is active
- Due reviews
- Recent IELTS dimension profile
- Primary action: `Start conversation` or `Resume conversation`

### 4.2 Conversation room

The conversation room is the main V2 experience:

- Current examiner question
- Speaking and listening state
- Microphone state
- Session timer
- Finalized live transcript
- Optional short hint
- Pause and end-session commands
- Connection and recovery state

The first implementation may use explicit turn-taking while retaining WebRTC transport:

```text
Examiner speaks
  -> learner presses and speaks
  -> learner ends turn
  -> transcript finalizes
  -> examiner responds
```

Automatic voice activity detection and interruption handling are introduced only after this flow is stable.

### 4.3 Session report

The report should contain:

- Estimated overall IELTS band
- Fluency and Coherence
- Lexical Resource
- Grammatical Range and Accuracy
- Pronunciation, only when supported by audio evidence
- Strong moments from the conversation
- High-impact corrections
- Band 7 alternative responses
- Saved expressions
- Review tasks
- Next-session focus

`Naturalness` can remain as a secondary coaching metric, but it must not be presented as an official IELTS criterion.

## 5. System Architecture

### 5.1 Target topology

```text
Next.js browser client
  |  microphone and speaker
  |  WebRTC media and realtime events
  v
Realtime voice provider
  ^                         |
  | sideband/session tools  | finalized events
  |                         v
NestJS API and realtime control layer
  |                |
  | persist        | enqueue after session
  v                v
PostgreSQL       Redis / BullMQ
                   |
                   v
              Worker processes
              - assessment
              - memory
              - review scheduling
              - analytics
```

### 5.2 Responsibility boundaries

#### Web

- Request a short-lived realtime client credential
- Establish and close the WebRTC session
- Capture microphone input and play provider audio
- Render speaking, listening, reconnecting, and error states
- Render finalized turn transcripts
- Never receive a permanent provider API key
- Never calculate authoritative session state locally

#### API

- Authenticate and authorize the user
- Create the conversation session
- Issue short-lived provider credentials
- Configure examiner instructions and session metadata
- Receive finalized conversation events
- Own state transitions and idempotency
- End or cancel sessions
- Enqueue post-session processing

#### Realtime provider

- Accept live audio
- Produce low-latency spoken responses
- Produce finalized transcript events
- Maintain active conversational context
- Call approved server tools when enabled

#### Worker

- Assess completed conversation evidence
- Extract expressions and mistakes
- Update learner and topic statistics
- Schedule reviews
- Record model usage and processing failures

BullMQ must not carry live audio or individual audio chunks.

## 6. Provider Strategy

### 6.1 Initial provider

Use OpenAI Realtime as the first implementation candidate because it supports low-latency voice-agent sessions and browser WebRTC connections.

The browser flow should use a short-lived credential created by the API. Permanent credentials remain on the server.

### 6.2 Provider abstraction

Do not create one generic `VoiceProvider` interface that hides materially different realtime protocols. Separate provider concerns:

```ts
interface RealtimeSessionProvider {
  createClientSession(input: RealtimeSessionInput): Promise<RealtimeClientSession>;
  updateSession(input: RealtimeSessionUpdate): Promise<void>;
  closeSession(providerSessionId: string): Promise<void>;
}

interface ConversationAssessmentProvider {
  assess(input: ConversationAssessmentInput): Promise<ConversationAssessment>;
}

interface PronunciationAssessmentProvider {
  assessAudio(input: PronunciationAssessmentInput): Promise<PronunciationAssessment>;
}
```

The pronunciation interface remains optional until a provider is validated against real learner audio.

### 6.3 Package boundaries

```text
packages/
  conversation-contracts/   # events, schemas, public DTOs
  prompts/                  # examiner and assessment prompts

apps/api/src/modules/
  conversations/           # REST session lifecycle
  realtime/                # credentials and provider control

apps/worker/src/
  providers/realtime/      # server-side realtime adapter if required
  providers/assessment/    # structured assessment adapter
  processors/conversation-assessment.processor.ts
  processors/conversation-memory.processor.ts

apps/web/
  features/conversation/   # WebRTC, audio, transcript, UI state
```

Provider SDKs and permanent credentials must not be exported from shared browser packages.

## 7. Conversation State Machine

### 7.1 Session states

```text
created
  -> connecting
  -> active
  -> ending
  -> processing
  -> completed

created / connecting / active / ending / processing
  -> failed

created / connecting / active
  -> cancelled
```

Suggested enum:

```ts
type ConversationSessionStatus =
  | 'created'
  | 'connecting'
  | 'active'
  | 'ending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';
```

### 7.2 Turn states

```text
started -> streaming -> finalized
                    -> interrupted
                    -> failed
```

Only finalized turns are used for assessment and learner memory. Partial transcript deltas are UI events and should not be written as independent database rows.

### 7.3 State ownership

- PostgreSQL is the source of truth for durable session status.
- Realtime provider state is temporary execution state.
- The browser renders server/provider events but does not invent completed states.
- Repeated end-session requests must be idempotent.
- A completed session cannot return to `active`.

## 8. Data Model

Add new conversation models instead of forcing multi-turn data into the existing one-answer relationship.

### 8.1 ConversationScenario

```text
id
part                    part1 initially
topic
title
objective
difficulty
openingPrompt
examinerInstructions
expectedTurnCount
estimatedDurationSeconds
active
version
createdAt
updatedAt
```

### 8.2 ConversationSession

```text
id
userId
scenarioId
practiceDate
status
provider
providerSessionId
promptVersion
startedAt
endedAt
completedAt
failedStage
errorCode
errorMessage
createdAt
updatedAt
```

Constraints:

- One daily conversation session per user in the V2 MVP
- Provider session ID is optional until the connection is established
- Store the prompt version used to start the session

### 8.3 ConversationTurn

```text
id
sessionId
sequence
speaker                  learner | examiner
status                   started | finalized | interrupted | failed
transcript
startedAt
endedAt
durationMs
providerItemId
audioAssetId             optional
confidence               optional
createdAt
```

Constraints:

- Unique `(sessionId, sequence)`
- Unique provider item ID when present
- Store finalized transcript text, not every partial delta

### 8.4 ConversationAssessment

```text
id
sessionId
overallBand
fluencyCoherenceScore
lexicalResourceScore
grammarRangeAccuracyScore
pronunciationScore       nullable
pronunciationEvidence    nullable JSON
strengths                JSON
corrections              JSON
band7Examples            JSON
summary
model
promptVersion
rawResponse
createdAt
```

Pronunciation score must remain nullable when the assessment input has no validated audio evidence.

### 8.5 Existing model reuse

- `Expression`: add optional `conversationSessionId` or a source relation
- `Mistake`: add optional `conversationSessionId` and `conversationTurnId`
- `ReviewTask`: continue using polymorphic targets
- `TopicStat`: update from completed conversation assessments
- `LlmUsageLog`: add realtime-session and conversation-assessment purposes
- Existing `PracticeSession`, `Answer`, and `Feedback` remain available for the V1 single-answer flow during migration

## 9. API Design

All routes remain under `/api/v1`.

### 9.1 Scenario and session endpoints

```text
GET  /conversation-scenarios/today
POST /conversation-sessions
GET  /conversation-sessions/:id
POST /conversation-sessions/:id/realtime-session
POST /conversation-sessions/:id/end
POST /conversation-sessions/:id/cancel
GET  /conversation-sessions/:id/turns
GET  /conversation-sessions/:id/report
```

### 9.2 Create session

```json
POST /conversation-sessions
{
  "scenarioId": "uuid"
}
```

Response:

```json
{
  "sessionId": "uuid",
  "status": "created",
  "scenario": {
    "id": "uuid",
    "title": "Daily routines",
    "topic": "Lifestyle",
    "estimatedDurationSeconds": 240
  }
}
```

Creation must return the existing daily session when the request is repeated.

### 9.3 Create realtime session

```json
POST /conversation-sessions/:id/realtime-session
```

Response must contain only short-lived client connection material:

```json
{
  "provider": "openai",
  "clientSecret": "short-lived-secret",
  "expiresAt": "ISO-8601",
  "sessionConfig": {
    "mode": "guided-turn-taking"
  }
}
```

The response must never include the permanent API key.

### 9.4 End session

```json
POST /conversation-sessions/:id/end
{
  "reason": "user_finished"
}
```

Expected behavior:

1. Stop accepting new learner turns.
2. Close or detach the realtime provider session.
3. Finalize pending turn events.
4. Set the database state to `processing`.
5. Enqueue post-session assessment with an idempotent job ID.
6. Return the current processing state.

## 10. Realtime Event Contract

Define provider-neutral browser events in `conversation-contracts`:

```ts
type ConversationClientEvent =
  | { type: 'connection.ready'; sessionId: string }
  | { type: 'microphone.state'; state: 'idle' | 'capturing' }
  | { type: 'turn.transcript.delta'; turnId: string; text: string }
  | { type: 'turn.transcript.final'; turnId: string; text: string }
  | { type: 'examiner.speaking.started'; turnId: string }
  | { type: 'examiner.speaking.ended'; turnId: string }
  | { type: 'session.warning'; code: string; message: string }
  | { type: 'session.failed'; code: string; message: string };
```

The provider adapter maps provider-native events into these application events. Do not leak provider event names throughout UI components.

## 11. Examiner Orchestration

### 11.1 Examiner behavior

The examiner should:

- Ask one question at a time
- Wait for the learner to finish
- Ask relevant follow-up questions
- Adapt vocabulary and question complexity to the learner level
- Keep the session within the selected IELTS topic
- Avoid lengthy teaching monologues
- Avoid correcting every sentence during the live conversation
- End after the configured duration or turn count

### 11.2 Prompt structure

Realtime examiner prompts should have explicit sections:

```text
ROLE
SESSION GOAL
LEARNER PROFILE
SCENARIO
TURN POLICY
FOLLOW-UP POLICY
CORRECTION POLICY
ENDING POLICY
SAFETY AND UNCLEAR AUDIO POLICY
OUTPUT AND TOOL RULES
```

Prompt versions must be immutable once used by a completed session.

### 11.3 Learner context budget

Provide only high-value memory to the realtime session:

- Estimated band
- Target band
- Two or three recurring mistakes
- Two weak topics
- Five relevant expressions under review
- Last session focus

Do not load the full learning history into every realtime session.

## 12. IELTS Assessment Design

### 12.1 Official-style dimensions

The assessment schema should use:

- Fluency and Coherence
- Lexical Resource
- Grammatical Range and Accuracy
- Pronunciation

Every score must include evidence linked to one or more finalized turns.

### 12.2 Evidence policy

- Transcript evidence can support fluency structure, coherence, grammar, and vocabulary.
- Timing and pause metadata can support limited fluency observations.
- Pronunciation requires audio evidence from a validated model or provider.
- If pronunciation evidence is unavailable, return `null`, not an invented score.
- The overall score must be labelled as an estimate, not an official IELTS result.

### 12.3 Post-session job chain

```text
conversation_assessment
  -> conversation_memory
  -> conversation_review
  -> conversation_completed
```

Each job must be idempotent and safe to retry. A failed downstream memory job must not delete a valid assessment.

## 13. Frontend Structure

```text
apps/web/features/conversation/
  api/
    conversation-api.ts
  audio/
    realtime-connection.ts
    microphone-controller.ts
    audio-playback.ts
  hooks/
    use-conversation-session.ts
    use-realtime-connection.ts
    use-conversation-turns.ts
  components/
    conversation-room.tsx
    examiner-state.tsx
    microphone-control.tsx
    live-transcript.tsx
    connection-status.tsx
    end-session-dialog.tsx
  state/
    conversation-reducer.ts
```

UI state should be driven by a reducer or explicit state machine. Independent booleans such as `isRecording`, `isLoading`, `isSpeaking`, and `isEnding` must not create impossible combinations.

## 14. Failure and Recovery

| Failure | Required behavior |
|---|---|
| Microphone denied | Explain the blocked state and allow permission retry |
| Realtime credential expired before connect | Request a new credential |
| Temporary network loss | Show reconnecting state and preserve finalized turns |
| Provider session lost | End gracefully and process available evidence |
| Duplicate provider event | Ignore using provider item ID idempotency |
| Transcript delta lost | Continue; only finalized transcript is durable |
| Assessment failure | Preserve conversation and allow background retry |
| Browser refresh during active session | Resume session metadata; reconnect only when provider supports it |
| User ends while examiner speaks | Stop playback, finalize available events, enqueue processing |

The MVP does not promise seamless continuation of the same media connection after a full page reload. It must preserve already finalized turns and fail gracefully.

## 15. Security, Privacy, and Cost

### 15.1 Credentials

- Permanent provider keys stay in API or Worker environments.
- Browser credentials are short-lived and scoped to one session.
- A user can request credentials only for an owned active session.
- Credential endpoints require rate limiting.

### 15.2 Voice data

- Collect explicit consent before the first microphone session.
- Document retention policy for audio and transcripts.
- Allow users to delete sessions and derived memory.
- Avoid storing raw audio by default unless pronunciation analysis requires it.
- If audio is stored, use private object storage and expiring signed URLs.

### 15.3 Cost controls

- Maximum session duration: 5 minutes for the MVP
- Maximum learner turns: 8
- One active session per user
- Daily usage quota
- Provider timeout and idle timeout
- Cost log per realtime and post-session model call
- Alert when cost per completed session exceeds the target

## 16. Observability

Minimum structured fields:

```text
requestId
userId
conversationSessionId
providerSessionId
turnId
provider
model
promptVersion
eventType
latencyMs
inputAudioSeconds
outputAudioSeconds
costUsd
errorCode
```

Initial metrics:

- Realtime connection success rate
- Time to first examiner audio
- Learner transcript finalization latency
- Conversation completion rate
- Reconnect rate
- Assessment success rate
- Average session duration
- Average turns per session
- Cost per completed session
- D1 and D7 return rate

## 17. Testing Strategy

### 17.1 Unit tests

- Session and turn state transitions
- Provider event mapping
- Prompt builder
- Learner memory selection
- IELTS assessment schema validation
- Score aggregation with nullable pronunciation
- Idempotent event handling

### 17.2 Integration tests

- Session creation and daily idempotency
- Realtime credential authorization
- Finalized turn persistence
- End-session job enqueue
- Assessment retry behavior
- Memory and review deduplication
- Session deletion cascade

### 17.3 Browser tests

- Microphone permission granted and denied
- Start, speak, end turn, and receive examiner response
- Connection loss and retry state
- End-session confirmation
- Processing and completed report states
- Responsive desktop and mobile layouts
- No overlapping controls or transcript text

### 17.4 Evaluation set

Create recorded samples covering:

- Chinese-accented English
- Quiet and noisy environments
- Short and long pauses
- Self-corrections
- Hesitation and filler words
- Grammar errors with understandable meaning
- Strong vocabulary with weak coherence
- Unclear or incomplete answers

Do not judge provider quality using only developer voices or synthetic audio.

## 18. Implementation Work Packages

### Package A - Domain foundation

- Add conversation schemas and shared contracts
- Add Prisma models and migration
- Seed initial Part 1 scenarios
- Implement session state transitions
- Add session and scenario REST endpoints

Exit condition: a conversation session can be created, fetched, ended, and processed without a realtime provider.

### Package B - Realtime technical spike

- Implement OpenAI Realtime client-session creation
- Establish browser WebRTC connection
- Play examiner audio
- Capture learner audio
- Render finalized transcript events
- Measure first-audio and transcript latency

Exit condition: one browser can complete five alternating voice turns with an examiner prompt.

### Package C - Durable conversation

- Persist finalized learner and examiner turns
- Add provider event idempotency
- Add end-session behavior
- Preserve finalized turns after refresh
- Add failure and reconnect UI

Exit condition: conversation evidence survives provider and browser lifecycle changes.

### Package D - IELTS assessment

- Add conversation assessment prompt and schema
- Enqueue assessment after session end
- Persist dimension scores and evidence
- Keep pronunciation nullable
- Render the session report

Exit condition: a completed conversation produces a reproducible structured report.

### Package E - Memory and review

- Extract recurring mistakes and expressions
- Update topic statistics
- Create review tasks
- Select high-value learner memory for the next conversation

Exit condition: the next session visibly uses learning signals from the prior session.

### Package F - Hardening

- Add authentication and ownership guards
- Add rate limits and quotas
- Add privacy and deletion flows
- Add observability and cost dashboards
- Build accent and noisy-audio evaluation harness
- Run browser compatibility checks

Exit condition: the V2 MVP can be used by invited external testers with bounded cost and recoverable failures.

## 19. Milestone Acceptance Criteria

V2 MVP is complete only when:

- A user starts an IELTS Part 1 voice conversation from Today's plan.
- The browser connects without exposing a permanent provider key.
- The examiner and learner complete at least five alternating turns.
- Finalized transcripts are persisted in the correct sequence.
- The conversation stays within the configured scenario.
- Ending a session is idempotent.
- Post-session assessment uses the four IELTS dimensions.
- Pronunciation is nullable without validated audio evidence.
- Expressions and mistakes are saved without duplicates.
- The next session receives a bounded learner-memory summary.
- Network and provider failures produce recoverable UI states.
- Session cost and latency are recorded.
- Typecheck, build, integration tests, and browser tests pass.

## 20. Decision Log

| Decision | Choice | Reason |
|---|---|---|
| Product scope | IELTS-specific conversation coach | Preserves differentiation and existing domain assets |
| Initial language | English only | Keeps evaluation and content bounded |
| Initial IELTS part | Part 1 | Short turns and simpler conversation control |
| Browser transport | WebRTC | Appropriate for browser audio capture and playback |
| Live processing | Realtime provider session | Avoids queue latency in the conversation path |
| Post-session work | BullMQ | Supports retries and durable background processing |
| Data migration | New conversation models | Avoids breaking the V1 one-answer model |
| Pronunciation | Nullable until audio provider is validated | Prevents fabricated scores |
| Mobile strategy | Responsive web first | Validates product before native application investment |
| Pingo dependency | None | Pingo is a UX reference, not a documented platform API |

## 21. Recommended Execution Order

```text
1. Approve this V2 scope
2. Add conversation contracts and Prisma models
3. Build the Realtime WebRTC spike
4. Persist finalized turns
5. Add end-session assessment
6. Add learner memory and review
7. Add authentication, cost controls, and evaluations
8. Invite a small IELTS learner test group
9. Decide whether to add automatic VAD and Part 2
```

Do not redesign the entire application before Package B proves that the realtime examiner experience is natural, stable, and affordable.

## 22. References

- Pingo product reference: https://pingo.ai/
- OpenAI Realtime and audio overview: https://developers.openai.com/api/docs/guides/realtime
- SpeakingOS V1 design: `plans/speakingos-mvp-v1-design.md`
- SpeakingOS persisted vertical-slice plan: `plans/speakingos-next-step-development-plan.md`
