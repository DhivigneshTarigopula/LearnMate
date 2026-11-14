-- ==============================================================================
-- LearnMate - Supabase PostgreSQL Database Schema & Row Level Security (RLS)
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. PROFILES TABLE
-- Extends the Supabase auth.users table with student specific profile details
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  institution TEXT DEFAULT '',
  program TEXT DEFAULT '',
  term TEXT DEFAULT '',
  avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
  study_streak INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 2. TIMETABLE TABLE
-- Stores student weekly class schedules, lecture times, venues, and instructors
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.timetable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  code TEXT NOT NULL,
  day TEXT NOT NULL CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  start_time TEXT,
  end_time TEXT,
  time TEXT NOT NULL,
  room TEXT,
  instructor TEXT,
  type TEXT DEFAULT 'Lecture',
  color TEXT DEFAULT 'blue',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. ASSIGNMENTS TABLE
-- Tracks homework, coursework projects, due dates, and completion status
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  course_code TEXT,
  due_date DATE NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'completed')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4. NOTES TABLE
-- Student revision notes, summaries, and markdown content
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  subject TEXT NOT NULL,
  favorite BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. EXAMS TABLE
-- Upcoming tests, midterms, finals, topics checklist, and room locations
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  code TEXT,
  exam_date TIMESTAMPTZ NOT NULL,
  syllabus TEXT,
  status TEXT DEFAULT 'upcoming',
  topics JSONB DEFAULT '[]'::jsonb,
  room TEXT,
  weight TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 6. STUDY SESSIONS TABLE
-- Logs completed Pomodoro focus blocks and study durations
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  duration INTEGER NOT NULL, -- Duration in minutes
  completion_status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 7. QUIZZES TABLE
-- Records practice quiz attempts, scores, and completion timestamps
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  completion_timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 8. AI CONVERSATIONS TABLE
-- Tracks student AI doubt solver chat threads
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Doubt',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for speedy listing of user conversations
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON public.ai_conversations(user_id, updated_at DESC);

-- ==============================================================================
-- 9. AI MESSAGES TABLE
-- Stores message turns for each AI conversation
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for ordering messages inside a thread
CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON public.ai_messages(conversation_id, created_at ASC);

-- ==============================================================================
-- 10. AUTOMATIC PROFILE CREATION TRIGGER
-- Whenever a user signs up via Supabase Auth, automatically insert their profile
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, institution, program, study_streak)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Student User'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'institution', ''),
    COALESCE(NEW.raw_user_meta_data->>'program', ''),
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if already exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 9. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- Guarantees total data isolation: students can only access their own records
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- TIMETABLE POLICIES
DROP POLICY IF EXISTS "Users can view their own timetable entries" ON public.timetable;
CREATE POLICY "Users can view their own timetable entries"
  ON public.timetable FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own timetable entries" ON public.timetable;
CREATE POLICY "Users can create their own timetable entries"
  ON public.timetable FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own timetable entries" ON public.timetable;
CREATE POLICY "Users can update their own timetable entries"
  ON public.timetable FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own timetable entries" ON public.timetable;
CREATE POLICY "Users can delete their own timetable entries"
  ON public.timetable FOR DELETE
  USING (auth.uid() = user_id);

-- ASSIGNMENTS POLICIES
DROP POLICY IF EXISTS "Users can view their own assignments" ON public.assignments;
CREATE POLICY "Users can view their own assignments"
  ON public.assignments FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own assignments" ON public.assignments;
CREATE POLICY "Users can create their own assignments"
  ON public.assignments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own assignments" ON public.assignments;
CREATE POLICY "Users can update their own assignments"
  ON public.assignments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own assignments" ON public.assignments;
CREATE POLICY "Users can delete their own assignments"
  ON public.assignments FOR DELETE
  USING (auth.uid() = user_id);

-- NOTES POLICIES
DROP POLICY IF EXISTS "Users can view their own notes" ON public.notes;
CREATE POLICY "Users can view their own notes"
  ON public.notes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own notes" ON public.notes;
CREATE POLICY "Users can create their own notes"
  ON public.notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notes" ON public.notes;
CREATE POLICY "Users can update their own notes"
  ON public.notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notes" ON public.notes;
CREATE POLICY "Users can delete their own notes"
  ON public.notes FOR DELETE
  USING (auth.uid() = user_id);

-- EXAMS POLICIES
DROP POLICY IF EXISTS "Users can view their own exams" ON public.exams;
CREATE POLICY "Users can view their own exams"
  ON public.exams FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own exams" ON public.exams;
CREATE POLICY "Users can create their own exams"
  ON public.exams FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own exams" ON public.exams;
CREATE POLICY "Users can update their own exams"
  ON public.exams FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own exams" ON public.exams;
CREATE POLICY "Users can delete their own exams"
  ON public.exams FOR DELETE
  USING (auth.uid() = user_id);

-- STUDY SESSIONS POLICIES
DROP POLICY IF EXISTS "Users can view their own study sessions" ON public.study_sessions;
CREATE POLICY "Users can view their own study sessions"
  ON public.study_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own study sessions" ON public.study_sessions;
CREATE POLICY "Users can insert their own study sessions"
  ON public.study_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own study sessions" ON public.study_sessions;
CREATE POLICY "Users can delete their own study sessions"
  ON public.study_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- QUIZZES POLICIES
DROP POLICY IF EXISTS "Users can view their own quizzes" ON public.quizzes;
CREATE POLICY "Users can view their own quizzes"
  ON public.quizzes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own quizzes" ON public.quizzes;
CREATE POLICY "Users can insert their own quizzes"
  ON public.quizzes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own quizzes" ON public.quizzes;
CREATE POLICY "Users can delete their own quizzes"
  ON public.quizzes FOR DELETE
  USING (auth.uid() = user_id);

-- ==============================================================================
-- AI CONVERSATIONS POLICIES
-- ==============================================================================
DROP POLICY IF EXISTS "Users can view their own AI conversations" ON public.ai_conversations;
CREATE POLICY "Users can view their own AI conversations"
  ON public.ai_conversations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own AI conversations" ON public.ai_conversations;
CREATE POLICY "Users can insert their own AI conversations"
  ON public.ai_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own AI conversations" ON public.ai_conversations;
CREATE POLICY "Users can update their own AI conversations"
  ON public.ai_conversations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own AI conversations" ON public.ai_conversations;
CREATE POLICY "Users can delete their own AI conversations"
  ON public.ai_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- ==============================================================================
-- AI MESSAGES POLICIES
-- ==============================================================================
DROP POLICY IF EXISTS "Users can view their own AI messages" ON public.ai_messages;
CREATE POLICY "Users can view their own AI messages"
  ON public.ai_messages FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own AI messages" ON public.ai_messages;
CREATE POLICY "Users can insert their own AI messages"
  ON public.ai_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own AI messages" ON public.ai_messages;
CREATE POLICY "Users can delete their own AI messages"
  ON public.ai_messages FOR DELETE
  USING (auth.uid() = user_id);

-- ==============================================================================
-- 11. SMART NOTE FOLDERS TABLE
-- Organizes notes by subject, module, and custom nested folders/subfolders
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.note_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.note_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT DEFAULT '',
  module TEXT DEFAULT '',
  topic TEXT DEFAULT '',
  color TEXT DEFAULT '#52796F',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_note_folders_user ON public.note_folders(user_id, parent_id);

-- ==============================================================================
-- 12. SMART NOTE FILES TABLE
-- Tracks uploaded PDFs, images, handwritten notes, and metadata
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.note_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.note_folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  file_type TEXT NOT NULL,
  file_ext TEXT NOT NULL,
  subject TEXT DEFAULT '',
  module TEXT DEFAULT '',
  topic TEXT DEFAULT '',
  favorite BOOLEAN DEFAULT FALSE,
  storage_bucket TEXT DEFAULT 'smart_notes',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_note_files_user ON public.note_files(user_id, folder_id);
CREATE INDEX IF NOT EXISTS idx_note_files_subject ON public.note_files(user_id, subject);
CREATE INDEX IF NOT EXISTS idx_note_files_created ON public.note_files(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.note_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_files ENABLE ROW LEVEL SECURITY;

-- Note Folders RLS
DROP POLICY IF EXISTS "Users can view own note folders" ON public.note_folders;
CREATE POLICY "Users can view own note folders"
  ON public.note_folders FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own note folders" ON public.note_folders;
CREATE POLICY "Users can insert own note folders"
  ON public.note_folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own note folders" ON public.note_folders;
CREATE POLICY "Users can update own note folders"
  ON public.note_folders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own note folders" ON public.note_folders;
CREATE POLICY "Users can delete own note folders"
  ON public.note_folders FOR DELETE
  USING (auth.uid() = user_id);

-- Note Files RLS
DROP POLICY IF EXISTS "Users can view own note files" ON public.note_files;
CREATE POLICY "Users can view own note files"
  ON public.note_files FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own note files" ON public.note_files;
CREATE POLICY "Users can insert own note files"
  ON public.note_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own note files" ON public.note_files;
CREATE POLICY "Users can update own note files"
  ON public.note_files FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own note files" ON public.note_files;
CREATE POLICY "Users can delete own note files"
  ON public.note_files FOR DELETE
  USING (auth.uid() = user_id);

-- Storage Bucket & Storage RLS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'smart_notes',
  'smart_notes',
  false,
  20971520,
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']::text[];

DROP POLICY IF EXISTS "Users can view own note files in storage" ON storage.objects;
CREATE POLICY "Users can view own note files in storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'smart_notes' AND (auth.uid()::text = (storage.foldername(name))[1]));

DROP POLICY IF EXISTS "Users can upload own note files to storage" ON storage.objects;
CREATE POLICY "Users can upload own note files to storage"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'smart_notes' AND (auth.uid()::text = (storage.foldername(name))[1]));

DROP POLICY IF EXISTS "Users can update own note files in storage" ON storage.objects;
CREATE POLICY "Users can update own note files in storage"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'smart_notes' AND (auth.uid()::text = (storage.foldername(name))[1]))
  WITH CHECK (bucket_id = 'smart_notes' AND (auth.uid()::text = (storage.foldername(name))[1]));

DROP POLICY IF EXISTS "Users can delete own note files from storage" ON storage.objects;
CREATE POLICY "Users can delete own note files from storage"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'smart_notes' AND (auth.uid()::text = (storage.foldername(name))[1]));

-- ==============================================================================
-- 13. GENERATED QUIZZES (PDF-to-Quiz Generator)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.generated_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT DEFAULT 'General',
  difficulty TEXT DEFAULT 'Medium',
  question_type TEXT DEFAULT 'MCQ',
  num_questions INTEGER NOT NULL DEFAULT 5,
  source_pdf_name TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_quizzes_user ON public.generated_quizzes(user_id, created_at DESC);

-- ==============================================================================
-- 14. QUIZ ATTEMPTS & SCORE HISTORY
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES public.generated_quizzes(id) ON DELETE CASCADE,
  quiz_title TEXT NOT NULL,
  subject TEXT DEFAULT 'General',
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  percentage INTEGER NOT NULL DEFAULT 0,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON public.quiz_attempts(user_id, completed_at DESC);

ALTER TABLE public.generated_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own generated quizzes" ON public.generated_quizzes;
CREATE POLICY "Users can view own generated quizzes" ON public.generated_quizzes FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own generated quizzes" ON public.generated_quizzes;
CREATE POLICY "Users can insert own generated quizzes" ON public.generated_quizzes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own generated quizzes" ON public.generated_quizzes;
CREATE POLICY "Users can update own generated quizzes" ON public.generated_quizzes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own generated quizzes" ON public.generated_quizzes;
CREATE POLICY "Users can delete own generated quizzes" ON public.generated_quizzes FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users can view own quiz attempts" ON public.quiz_attempts FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users can insert own quiz attempts" ON public.quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users can delete own quiz attempts" ON public.quiz_attempts FOR DELETE USING (auth.uid() = user_id);

