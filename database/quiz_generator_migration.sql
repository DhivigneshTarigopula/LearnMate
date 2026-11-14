-- ==============================================================================
-- LearnMate - PDF-to-Quiz Generator Database Migration
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- Creates tables for storing generated quizzes, questions, and attempt history.
-- ==============================================================================

-- 1. GENERATED QUIZZES TABLE
-- Stores quizzes generated from PDFs with full questions JSON
CREATE TABLE IF NOT EXISTS public.generated_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT DEFAULT 'General',
  difficulty TEXT DEFAULT 'Medium', -- Easy, Medium, Hard
  question_type TEXT DEFAULT 'MCQ', -- MCQ, True/False, Mixed
  num_questions INTEGER NOT NULL DEFAULT 5,
  source_pdf_name TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user quiz retrieval
CREATE INDEX IF NOT EXISTS idx_generated_quizzes_user ON public.generated_quizzes(user_id, created_at DESC);

-- 2. QUIZ ATTEMPTS & HISTORY TABLE
-- Records each student attempt, score, percentage, and submitted answers
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES public.generated_quizzes(id) ON DELETE CASCADE,
  quiz_title TEXT NOT NULL,
  subject TEXT DEFAULT 'General',
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  percentage INTEGER NOT NULL DEFAULT 0,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb, -- map of question id -> chosen option index
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for student quiz history
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON public.quiz_attempts(user_id, completed_at DESC);

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.generated_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES FOR GENERATED QUIZZES
DROP POLICY IF EXISTS "Users can view own generated quizzes" ON public.generated_quizzes;
CREATE POLICY "Users can view own generated quizzes"
  ON public.generated_quizzes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own generated quizzes" ON public.generated_quizzes;
CREATE POLICY "Users can insert own generated quizzes"
  ON public.generated_quizzes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own generated quizzes" ON public.generated_quizzes;
CREATE POLICY "Users can update own generated quizzes"
  ON public.generated_quizzes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own generated quizzes" ON public.generated_quizzes;
CREATE POLICY "Users can delete own generated quizzes"
  ON public.generated_quizzes FOR DELETE
  USING (auth.uid() = user_id);

-- 5. RLS POLICIES FOR QUIZ ATTEMPTS
DROP POLICY IF EXISTS "Users can view own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users can view own quiz attempts"
  ON public.quiz_attempts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users can insert own quiz attempts"
  ON public.quiz_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users can delete own quiz attempts"
  ON public.quiz_attempts FOR DELETE
  USING (auth.uid() = user_id);
