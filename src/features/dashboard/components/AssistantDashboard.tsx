import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/store/useAuthStore';
import { usePatientStore } from '@/store/usePatientStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { taskService } from '@/services/taskService';
import type { AssistantTask, TaskTemplate, TaskNote } from '@/services/taskService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  UserCheck, 
  CheckSquare, 
  Search,
  Clock,
  Play,
  CheckCircle2,
  AlertTriangle,
  Upload,
  FileText,
  FileSpreadsheet,
  ChevronRight,
  Trash2,
  MessageSquare
} from 'lucide-react';

export const AssistantDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { patientsList, loadAllPatients } = usePatientStore();
  const { addToast, addNotification } = useNotificationStore();

  // Tasks States
  const [tasks, setTasks] = useState<AssistantTask[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [patientFilter, setPatientFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');

  // Active Dialog/Modals States
  const [selectedTaskForUpload, setSelectedTaskForUpload] = useState<string | null>(null);
  const [uploadFileType, setUploadFileType] = useState<'IOPA' | 'OPG' | 'CBCT' | 'Clinical Photos' | 'PDF Document'>('IOPA');
  const [uploadTitle, setUploadTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Note State
  const [selectedTaskForNote, setSelectedTaskForNote] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState('');

  // Template Manager Modal State
  const [isTplOpen, setIsTplOpen] = useState(false);
  const [newTplTitle, setNewTplTitle] = useState('');
  const [newTplDesc, setNewTplDesc] = useState('');
  const [newTplCat, setNewTplCat] = useState('Chairside Support');
  const [newTplPriority, setNewTplPriority] = useState<'Low' | 'Medium' | 'High' | 'Emergency'>('Medium');
  const [newTplDuration, setNewTplDuration] = useState('15 mins');

  // Load Initial Data
  const loadTasksAndData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const list = await taskService.getTasks();
      setTasks(list);

      const tpls = await taskService.getTemplates();
      setTemplates(tpls);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadAllPatients();
    loadTasksAndData();

    // Set polling for real-time task state synchronization
    const timer = setInterval(() => {
      syncTasksSilently();
    }, 4000);
    return () => clearInterval(timer);
  }, [user]);

  const syncTasksSilently = async () => {
    try {
      const list = await taskService.getTasks();
      setTasks(list);
    } catch {}
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="py-20 text-center text-xs font-bold text-slate-450">
        Loading Workstation tasks...
      </div>
    );
  }

  // Status transitions
  const handleTransitionStatus = async (taskId: string, _currentStatus: AssistantTask['status'], action: 'accept' | 'start' | 'complete') => {
    let nextStatus: AssistantTask['status'] = 'Pending';
    let activityTitle = '';
    
    if (action === 'accept') {
      nextStatus = 'Accepted';
      activityTitle = 'Task Accepted';
    } else if (action === 'start') {
      nextStatus = 'In Progress';
      activityTitle = 'Task Started';
    } else if (action === 'complete') {
      nextStatus = 'Completed';
      activityTitle = 'Task Completed';
    }

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const res = await taskService.updateTaskStatus(taskId, nextStatus, { id: user.id, name: user.name });
    if (res.success) {
      addToast({
        type: 'success',
        title: `Task status updated to ${nextStatus}`,
        message: `Task: "${task.title}"`
      });

      // Notification to doctor
      addNotification({
        title: activityTitle,
        description: `Task "${task.title}" is now ${nextStatus} (Assistant: ${user.name}).`,
        type: nextStatus === 'Completed' ? 'success' : 'info'
      });

      loadTasksAndData();
    } else {
      addToast({ type: 'error', title: 'Error', message: res.error || 'Failed to update task status' });
    }
  };

  // Add notes
  const handleAddNote = async (taskId: string) => {
    if (!newNoteContent.trim()) return;

    const res = await taskService.addTaskNote({
      taskId,
      authorId: user.id,
      authorName: user.name,
      content: newNoteContent
    });

    if (res.success) {
      addToast({ type: 'success', title: 'Note Added', message: 'Note added to task history.' });
      setNewNoteContent('');
      setSelectedTaskForNote(null);
      loadTasksAndData();
    }
  };

  // Simulating uploads & Auto-propagation to radiography records
  const handleSimulateUpload = async (taskId: string) => {
    if (!uploadTitle.trim()) {
      addToast({ type: 'warning', title: 'Incomplete Info', message: 'Please provide a file name.' });
      return;
    }

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setIsUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((p: number | null) => {
        if (p === null || p >= 100) {
          clearInterval(interval);
          return null;
        }
        return p + 20;
      });
    }, 150);

    // Wait for simulation to finish
    await new Promise(resolve => setTimeout(resolve, 1000));

    const mockImages = [
      'https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?w=800',
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800',
      'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800'
    ];
    const isPdf = uploadFileType === 'PDF Document';
    const mockUrl = isPdf 
      ? 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
      : mockImages[Math.floor(Math.random() * mockImages.length)];

    const res = await taskService.addTaskAttachment({
      taskId,
      fileName: uploadTitle,
      fileUrl: mockUrl,
      fileType: isPdf ? 'pdf' : 'image',
      uploadedBy: user.name
    }, {
      patientId: task.patientId,
      visitId: task.visitId,
      doctorId: task.doctorId,
      doctorName: task.doctorName
    });

    setIsUploading(false);
    if (res.success) {
      addToast({
        type: 'success',
        title: 'Document Uploaded',
        message: 'Successfully saved and auto-propagated to patient digital charts.'
      });

      // Notification
      addNotification({
        title: `${uploadFileType} Uploaded`,
        description: `Assistant ${user.name} uploaded "${uploadTitle}" to task "${task.title}".`,
        type: 'success'
      });

      setSelectedTaskForUpload(null);
      setUploadTitle('');
      loadTasksAndData();
    } else {
      addToast({ type: 'error', title: 'Upload Failed', message: res.error || 'Storage error' });
    }
  };

  // Predefined templates CRUD
  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTplTitle.trim()) return;

    const res = await taskService.createTemplate({
      title: newTplTitle,
      description: newTplDesc,
      category: newTplCat,
      priority: newTplPriority,
      estimatedDuration: newTplDuration
    });

    if (res.success) {
      addToast({ type: 'success', title: 'Template Created', message: 'Clinical task template saved successfully.' });
      setNewTplTitle('');
      setNewTplDesc('');
      loadTasksAndData();
    } else {
      addToast({ type: 'error', title: 'Error', message: res.error || 'Failed to create template' });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    const res = await taskService.deleteTemplate(id);
    if (res.success) {
      addToast({ type: 'success', title: 'Template Removed', message: 'Removed clinical template.' });
      loadTasksAndData();
    }
  };

  // Apply filters
  const filteredTasks = tasks.filter(task => {
    const searchMatch = 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (task.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.patientName || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const statusMatch = statusFilter === 'ALL' || task.status === statusFilter;
    const priorityMatch = priorityFilter === 'ALL' || task.priority === priorityFilter;
    const patientMatch = patientFilter === 'ALL' || task.patientId === patientFilter;
    
    const dateMatch = !dateFilter || task.createdAt.startsWith(dateFilter);

    return searchMatch && statusMatch && priorityMatch && patientMatch && dateMatch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-red-800" />
            <span>Dental Assistant Workstation</span>
          </h2>
          <p className="text-xs text-slate-400 font-semibold mt-1">
            Welcome back, {user.name}. View assigned patients, manage task checklists, and catalog radiograph captures.
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={() => setIsTplOpen(!isTplOpen)}
            className="h-10 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs px-4"
          >
            Manage Templates
          </Button>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-white rounded-2xl p-4 flex items-center gap-4">
          <div className="p-3 bg-red-50 rounded-xl text-red-805 shrink-0">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div className="text-left">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Pending Tasks</span>
            <h4 className="text-xl font-black text-slate-800">{tasks.filter(t => t.status === 'Pending').length}</h4>
          </div>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-2xl p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-xl text-blue-805 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="text-left">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Active Operations</span>
            <h4 className="text-xl font-black text-slate-800">{tasks.filter(t => t.status === 'Accepted' || t.status === 'In Progress').length}</h4>
          </div>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-2xl p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-850 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="text-left">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Completed</span>
            <h4 className="text-xl font-black text-slate-800">{tasks.filter(t => t.status === 'Completed' || t.status === 'Verified').length}</h4>
          </div>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-2xl p-4 flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-805 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="text-left">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Emergencies</span>
            <h4 className="text-xl font-black text-slate-800">{tasks.filter(t => t.priority === 'Emergency' && t.status !== 'Verified').length}</h4>
          </div>
        </Card>
      </div>

      {/* Predefined Templates Management Drawer/Modal */}
      {isTplOpen && (
        <Card className="border-none shadow-sm bg-slate-50 rounded-2xl p-5 text-left border-2 border-red-100">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 border-b pb-2 flex justify-between items-center">
            <span>Clinical Templates Registry</span>
            <button onClick={() => setIsTplOpen(false)} className="text-xs text-slate-400 hover:text-slate-700">Close</button>
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create form */}
            <form onSubmit={handleAddTemplate} className="bg-white p-4.5 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-700">Add New Template</h4>
              
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500">Template Title *</Label>
                <Input value={newTplTitle} onChange={(e) => setNewTplTitle(e.target.value)} placeholder="e.g. Prepare Surgical Extraction Kit" className="h-8.5 text-xs" />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500">Description</Label>
                <textarea value={newTplDesc} onChange={(e) => setNewTplDesc(e.target.value)} placeholder="Include sterile instructions..." className="w-full text-xs p-2 border rounded-lg bg-white outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500">Category</Label>
                  <select value={newTplCat} onChange={(e) => setNewTplCat(e.target.value)} className="w-full text-xs p-2 border rounded-lg bg-white outline-none">
                    <option value="Imaging">Imaging</option>
                    <option value="Chairside Support">Chairside Support</option>
                    <option value="Sterilization">Sterilization</option>
                    <option value="Clinical Procedure">Clinical Procedure</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500">Priority</Label>
                  <select value={newTplPriority} onChange={(e) => setNewTplPriority(e.target.value as any)} className="w-full text-xs p-2 border rounded-lg bg-white outline-none">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500">Estimated Duration</Label>
                <Input value={newTplDuration} onChange={(e) => setNewTplDuration(e.target.value)} placeholder="e.g. 15 mins" className="h-8.5 text-xs" />
              </div>

              <Button type="submit" className="w-full h-8.5 bg-red-808 text-white font-bold text-xs rounded-lg">
                Create Template
              </Button>
            </form>

            {/* List templates */}
            <div className="lg:col-span-2 bg-white p-4.5 rounded-xl border border-slate-200 space-y-3 max-h-[350px] overflow-y-auto">
              <h4 className="text-xs font-bold text-slate-700">Existing Predefined Templates ({templates.length})</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {templates.map(t => (
                  <div key={t.id} className="p-3 bg-slate-50 rounded-lg border border-slate-150 flex items-start justify-between gap-2 text-xs">
                    <div>
                      <strong className="font-extrabold text-slate-800">{t.title}</strong>
                      <div className="text-[10px] text-slate-400 font-bold mt-1 flex gap-2">
                        <span>{t.category}</span>
                        <span>•</span>
                        <span>{t.estimatedDuration}</span>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteTemplate(t.id)} className="text-slate-400 hover:text-red-750">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Search and Filters Toolbar */}
      <Card className="border-none shadow-sm bg-white rounded-2xl p-4.5">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search by task title, patient name or instructions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Status Filter */}
            <div className="flex flex-col text-left shrink-0">
              <span className="text-[8px] font-black uppercase text-slate-400 mb-0.5">Status</span>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 text-xs border border-slate-200 rounded-lg px-2 bg-slate-50 focus:border-red-800 outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Accepted">Accepted</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Verified">Verified</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="flex flex-col text-left shrink-0">
              <span className="text-[8px] font-black uppercase text-slate-400 mb-0.5">Priority</span>
              <select 
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="h-8 text-xs border border-slate-200 rounded-lg px-2 bg-slate-50 focus:border-red-800 outline-none"
              >
                <option value="ALL">All Priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>

            {/* Patient Filter */}
            <div className="flex flex-col text-left shrink-0">
              <span className="text-[8px] font-black uppercase text-slate-400 mb-0.5">Patient</span>
              <select 
                value={patientFilter}
                onChange={(e) => setPatientFilter(e.target.value)}
                className="h-8 text-xs border border-slate-200 rounded-lg px-2 bg-slate-50 focus:border-red-800 outline-none max-w-[150px]"
              >
                <option value="ALL">All Patients</option>
                {patientsList.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div className="flex flex-col text-left shrink-0">
              <span className="text-[8px] font-black uppercase text-slate-400 mb-0.5">Date</span>
              <input 
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-8 text-xs border border-slate-200 rounded-lg px-2 bg-slate-50 focus:border-red-800 outline-none"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Main tasks board: LARGE cards layout */}
      <div className="space-y-4">
        {filteredTasks.length > 0 ? (
          filteredTasks.map(task => (
            <Card 
              key={task.id} 
              className={`border-none shadow-sm rounded-2xl p-6 text-left transition-all ${
                task.priority === 'Emergency' && task.status !== 'Verified'
                  ? 'bg-red-50/40 border-l-4 border-red-655'
                  : 'bg-white'
              }`}
            >
              <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                
                {/* Task description & patient data */}
                <div className="space-y-3 flex-1">
                  
                  {/* Top badges bar */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Badge */}
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      task.status === 'Verified' ? 'bg-emerald-100 text-emerald-800' :
                      task.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-105 animate-pulse' :
                      task.status === 'In Progress' ? 'bg-amber-105 text-amber-800' :
                      task.status === 'Accepted' ? 'bg-blue-105 text-blue-800' :
                      task.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {task.status}
                    </span>

                    {/* Priority Badge */}
                    <span className={`px-2.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider ${
                      task.priority === 'Emergency' ? 'bg-red-200 text-red-900 animate-bounce' :
                      task.priority === 'High' ? 'bg-amber-100 text-amber-800' :
                      task.priority === 'Medium' ? 'bg-blue-55 text-blue-805' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {task.priority} Priority
                    </span>

                    <span className="text-[10px] text-slate-400 font-extrabold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Est: {task.estimatedDuration}</span>
                    </span>
                  </div>

                  {/* Task details */}
                  <h3 className="text-base font-extrabold text-slate-805">{task.title}</h3>
                  {task.description && (
                    <p className="text-xs text-slate-500 font-semibold leading-relaxed max-w-3xl">{task.description}</p>
                  )}

                  {/* Patient & Clinic contexts */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold text-slate-400 pt-3 border-t border-slate-100 select-none">
                    <div>
                      <span>Patient Name:</span>
                      <p className="text-slate-700 font-black mt-0.5">{task.patientName || 'Unknown Patient'}</p>
                    </div>
                    <div>
                      <span>Assigned Doctor:</span>
                      <p className="text-slate-700 font-black mt-0.5">{task.doctorName}</p>
                    </div>
                    <div>
                      <span>Instructions / Note:</span>
                      <p className="text-slate-700 font-semibold mt-0.5">{task.notes || 'No special instructions'}</p>
                    </div>
                    <div>
                      <span>Due Time:</span>
                      <p className="text-slate-700 font-semibold mt-0.5">
                        {new Date(task.dueTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {/* Notes thread */}
                  {task.taskNotes && task.taskNotes.length > 0 && (
                    <div className="bg-slate-50 rounded-xl p-3 space-y-2 mt-4 max-w-3xl">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Discussion Logs ({task.taskNotes.length})</span>
                      {task.taskNotes.map((n: TaskNote) => (
                        <div key={n.id} className="text-[11px] text-slate-600 font-semibold leading-normal">
                          <strong className="text-red-808 font-bold">{n.authorName}</strong>: {n.content}
                          <span className="text-[9px] text-slate-400 ml-2 font-normal">
                            ({new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Attachments history */}
                  {task.attachments && task.attachments.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-2">
                      {task.attachments.map(att => (
                        <a
                          key={att.id}
                          href={att.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 p-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-black text-slate-700 transition"
                        >
                          {att.fileType === 'pdf' ? (
                            <FileText className="w-4 h-4 text-rose-700" />
                          ) : (
                            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                          )}
                          <span>{att.fileName}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </a>
                      ))}
                    </div>
                  )}

                </div>

                {/* Operations side panel: Large action buttons */}
                <div className="flex flex-col md:flex-row lg:flex-col justify-between items-stretch gap-2 shrink-0 w-full lg:w-56 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-4">
                  
                  {/* Status transitions */}
                  {task.status === 'Pending' && (
                    <Button 
                      onClick={() => handleTransitionStatus(task.id, 'Pending', 'accept')}
                      className="h-11 bg-blue-705 hover:bg-blue-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-4 h-4" />
                      <span>Accept Task</span>
                    </Button>
                  )}

                  {task.status === 'Accepted' && (
                    <Button 
                      onClick={() => handleTransitionStatus(task.id, 'Accepted', 'start')}
                      className="h-11 bg-amber-600 hover:bg-amber-750 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-4 h-4" />
                      <span>Start Task</span>
                    </Button>
                  )}

                  {task.status === 'In Progress' && (
                    <Button 
                      onClick={() => handleTransitionStatus(task.id, 'In Progress', 'complete')}
                      className="h-11 bg-emerald-600 hover:bg-emerald-750 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Complete Task</span>
                    </Button>
                  )}

                  {task.status === 'Verified' && (
                    <div className="py-2.5 px-4 bg-emerald-50 rounded-xl text-emerald-800 font-extrabold text-xs text-center border border-emerald-100 flex items-center justify-center gap-1.5 select-none">
                      <CheckCircle2 className="w-4.5 h-4.5" />
                      <span>Verified by Doctor</span>
                    </div>
                  )}

                  {task.status === 'Cancelled' && (
                    <div className="py-2.5 px-4 bg-red-50 rounded-xl text-red-800 font-extrabold text-xs text-center select-none">
                      Task Cancelled
                    </div>
                  )}

                  {/* Supplementary Actions: Attach file or note */}
                  {task.status !== 'Verified' && task.status !== 'Cancelled' && (
                    <div className="grid grid-cols-2 gap-1.5 pt-2">
                      <Button
                        onClick={() => setSelectedTaskForNote(task.id === selectedTaskForNote ? null : task.id)}
                        className="h-9.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold rounded-xl text-[10px]"
                      >
                        <MessageSquare className="w-3.5 h-3.5 mr-1" />
                        <span>Note</span>
                      </Button>
                      
                      <Button
                        onClick={() => setSelectedTaskForUpload(task.id === selectedTaskForUpload ? null : task.id)}
                        className="h-9.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold rounded-xl text-[10px]"
                      >
                        <Upload className="w-3.5 h-3.5 mr-1" />
                        <span>Upload</span>
                      </Button>
                    </div>
                  )}

                  {/* Add Note inline field */}
                  {selectedTaskForNote === task.id && (
                    <div className="pt-3 space-y-2 text-left">
                      <Label className="text-[9px] font-bold text-slate-500">Add Notes / Instructions</Label>
                      <Input
                        placeholder="Type note content..."
                        value={newNoteContent}
                        onChange={(e) => setNewNoteContent(e.target.value)}
                        className="h-8.5 text-xs rounded-xl"
                      />
                      <Button 
                        onClick={() => handleAddNote(task.id)}
                        className="w-full h-8 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold rounded-lg"
                      >
                        Submit Note
                      </Button>
                    </div>
                  )}

                  {/* File Upload inline simulation */}
                  {selectedTaskForUpload === task.id && (
                    <div className="pt-3 space-y-2 text-left">
                      <Label className="text-[9px] font-bold text-slate-500">File Category</Label>
                      <select 
                        value={uploadFileType}
                        onChange={(e) => setUploadFileType(e.target.value as any)}
                        className="w-full text-xs p-1.5 border rounded-lg bg-white outline-none"
                      >
                        <option value="IOPA">Take IOPA Radiograph</option>
                        <option value="OPG">OPG Scan</option>
                        <option value="CBCT">CBCT 3D Scan</option>
                        <option value="Clinical Photos">Clinical Intraoral Photo</option>
                        <option value="PDF Document">PDF Consent/Clearance Form</option>
                      </select>

                      <Label className="text-[9px] font-bold text-slate-500">Document/Scan Title *</Label>
                      <Input
                        placeholder="e.g. Tooth #14 Bitewing X-ray"
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                        className="h-8 text-xs rounded-xl"
                      />

                      <Button 
                        onClick={() => handleSimulateUpload(task.id)}
                        disabled={isUploading}
                        className="w-full h-8 bg-red-808 hover:bg-red-900 text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-1.5"
                      >
                        {isUploading ? 'Uploading...' : 'Simulate Scan Capture'}
                      </Button>

                      {isUploading && uploadProgress !== null && (
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-red-800 h-full transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
                        </div>
                      )}
                    </div>
                  )}

                </div>

              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 italic">
            No tasks matched your search queries.
          </div>
        )}
      </div>
    </div>
  );
};
