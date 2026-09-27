-- Optional visit workflow columns (safe if already present)
ALTER TABLE visits ADD COLUMN IF NOT EXISTS dentist_name VARCHAR(255);
ALTER TABLE visits ADD COLUMN IF NOT EXISTS visit_type VARCHAR(100);
ALTER TABLE visits ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Started';
