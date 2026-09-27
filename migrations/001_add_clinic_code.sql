-- Migration: Add clinic_code column to clinics table
-- A unique code (e.g. DCI-4821) used by staff to join their clinic on login.

ALTER TABLE clinics ADD COLUMN IF NOT EXISTS clinic_code VARCHAR(20) UNIQUE;

-- Auto-generate clinic codes for existing clinics that don't have one
UPDATE clinics
SET clinic_code = UPPER(LEFT(REPLACE(name, ' ', ''), 3)) || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')
WHERE clinic_code IS NULL;
