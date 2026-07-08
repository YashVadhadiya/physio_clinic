-- Migration: Add Status column to patients table for soft delete support
ALTER TABLE patients ADD COLUMN IF NOT EXISTS "Status" TEXT DEFAULT 'active' CHECK ("Status" IN ('active', 'deleted'));
