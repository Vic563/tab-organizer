-- Tab Organizer Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  settings JSONB DEFAULT '{
    "inactive_threshold_hours": 8,
    "auto_archive_days": 30,
    "notification_enabled": true,
    "theme": "system",
    "sync_enabled": true
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FOLDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_folders_user_id ON folders(user_id);

-- ============================================================================
-- TABS TABLE (Saved tabs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tabs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  favicon_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tabs_user_id ON tabs(user_id);
CREATE INDEX idx_tabs_folder_id ON tabs(folder_id);
CREATE INDEX idx_tabs_created_at ON tabs(created_at DESC);

-- Full-text search on tabs
ALTER TABLE tabs ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(url, ''))) STORED;

CREATE INDEX idx_tabs_search ON tabs USING GIN(search_vector);

-- ============================================================================
-- SYNC QUEUE TABLE (for offline operations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sync_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

CREATE INDEX idx_sync_queue_user_id ON sync_queue(user_id);
CREATE INDEX idx_sync_queue_synced ON sync_queue(synced_at) WHERE synced_at IS NULL;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Folders policies
CREATE POLICY "Users can view own folders"
  ON folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own folders"
  ON folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders"
  ON folders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders"
  ON folders FOR DELETE
  USING (auth.uid() = user_id);

-- Tabs policies
CREATE POLICY "Users can view own tabs"
  ON tabs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tabs"
  ON tabs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tabs"
  ON tabs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tabs"
  ON tabs FOR DELETE
  USING (auth.uid() = user_id);

-- Sync queue policies
CREATE POLICY "Users can view own sync queue"
  ON sync_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert to own sync queue"
  ON sync_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sync queue"
  ON sync_queue FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from own sync queue"
  ON sync_queue FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_folders_updated_at
  BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tabs_updated_at
  BEFORE UPDATE ON tabs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- SEARCH FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION search_tabs(
  search_query TEXT,
  user_uuid UUID
)
RETURNS TABLE (
  id UUID,
  url TEXT,
  title TEXT,
  favicon_url TEXT,
  folder_id UUID,
  created_at TIMESTAMPTZ,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.url,
    t.title,
    t.favicon_url,
    t.folder_id,
    t.created_at,
    ts_rank(t.search_vector, websearch_to_tsquery('english', search_query)) AS rank
  FROM tabs t
  WHERE t.user_id = user_uuid
    AND t.search_vector @@ websearch_to_tsquery('english', search_query)
  ORDER BY rank DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
