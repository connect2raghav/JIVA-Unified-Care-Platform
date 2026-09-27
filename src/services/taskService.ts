import { supabase } from '../lib/supabaseClient';
import { adminService } from './adminService';
import { patientService } from './patientService';

export interface AssistantTask {
  id: string;
  title: string;
  description: string;
  assignedAssistantId?: string;
  assignedAssistantName?: string;
  patientId: string;
  patientName?: string;
  visitId: string;
  dentistId: string;
  dentistName: string;
  priority: 'Low' | 'Medium' | 'High' | 'Emergency';
  dueTime: string;
  status: 'Pending' | 'Accepted' | 'In Progress' | 'Completed' | 'Verified' | 'Cancelled';
  estimatedDuration: string;
  notes?: string;
  createdBy: string;
  createdByName: string;
  acceptedTime?: string;
  completedTime?: string;
  verifiedTime?: string;
  createdAt: string;
  updatedAt: string;
  attachments?: TaskAttachment[];
  taskNotes?: TaskNote[];
}

export interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Emergency';
  estimatedDuration: string;
}

export interface TaskNote {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  fileName: string;
  fileUrl: string;
  fileType: 'image' | 'document' | 'pdf';
  uploadedBy: string;
  createdAt: string;
}

// Initial Seed Templates for Sandboxed Mock Mode
const DEFAULT_TEMPLATES: TaskTemplate[] = [
  { id: 'temp-1', title: 'Take IOPA X-ray', description: 'Take an intraoral periapical radiograph for specified tooth.', category: 'Imaging', priority: 'High', estimatedDuration: '10 mins' },
  { id: 'temp-2', title: 'Capture Intraoral Photos', description: 'Take high-resolution photos of inner oral cavity.', category: 'Imaging', priority: 'Medium', estimatedDuration: '10 mins' },
  { id: 'temp-3', title: 'Capture Extraoral Photos', description: 'Take facial view photographs.', category: 'Imaging', priority: 'Low', estimatedDuration: '10 mins' },
  { id: 'temp-4', title: 'Upload OPG', description: 'Obtain and upload panoramic scan.', category: 'Imaging', priority: 'High', estimatedDuration: '15 mins' },
  { id: 'temp-5', title: 'Upload CBCT', description: 'Simulate uploading a Cone Beam Computed Tomography 3D scan.', category: 'Imaging', priority: 'Medium', estimatedDuration: '20 mins' },
  { id: 'temp-6', title: 'Prepare Extraction Kit', description: 'Set up elevator, forceps, syndesmotome and sterile gauze.', category: 'Chairside Support', priority: 'High', estimatedDuration: '15 mins' },
  { id: 'temp-7', title: 'Prepare Root Canal Instruments', description: 'Arrange rotary files, sodium hypochlorite, and sealer.', category: 'Chairside Support', priority: 'High', estimatedDuration: '15 mins' },
  { id: 'temp-8', title: 'Sterilize Instruments', description: 'Run cycles through autoclave sterilization.', category: 'Sterilization', priority: 'Medium', estimatedDuration: '30 mins' },
  { id: 'temp-9', title: 'Prepare Composite Kit', description: 'Organize etch, bonding, composite shades and light cure.', category: 'Chairside Support', priority: 'High', estimatedDuration: '10 mins' },
  { id: 'temp-10', title: 'Prepare Crown Impression', description: 'Heavy and light body impression guns.', category: 'Chairside Support', priority: 'Medium', estimatedDuration: '15 mins' },
  { id: 'temp-11', title: 'Take Alginate Impression', description: 'Mix alginate compound for dental study model.', category: 'Clinical Procedure', priority: 'Medium', estimatedDuration: '15 mins' },
  { id: 'temp-12', title: 'Prepare Implant Kit', description: 'Set up handpiece, saline, drapes and drills.', category: 'Chairside Support', priority: 'Emergency', estimatedDuration: '20 mins' },
  { id: 'temp-13', title: 'Record Vital Signs', description: 'BP, Pulse and Temperature records.', category: 'Clinical Procedure', priority: 'High', estimatedDuration: '5 mins' },
  { id: 'temp-14', title: 'Upload Clinical Documents', description: 'Upload consent forms or clearances.', category: 'Documents', priority: 'Medium', estimatedDuration: '10 mins' },
  { id: 'temp-15', title: 'Assist During Procedure', description: 'Suction and mix support.', category: 'Chairside Support', priority: 'High', estimatedDuration: '45 mins' }
];

export const taskService = {
  // -------------------------------------------------------------
  // TASK TEMPLATES CRUD
  // -------------------------------------------------------------
  getTemplates: async (): Promise<TaskTemplate[]> => {
    try {
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .order('title', { ascending: true });
      if (error) throw error;
      return (data || []).map(d => ({
        id: d.id,
        title: d.title,
        description: d.description || '',
        category: d.category || 'General',
        priority: d.priority || 'Medium',
        estimatedDuration: d.estimated_duration || '15 mins'
      }));
    } catch (err) {
      console.error('Failed to get templates:', err);
      return DEFAULT_TEMPLATES;
    }
  },

  createTemplate: async (tpl: Omit<TaskTemplate, 'id'>): Promise<{ success: boolean; data?: TaskTemplate; error?: string }> => {
    const list = await taskService.getTemplates();
    const newTpl: TaskTemplate = {
      ...tpl,
      id: `temp-${Math.random().toString(36).substring(2, 9)}`
    };

    try {
      const { data, error } = await supabase
        .from('task_templates')
        .insert([{
          title: tpl.title,
          description: tpl.description,
          category: tpl.category,
          priority: tpl.priority,
          estimated_duration: tpl.estimatedDuration
        }])
        .select()
        .single();
      if (error) throw error;
      return {
        success: true,
        data: {
          id: data.id,
          title: data.title,
          description: data.description,
          category: data.category,
          priority: data.priority,
          estimatedDuration: data.estimated_duration
        }
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  deleteTemplate: async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('task_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // -------------------------------------------------------------
  // ASSISTANT TASKS CRUD
  // -------------------------------------------------------------
  getTasks: async (filters?: {
    patientId?: string;
    visitId?: string;
    assistantId?: string;
    dentistId?: string;
    status?: string;
  }): Promise<AssistantTask[]> => {
    let tasks: AssistantTask[] = [];
    
    // Load local mock tasks
    let mockTasks: AssistantTask[] = [];
    try {
      mockTasks = JSON.parse(localStorage.getItem('dcip_mock_tasks') || '[]');
    } catch {}

    try {
      const { data, error } = await supabase
        .from('assistant_tasks')
        .select('*');

      if (!error && data) {
        tasks = data.map((t: any) => ({
          id: t.id,
          title: t.title,
          description: t.description || '',
          assignedAssistantId: t.assigned_assistant_id,
          assignedAssistantName: t.assigned_assistant_name,
          patientId: t.patient_id,
          visitId: t.visit_id,
          dentistId: t.dentist_id,
          dentistName: t.dentist_name || 'Dentist',
          priority: t.priority || 'Medium',
          dueTime: t.due_time,
          status: t.status || 'Pending',
          estimatedDuration: t.estimated_duration || '15 mins',
          notes: t.notes || '',
          createdBy: t.created_by,
          createdByName: t.created_by_name || 'System',
          acceptedTime: t.accepted_time,
          completedTime: t.completed_time,
          verifiedTime: t.verified_time,
          createdAt: t.created_at,
          updatedAt: t.updated_at
        }));
      }
    } catch (err) {
      console.error('Failed to get tasks from supabase:', err);
    }
    
    tasks = [...tasks, ...mockTasks];

    // Resolve patient names inside list (useful for Assistant Dashboard where patient Name is vital)
    const patients = await patientService.getPatients();
    tasks = tasks.map(t => {
      const pat = patients.find(p => p.id === t.patientId);
      return { ...t, patientName: pat ? pat.name : 'Unknown Patient' };
    });

    // Apply filters
    if (filters) {
      if (filters.patientId) tasks = tasks.filter(t => t.patientId === filters.patientId);
      if (filters.visitId) tasks = tasks.filter(t => t.visitId === filters.visitId);
      if (filters.assistantId) tasks = tasks.filter(t => t.assignedAssistantId === filters.assistantId);
      if (filters.dentistId) tasks = tasks.filter(t => t.dentistId === filters.dentistId);
      if (filters.status && filters.status !== 'ALL') tasks = tasks.filter(t => t.status === filters.status);
    }

    return tasks;
  },

  createTask: async (task: Omit<AssistantTask, 'id' | 'createdAt' | 'updatedAt' | 'attachments' | 'taskNotes'>): Promise<{ success: boolean; data?: AssistantTask; error?: string }> => {
    const list = await taskService.getTasks();
    const newTask: AssistantTask = {
      ...task,
      id: `task-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: [],
      taskNotes: []
    };

    // If using mock patient, skip Supabase to prevent 409 FK conflict errors in console
    const isMockPatient = (() => {
      try {
        const localPatients = JSON.parse(localStorage.getItem('dcip_patients') || '[]');
        return localPatients.some((p: any) => p.id === newTask.patientId);
      } catch {
        return false;
      }
    })();

    if (
      isMockPatient || 
      newTask.patientId?.startsWith('demo-') || 
      newTask.visitId?.startsWith('visit-') ||
      newTask.dentistId?.startsWith('demo-')
    ) {
      try {
        const mockTasks = JSON.parse(localStorage.getItem('dcip_mock_tasks') || '[]');
        mockTasks.push(newTask);
        localStorage.setItem('dcip_mock_tasks', JSON.stringify(mockTasks));
      } catch {}
      return { success: true, data: newTask };
    }

    try {
      const { data, error } = await supabase
        .from('assistant_tasks')
        .insert([{
          title: newTask.title,
          description: newTask.description,
          assigned_assistant_id: newTask.assignedAssistantId || null,
          assigned_assistant_name: newTask.assignedAssistantName || null,
          patient_id: newTask.patientId,
          visit_id: newTask.visitId,
          dentist_id: newTask.dentistId,
          dentist_name: newTask.dentistName,
          priority: newTask.priority,
          due_time: newTask.dueTime,
          status: newTask.status,
          estimated_duration: newTask.estimatedDuration,
          notes: newTask.notes,
          created_by: newTask.createdBy,
          created_by_name: newTask.createdByName
        }])
        .select()
        .single();
      if (error) throw error;
      
      const mapped: AssistantTask = {
        ...newTask,
        id: data.id,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      await adminService.logActivity('Task Assigned', `Assigned task "${mapped.title}" to assistant.`);
      return { success: true, data: mapped };
    } catch (err: any) {
      console.warn('Supabase task insert failed, using mock fallback:', err.message);
      // Fallback to local storage for demo
      try {
        const mockTasks = JSON.parse(localStorage.getItem('dcip_mock_tasks') || '[]');
        mockTasks.push(newTask);
        localStorage.setItem('dcip_mock_tasks', JSON.stringify(mockTasks));
      } catch {}
      return { success: true, data: newTask };
    }
  },

  updateTaskStatus: async (
    id: string, 
    status: AssistantTask['status'], 
    _userProfile: { id: string; name: string }
  ): Promise<{ success: boolean; error?: string }> => {
    const list = await taskService.getTasks();
    const taskItem = list.find(t => t.id === id);
    if (!taskItem) return { success: false, error: 'Task not found.' };

    const timeField: Record<string, string> = {};
    if (status === 'Accepted') timeField.acceptedTime = new Date().toISOString();
    if (status === 'Completed') timeField.completedTime = new Date().toISOString();
    if (status === 'Verified') timeField.verifiedTime = new Date().toISOString();

    try {
      const updatePayload: any = {
        status,
        updated_at: new Date().toISOString()
      };
      if (status === 'Accepted') updatePayload.accepted_time = timeField.acceptedTime;
      if (status === 'Completed') updatePayload.completed_time = timeField.completedTime;
      if (status === 'Verified') updatePayload.verified_time = timeField.verifiedTime;

      const { error } = await supabase
        .from('assistant_tasks')
        .update(updatePayload)
        .eq('id', id);
      if (error) throw error;

      await adminService.logActivity('Task Status Updated', `Task "${taskItem.title}" updated to ${status}.`);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  deleteTask: async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('assistant_tasks')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // -------------------------------------------------------------
  // TASK NOTES & COMMENTS CRUD
  // -------------------------------------------------------------
  addTaskNote: async (note: Omit<TaskNote, 'id' | 'createdAt'>): Promise<{ success: boolean; data?: TaskNote; error?: string }> => {
    const newNote: TaskNote = {
      ...note,
      id: `note-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('task_notes')
        .insert([{
          task_id: note.taskId,
          author_id: note.authorId,
          author_name: note.authorName,
          content: note.content
        }])
        .select()
        .single();
      if (error) throw error;
      return {
        success: true,
        data: {
          id: data.id,
          taskId: data.task_id,
          authorId: data.author_id,
          authorName: data.author_name,
          content: data.content,
          createdAt: data.created_at
        }
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // -------------------------------------------------------------
  // TASK ATTACHMENTS CRUD & PATIENT IMAGING INTERFACING
  // -------------------------------------------------------------
  addTaskAttachment: async (
    attach: Omit<TaskAttachment, 'id' | 'createdAt'>,
    patientMeta: { patientId: string; visitId: string; dentistId: string; dentistName: string }
  ): Promise<{ success: boolean; data?: TaskAttachment; error?: string }> => {
    const newAttach: TaskAttachment = {
      ...attach,
      id: `att-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date().toISOString()
    };

    // Propagate to Patient Profile / Dental Imaging if it's an image or document
    try {
      let isradiography = ['IOPA', 'OPG', 'CBCT', 'CT Scan', 'X-Ray', 'Panoramic'].includes(attach.fileName) || attach.fileType === 'image';
      let docCategory = attach.fileType === 'pdf' ? 'Clinical Documents' : 'Intraoral Photos';
      let titleString = attach.fileName;

      await patientService.createImageRecord({
        patientId: patientMeta.patientId,
        title: titleString,
        category: isradiography ? (attach.fileName as any) : (docCategory as any),
        imageUrl: attach.fileUrl,
        notes: `Uploaded by Assistant via task attachment.`,
        visitId: patientMeta.visitId,
        dentistId: patientMeta.dentistId,
        dentistName: patientMeta.dentistName
      });
    } catch (err) {
      console.warn('Failed to auto-propagate task attachment to imaging files:', err);
    }

    try {
      const { data, error } = await supabase
        .from('task_attachments')
        .insert([{
          task_id: attach.taskId,
          file_name: attach.fileName,
          file_url: attach.fileUrl,
          file_type: attach.fileType,
          uploaded_by: attach.uploadedBy
        }])
        .select()
        .single();
      if (error) throw error;
      return {
        success: true,
        data: {
          id: data.id,
          taskId: data.task_id,
          fileName: data.file_name,
          fileUrl: data.file_url,
          fileType: data.file_type,
          uploadedBy: data.uploaded_by,
          createdAt: data.created_at
        }
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
};
