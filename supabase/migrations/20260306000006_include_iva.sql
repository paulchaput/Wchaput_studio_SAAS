-- Add include_iva flag to projects (default true — existing projects keep IVA)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS include_iva BOOLEAN NOT NULL DEFAULT TRUE;
