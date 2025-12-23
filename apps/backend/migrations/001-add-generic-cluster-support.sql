-- Migration: Add Generic Cluster Support
-- Description: Adds support for generic Kubernetes clusters alongside Rancher clusters
-- Date: 2025-01-XX
-- Backward Compatible: Yes (auto-sets clusterType='rancher' for existing rows)

-- ============================================================================
-- PART 1: Create generic_cluster_sites table
-- ============================================================================

CREATE TABLE IF NOT EXISTS generic_cluster_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- For PostgreSQL
    -- id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),  -- For SQLite (uncomment for SQLite)
    name VARCHAR(255) NOT NULL,
    kubeconfig TEXT NOT NULL,
    cluster_name VARCHAR(255),
    server_url VARCHAR(500),
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- PART 2: Modify app_instances table
-- ============================================================================

-- Add new columns to app_instances
ALTER TABLE app_instances
ADD COLUMN IF NOT EXISTS cluster_type VARCHAR(50) DEFAULT 'rancher' NOT NULL;

ALTER TABLE app_instances
ADD COLUMN IF NOT EXISTS generic_cluster_site_id UUID;
-- For SQLite: ALTER TABLE app_instances ADD COLUMN generic_cluster_site_id TEXT;

-- Make rancher_site_id nullable (for existing rows, this is safe as they already have values)
ALTER TABLE app_instances
ALTER COLUMN rancher_site_id DROP NOT NULL;

-- ============================================================================
-- PART 3: Set default cluster_type for existing rows
-- ============================================================================

-- Set cluster_type to 'rancher' for all existing app instances
UPDATE app_instances
SET cluster_type = 'rancher'
WHERE cluster_type IS NULL;

-- ============================================================================
-- PART 4: Add constraints
-- ============================================================================

-- Add foreign key constraint for generic_cluster_site_id
ALTER TABLE app_instances
ADD CONSTRAINT fk_app_instances_generic_cluster_site
FOREIGN KEY (generic_cluster_site_id)
REFERENCES generic_cluster_sites(id)
ON DELETE RESTRICT;

-- Add CHECK constraint: exactly one site FK must be non-null based on cluster type
ALTER TABLE app_instances
ADD CONSTRAINT chk_app_instances_cluster_site
CHECK (
    (cluster_type = 'rancher' AND rancher_site_id IS NOT NULL AND generic_cluster_site_id IS NULL) OR
    (cluster_type = 'generic' AND generic_cluster_site_id IS NOT NULL AND rancher_site_id IS NULL)
);

-- ============================================================================
-- PART 5: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_app_instances_cluster_type
ON app_instances(cluster_type);

CREATE INDEX IF NOT EXISTS idx_app_instances_generic_cluster_site_id
ON app_instances(generic_cluster_site_id);

CREATE INDEX IF NOT EXISTS idx_generic_cluster_sites_active
ON generic_cluster_sites(active);

-- ============================================================================
-- Rollback Script (save separately for production use)
-- ============================================================================

/*
-- ROLLBACK: To revert this migration, run these commands in reverse order

-- Remove constraints
ALTER TABLE app_instances DROP CONSTRAINT IF EXISTS chk_app_instances_cluster_site;
ALTER TABLE app_instances DROP CONSTRAINT IF EXISTS fk_app_instances_generic_cluster_site;

-- Remove indexes
DROP INDEX IF EXISTS idx_generic_cluster_sites_active;
DROP INDEX IF EXISTS idx_app_instances_generic_cluster_site_id;
DROP INDEX IF EXISTS idx_app_instances_cluster_type;

-- Remove columns
ALTER TABLE app_instances DROP COLUMN IF EXISTS generic_cluster_site_id;
ALTER TABLE app_instances DROP COLUMN IF EXISTS cluster_type;

-- Make rancher_site_id NOT NULL again
ALTER TABLE app_instances ALTER COLUMN rancher_site_id SET NOT NULL;

-- Drop table
DROP TABLE IF EXISTS generic_cluster_sites;
*/
