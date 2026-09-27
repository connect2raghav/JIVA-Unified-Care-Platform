import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { Users, Activity, Calendar } from 'lucide-react';

interface ViewClinicModalProps {
  clinic: any;
  onClose: () => void;
}

export const ViewClinicModal: React.FC<ViewClinicModalProps> = ({ clinic, onClose }) => {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStaff = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role, is_active')
        .eq('clinic_id', clinic.id)
        .order('role');
        
      if (data) setStaff(data);
      setLoading(false);
    };

    fetchStaff();
  }, [clinic.id]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 rounded-t-xl flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-gray-900">{clinic.name}</h2>
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${clinic.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {clinic.is_active ? 'Active' : 'Suspended'}
              </span>
            </div>
            <p className="text-sm text-gray-500 font-medium">{clinic.email} • {clinic.phone}</p>
            <p className="text-sm text-gray-400 mt-1">{clinic.address}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-white p-2 rounded-full shadow-sm border border-gray-100 transition-colors">
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 bg-white">
          {/* Aggregate Stats Section */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 flex items-center gap-4">
              <div className="bg-blue-100 p-2.5 rounded-md text-blue-600">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Staff</p>
                <p className="text-2xl font-bold text-gray-900">{clinic.staffCount ?? staff.length}</p>
              </div>
            </div>
            
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-4 flex items-center gap-4">
              <div className="bg-emerald-100 p-2.5 rounded-md text-emerald-600">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Patients</p>
                <p className="text-2xl font-bold text-gray-900">{clinic.patientCount ?? 0}</p>
              </div>
            </div>

            <div className="bg-orange-50/50 border border-orange-100 rounded-lg p-4 flex items-center gap-4">
              <div className="bg-orange-100 p-2.5 rounded-md text-orange-600">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Appointments</p>
                <p className="text-2xl font-bold text-gray-900">{clinic.appointmentCount ?? 0}</p>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-bold text-gray-900 mb-4">Clinic Staff Directory</h3>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : staff.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-gray-500">
              No staff members found for this clinic.
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {staff.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                          {user.name.charAt(0)}
                        </div>
                        {user.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${!clinic.is_active ? 'bg-red-50 text-red-700 border border-red-100' : user.is_active ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-gray-100 text-gray-800'}`}>
                          {!clinic.is_active ? 'Suspended (Clinic)' : user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="p-5 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end">
          <button onClick={onClose} className="px-5 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
