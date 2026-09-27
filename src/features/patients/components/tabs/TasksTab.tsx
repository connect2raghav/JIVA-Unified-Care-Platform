import React, { useState, useEffect } from 'react';
import { usePatientStore } from '../../../../store/usePatientStore';
import { taskService } from '@/services/taskService';
import type { AssistantTask } from '@/services/taskService';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  FileText,
  FileSpreadsheet
} from 'lucide-react';

export const TasksTab: React.FC = () => {
  const { selectedPatient } = usePatientStore();
  const [tasks, setTasks] = useState<AssistantTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  useEffect(() => {
    const fetchPatientTasks = async () => {
      if (!selectedPatient) return;
      setIsLoading(true);
      try {
        const list = await taskService.getTasks({ patientId: selectedPatient.id });
        setTasks(list);
      } catch (e) {
        console.error(e);
      }
      setIsLoading(false);
    };
    fetchPatientTasks();
  }, [selectedPatient]);

  if (!selectedPatient) return null;

  const filteredTasks = tasks.filter(task => {
    const searchMatch = 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.assignedAssistantName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.dentistName || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const statusMatch = statusFilter === 'ALL' || task.status === statusFilter;
    const priorityMatch = priorityFilter === 'ALL' || task.priority === priorityFilter;

    return searchMatch && statusMatch && priorityMatch;
  });

  return (
    <div className="space-y-6 text-xs text-left">
      {/* Title */}
      <div>
        <h3 className="text-sm font-extrabold text-slate-805">Assistant Tasks History</h3>
        <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
          History of all clinical preparation, imaging scans, and operations tasks assigned to dental assistants for {selectedPatient.name}.
        </p>
      </div>

      {/* Toolbar filters */}
      <Card className="border-none shadow-sm bg-white rounded-2xl p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search by task title, assistant or dentist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl text-xs"
            />
          </div>

          <div className="flex gap-3 shrink-0 w-full md:w-auto">
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
          </div>
        </div>
      </Card>

      {/* Tasks Table/List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-10 text-slate-400">Loading tasks...</div>
        ) : filteredTasks.length > 0 ? (
          filteredTasks.map(task => (
            <Card key={task.id} className="border-none shadow-sm bg-white rounded-2xl p-5 flex flex-col md:flex-row justify-between items-stretch gap-4">
              <div className="space-y-2.5 flex-1">
                {/* Headers */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                    task.status === 'Verified' ? 'bg-emerald-100 text-emerald-800' :
                    task.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                    task.status === 'In Progress' ? 'bg-amber-100 text-amber-800' :
                    task.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {task.status}
                  </span>

                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                    task.priority === 'Emergency' ? 'bg-red-200 text-red-900' :
                    task.priority === 'High' ? 'bg-amber-100 text-amber-805' :
                    task.priority === 'Medium' ? 'bg-blue-105 text-blue-800' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {task.priority} Priority
                  </span>
                </div>

                {/* Details */}
                <h4 className="text-xs font-black text-slate-800">{task.title}</h4>
                {task.description && <p className="text-xs text-slate-500 font-semibold leading-relaxed">{task.description}</p>}

                {/* Grid details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px] text-slate-400 font-bold pt-2 border-t border-slate-50">
                  <div>
                    <span>Assigned Assistant:</span>
                    <p className="text-slate-600 font-black mt-0.5">{task.assignedAssistantName || 'Unassigned'}</p>
                  </div>
                  <div>
                    <span>Assigned Dentist:</span>
                    <p className="text-slate-600 font-black mt-0.5">{task.dentistName}</p>
                  </div>
                  <div>
                    <span>Visit ID Session:</span>
                    <p className="text-slate-600 font-semibold mt-0.5">{task.visitId}</p>
                  </div>
                  <div>
                    <span>Completion Time:</span>
                    <p className="text-slate-600 font-semibold mt-0.5">
                      {task.completedTime 
                        ? new Date(task.completedTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                        : 'Not Completed'}
                    </p>
                  </div>
                </div>

                {/* Special Instructions & Notes */}
                {task.notes && (
                  <div className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 font-semibold">
                    <strong className="text-slate-700">Special Notes:</strong> {task.notes}
                  </div>
                )}

                {/* Attachments */}
                {task.attachments && task.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1.5">
                    {task.attachments.map(att => (
                      <a
                        key={att.id}
                        href={att.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 p-1.5 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-black text-slate-700 hover:bg-slate-200 transition"
                      >
                        {att.fileType === 'pdf' ? (
                          <FileText className="w-3.5 h-3.5 text-rose-700" />
                        ) : (
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                        )}
                        <span>{att.fileName}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 italic">
            No assistant tasks recorded for this patient.
          </div>
        )}
      </div>
    </div>
  );
};
