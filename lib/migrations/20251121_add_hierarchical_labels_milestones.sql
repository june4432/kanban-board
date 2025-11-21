-- ==========================================
-- Migration: Add Hierarchical Labels and Milestones
-- Description: Add scope-based management for labels and milestones
--              (organization, project, board levels)
-- Date: 2025-11-21
-- ==========================================

-- ==========================================
-- Step 1: Add new columns to labels table
-- ==========================================

-- Add scope and scope_id columns
ALTER TABLE labels 
  ADD COLUMN scope VARCHAR(20),
  ADD COLUMN scope_id VARCHAR(255),
  ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Migrate existing data: set all existing labels to board scope
UPDATE labels 
SET 
  scope = 'board',
  scope_id = board_id,
  created_at = CURRENT_TIMESTAMP,
  updated_at = CURRENT_TIMESTAMP
WHERE scope IS NULL;

-- Make scope and scope_id NOT NULL after migration
ALTER TABLE labels 
  ALTER COLUMN scope SET NOT NULL,
  ALTER COLUMN scope_id SET NOT NULL;

-- Add CHECK constraint for scope
ALTER TABLE labels 
  ADD CONSTRAINT labels_scope_check 
  CHECK (scope IN ('organization', 'project', 'board'));

-- Add index for scope-based queries
CREATE INDEX IF NOT EXISTS idx_labels_scope ON labels(scope, scope_id);

-- Add updated_at trigger
CREATE TRIGGER update_labels_updated_at BEFORE UPDATE ON labels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- Step 2: Add new columns to milestones table
-- ==========================================

-- Add scope and scope_id columns
ALTER TABLE milestones 
  ADD COLUMN scope VARCHAR(20),
  ADD COLUMN scope_id VARCHAR(255),
  ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Migrate existing data: set all existing milestones to board scope
UPDATE milestones 
SET 
  scope = 'board',
  scope_id = board_id,
  created_at = CURRENT_TIMESTAMP,
  updated_at = CURRENT_TIMESTAMP
WHERE scope IS NULL;

-- Make scope and scope_id NOT NULL after migration
ALTER TABLE milestones 
  ALTER COLUMN scope SET NOT NULL,
  ALTER COLUMN scope_id SET NOT NULL;

-- Add CHECK constraint for scope
ALTER TABLE milestones 
  ADD CONSTRAINT milestones_scope_check 
  CHECK (scope IN ('organization', 'project', 'board'));

-- Add index for scope-based queries
CREATE INDEX IF NOT EXISTS idx_milestones_scope ON milestones(scope, scope_id);

-- Add updated_at trigger
CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- Step 3: Keep board_id for backward compatibility (optional)
-- ==========================================
-- Note: We're keeping board_id column for now to ensure backward compatibility
-- It can be removed in a future migration after all code is updated

-- Add comment to board_id columns to indicate deprecation
COMMENT ON COLUMN labels.board_id IS 'DEPRECATED: Use scope and scope_id instead. Will be removed in future version.';
COMMENT ON COLUMN milestones.board_id IS 'DEPRECATED: Use scope and scope_id instead. Will be removed in future version.';

-- ==========================================
-- Verification Queries
-- ==========================================

-- Verify labels migration
-- SELECT scope, COUNT(*) as count FROM labels GROUP BY scope;

-- Verify milestones migration
-- SELECT scope, COUNT(*) as count FROM milestones GROUP BY scope;

-- Check for any NULL values (should be 0)
-- SELECT COUNT(*) FROM labels WHERE scope IS NULL OR scope_id IS NULL;
-- SELECT COUNT(*) FROM milestones WHERE scope IS NULL OR scope_id IS NULL;
