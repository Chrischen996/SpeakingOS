CREATE TYPE "IeltsPart" AS ENUM ('part1', 'part2', 'part3');
CREATE TYPE "Difficulty" AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE "PracticeSessionStatus" AS ENUM ('created', 'recording', 'audio_uploaded', 'transcribing', 'transcribed', 'transcript_confirmed', 'assessing', 'assessed', 'memory_saved', 'review_scheduled', 'completed', 'failed');
CREATE TYPE "QuestionSource" AS ENUM ('curated', 'generated');
CREATE TYPE "OnboardingStatus" AS ENUM ('pending', 'done');
CREATE TYPE "ReviewTargetType" AS ENUM ('expression', 'mistake', 'question');
CREATE TYPE "ReviewStatus" AS ENUM ('pending', 'completed', 'cancelled');
CREATE TYPE "ReviewResult" AS ENUM ('remembered', 'fuzzy', 'forgot');
CREATE TYPE "MemoryMastery" AS ENUM ('new', 'learning', 'mastered');
CREATE TYPE "MistakeType" AS ENUM ('grammar', 'vocabulary', 'coherence', 'fluency');
CREATE TYPE "Severity" AS ENUM ('low', 'medium', 'high');
CREATE TYPE "LlmPurpose" AS ENUM ('assessment', 'memory', 'planner', 'review');

CREATE TABLE "users" (
    "id" TEXT NOT NULL, "email" TEXT NOT NULL, "password_hash" TEXT NOT NULL,
    "target_band" DECIMAL(3,1), "current_band_estimate" DECIMAL(3,1), "exam_date" DATE,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Shanghai', "native_language" TEXT,
    "onboarding_status" "OnboardingStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "questions" (
    "id" TEXT NOT NULL, "part" "IeltsPart" NOT NULL DEFAULT 'part1', "topic" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL, "content" TEXT NOT NULL, "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" "QuestionSource" NOT NULL DEFAULT 'curated', "active" BOOLEAN NOT NULL DEFAULT true,
    "content_hash" TEXT NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "practice_sessions" (
    "id" TEXT NOT NULL, "user_id" TEXT NOT NULL, "question_id" TEXT NOT NULL, "practice_date" DATE NOT NULL,
    "status" "PracticeSessionStatus" NOT NULL DEFAULT 'created', "failed_stage" TEXT, "error_code" TEXT,
    "error_message" TEXT, "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "practice_sessions_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL, "session_id" TEXT NOT NULL, "storage_key" TEXT NOT NULL, "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL, "duration_ms" INTEGER NOT NULL, "checksum" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "answers" (
    "id" TEXT NOT NULL, "session_id" TEXT NOT NULL, "user_id" TEXT NOT NULL, "question_id" TEXT NOT NULL,
    "raw_transcript" TEXT NOT NULL, "confirmed_transcript" TEXT, "transcript_confirmed_at" TIMESTAMP(3),
    "stt_provider" TEXT, "stt_confidence" DOUBLE PRECISION, "duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL, "answer_id" TEXT NOT NULL, "grammar_score" DECIMAL(3,1) NOT NULL,
    "vocabulary_score" DECIMAL(3,1) NOT NULL, "fluency_score" DECIMAL(3,1) NOT NULL,
    "coherence_score" DECIMAL(3,1) NOT NULL, "naturalness_score" DECIMAL(3,1) NOT NULL,
    "band_score" DECIMAL(3,1) NOT NULL, "grammar_comments" JSONB NOT NULL,
    "vocabulary_suggestions" JSONB NOT NULL, "native_version" TEXT NOT NULL, "band7_version" TEXT NOT NULL,
    "rationale" JSONB NOT NULL, "model" TEXT NOT NULL, "prompt_version" TEXT NOT NULL,
    "raw_response" JSONB NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "expressions" (
    "id" TEXT NOT NULL, "user_id" TEXT NOT NULL, "answer_id" TEXT, "text" TEXT NOT NULL,
    "meaning" TEXT NOT NULL, "example" TEXT NOT NULL, "topic" TEXT,
    "mastery" "MemoryMastery" NOT NULL DEFAULT 'new', "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "expressions_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "mistakes" (
    "id" TEXT NOT NULL, "user_id" TEXT NOT NULL, "answer_id" TEXT, "type" "MistakeType" NOT NULL,
    "span_text" TEXT NOT NULL, "correction" TEXT NOT NULL, "explanation" TEXT NOT NULL,
    "severity" "Severity" NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mistakes_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "review_tasks" (
    "id" TEXT NOT NULL, "user_id" TEXT NOT NULL, "target_type" "ReviewTargetType" NOT NULL,
    "target_id" TEXT NOT NULL, "prompt" TEXT NOT NULL, "due_at" TIMESTAMP(3) NOT NULL,
    "interval_days" INTEGER NOT NULL DEFAULT 1, "ease_factor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "repetition" INTEGER NOT NULL DEFAULT 0, "status" "ReviewStatus" NOT NULL DEFAULT 'pending',
    "last_result" "ReviewResult", "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "review_tasks_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "topic_stats" (
    "id" TEXT NOT NULL, "user_id" TEXT NOT NULL, "topic" TEXT NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0, "avg_band" DECIMAL(3,1), "last_practiced_at" TIMESTAMP(3),
    "weak_score" DOUBLE PRECISION NOT NULL DEFAULT 0, CONSTRAINT "topic_stats_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "llm_usage_logs" (
    "id" TEXT NOT NULL, "user_id" TEXT NOT NULL, "session_id" TEXT, "purpose" "LlmPurpose" NOT NULL,
    "provider" TEXT NOT NULL, "model" TEXT NOT NULL, "prompt_version" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0, "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "latency_ms" INTEGER NOT NULL DEFAULT 0, "cost_usd" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "llm_usage_logs_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL, "user_id" TEXT NOT NULL, "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL, "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "questions_content_hash_key" ON "questions"("content_hash");
CREATE INDEX "questions_part_topic_active_idx" ON "questions"("part", "topic", "active");
CREATE INDEX "practice_sessions_user_id_practice_date_idx" ON "practice_sessions"("user_id", "practice_date");
CREATE INDEX "practice_sessions_status_idx" ON "practice_sessions"("status");
CREATE UNIQUE INDEX "practice_sessions_user_id_practice_date_key" ON "practice_sessions"("user_id", "practice_date");
CREATE UNIQUE INDEX "media_assets_session_id_key" ON "media_assets"("session_id");
CREATE UNIQUE INDEX "answers_session_id_key" ON "answers"("session_id");
CREATE INDEX "answers_user_id_created_at_idx" ON "answers"("user_id", "created_at");
CREATE UNIQUE INDEX "feedback_answer_id_key" ON "feedback"("answer_id");
CREATE INDEX "expressions_user_id_mastery_idx" ON "expressions"("user_id", "mastery");
CREATE INDEX "mistakes_user_id_type_severity_idx" ON "mistakes"("user_id", "type", "severity");
CREATE INDEX "review_tasks_user_id_status_due_at_idx" ON "review_tasks"("user_id", "status", "due_at");
CREATE UNIQUE INDEX "topic_stats_user_id_topic_key" ON "topic_stats"("user_id", "topic");
CREATE INDEX "llm_usage_logs_user_id_purpose_created_at_idx" ON "llm_usage_logs"("user_id", "purpose", "created_at");
CREATE INDEX "refresh_tokens_user_id_expires_at_idx" ON "refresh_tokens"("user_id", "expires_at");

ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "practice_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "answers" ADD CONSTRAINT "answers_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "practice_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "answers" ADD CONSTRAINT "answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_answer_id_fkey" FOREIGN KEY ("answer_id") REFERENCES "answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expressions" ADD CONSTRAINT "expressions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expressions" ADD CONSTRAINT "expressions_answer_id_fkey" FOREIGN KEY ("answer_id") REFERENCES "answers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "mistakes" ADD CONSTRAINT "mistakes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mistakes" ADD CONSTRAINT "mistakes_answer_id_fkey" FOREIGN KEY ("answer_id") REFERENCES "answers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "review_tasks" ADD CONSTRAINT "review_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "topic_stats" ADD CONSTRAINT "topic_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "llm_usage_logs" ADD CONSTRAINT "llm_usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "llm_usage_logs" ADD CONSTRAINT "llm_usage_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "practice_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
