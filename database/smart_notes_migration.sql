-- ==============================================================================
-- LearnMate - Smart Notes Database & Supabase Storage Migration
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- It creates the note_folders and note_files tables, indexes, and storage security policies.
-- ==============================================================================

-- 1. FOLDERS & SUBFOLDERS TABLE
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

-- Index for speedy listing of user folders
CREATE INDEX IF NOT EXISTS idx_note_folders_user ON public.note_folders(user_id, parent_id);

-- 2. SMART NOTE FILES TABLE (Metadata for PDFs, Images, Screenshots, Handwritten Notes)
CREATE TABLE IF NOT EXISTS public.note_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.note_folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  file_type TEXT NOT NULL, -- e.g. application/pdf, image/png, image/jpeg
  file_ext TEXT NOT NULL,  -- e.g. pdf, png, jpg, jpeg
  subject TEXT DEFAULT '',
  module TEXT DEFAULT '',
  topic TEXT DEFAULT '',
  favorite BOOLEAN DEFAULT FALSE,
  storage_bucket TEXT DEFAULT 'smart_notes',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning-fast queries and filters
CREATE INDEX IF NOT EXISTS idx_note_files_user ON public.note_files(user_id, folder_id);
CREATE INDEX IF NOT EXISTS idx_note_files_subject ON public.note_files(user_id, subject);
CREATE INDEX IF NOT EXISTS idx_note_files_created ON public.note_files(user_id, created_at DESC);

-- 3. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.note_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_files ENABLE ROW LEVEL SECURITY;

-- 4. ROW LEVEL SECURITY POLICIES FOR FOLDERS
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

-- 5. ROW LEVEL SECURITY POLICIES FOR NOTE FILES
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

-- 6. CREATE SUPABASE STORAGE BUCKET FOR SMART NOTES
-- Stores uploaded PDFs and image files securely
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'smart_notes',
  'smart_notes',
  false,
  20971520, -- 20MB limit per file
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']::text[];

-- 7. SUPABASE STORAGE ROW LEVEL SECURITY POLICIES
-- Files are organized under user_id folder: {user_id}/{folder_id_or_root}/{filename}
-- Users can strictly view and manage only their own storage files

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
