
-- Migration: Add files metadata table for object storage
-- This replaces local file storage with metadata-only tracking

CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id INTEGER,  -- business user ID for multi-tenancy
  project_id INTEGER,  -- contract/project ID
  uploader_id INTEGER NOT NULL,  -- user who uploaded
  storage_provider TEXT NOT NULL CHECK (storage_provider IN ('s3', 'r2', 'gcs', 'local')),
  storage_key TEXT,  -- e.g. org/123/project/456/uuid-filename.jpg
  legacy_filename TEXT,  -- for backwards compatibility with existing uploads
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'failed', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_files_org_project ON files(org_id, project_id);
CREATE INDEX IF NOT EXISTS idx_files_uploader ON files(uploader_id);
CREATE INDEX IF NOT EXISTS idx_files_status ON files(status);
CREATE INDEX IF NOT EXISTS idx_files_legacy_filename ON files(legacy_filename) WHERE legacy_filename IS NOT NULL;
