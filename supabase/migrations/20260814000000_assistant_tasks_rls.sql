-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) FOR ASSISTANT TASKS
-- -----------------------------------------------------------------------------

-- ENABLE RLS on tables
ALTER TABLE assistant_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

-- 1. TASK TEMPLATES
CREATE POLICY "Super Admins can manage task templates" ON task_templates
FOR ALL USING (get_current_user_role() = 'Super Admin');

CREATE POLICY "Anyone can read task templates" ON task_templates
FOR SELECT USING (true);


-- 2. ASSISTANT TASKS
CREATE POLICY "Super Admins can manage assistant tasks" ON assistant_tasks
FOR ALL USING (get_current_user_role() = 'Super Admin');

CREATE POLICY "Users can manage assistant tasks in their own clinic" ON assistant_tasks
FOR ALL USING (
  patient_id IN (SELECT id FROM patients WHERE clinic_id = get_current_user_clinic_id())
);


-- 3. TASK NOTES
CREATE POLICY "Super Admins can manage task notes" ON task_notes
FOR ALL USING (get_current_user_role() = 'Super Admin');

CREATE POLICY "Users can manage task notes in their own clinic" ON task_notes
FOR ALL USING (
  task_id IN (
    SELECT id FROM assistant_tasks WHERE patient_id IN (
      SELECT id FROM patients WHERE clinic_id = get_current_user_clinic_id()
    )
  )
);


-- 4. TASK ATTACHMENTS
CREATE POLICY "Super Admins can manage task attachments" ON task_attachments
FOR ALL USING (get_current_user_role() = 'Super Admin');

CREATE POLICY "Users can manage task attachments in their own clinic" ON task_attachments
FOR ALL USING (
  task_id IN (
    SELECT id FROM assistant_tasks WHERE patient_id IN (
      SELECT id FROM patients WHERE clinic_id = get_current_user_clinic_id()
    )
  )
);
