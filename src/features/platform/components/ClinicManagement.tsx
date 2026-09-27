import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { CreateClinicModal } from './CreateClinicModal';
import { ViewClinicModal } from './ViewClinicModal';
import { Search, Filter, MoreVertical, CheckCircle, XCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export const ClinicManagement: React.FC = () => {
  const [clinics, setClinics] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingClinic, setViewingClinic] = useState<any | null>(null);

  // Filtering state
  const [activeTab, setActiveTab] = useState<'clinics' | 'pending'>('clinics');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const fetchClinicsAndStats = async () => {
    setLoading(true);

    // Fetch base clinics
    const { data: clinicsData } = await supabase.from('clinics').select('*').order('created_at', { ascending: false });
    if (clinicsData) setClinics(clinicsData);

    // Fetch users for owner and staff count
    const { data: usersData } = await supabase.from('users').select('id, clinic_id, role, name');
    if (usersData) setUsers(usersData);

    // Fetch patients for patient count
    const { data: patientsData } = await supabase.from('patients').select('id, clinic_id');
    if (patientsData) setPatients(patientsData);

    // Fetch appointments for appointment count
    const { data: apptsData } = await supabase.from('appointments').select('id, patient_id');
    if (apptsData) setAppointments(apptsData);

    // Fetch pending registrations
    const { data: regsData } = await supabase.from('clinic_registrations').select('*').eq('status', 'Pending').order('created_at', { ascending: false });
    if (regsData) setPendingRegistrations(regsData);

    setLoading(false);
  };

  useEffect(() => {
    fetchClinicsAndStats();
  }, []);

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    await supabase.from('clinics').update({ is_active: !currentStatus }).eq('id', id);
    fetchClinicsAndStats();
  };

  // Compute enriched clinics
  const enrichedClinics = clinics.map(clinic => {
    const clinicUsers = users.filter(u => u.clinic_id === clinic.id);
    const owner = clinicUsers.find(u => u.role === 'Dentist');
    const staffCount = clinicUsers.length;

    const clinicPatients = patients.filter(p => p.clinic_id === clinic.id);
    const patientCount = clinicPatients.length;

    const patientIds = new Set(clinicPatients.map(p => p.id));
    const appointmentCount = appointments.filter(a => patientIds.has(a.patient_id)).length;

    return {
      ...clinic,
      ownerName: owner ? owner.name : 'Unassigned',
      staffCount,
      patientCount,
      appointmentCount
    };
  });

  // Apply filters
  const filteredClinics = enrichedClinics.filter(clinic => {
    const matchesSearch = clinic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clinic.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' ? true :
      statusFilter === 'active' ? clinic.is_active : !clinic.is_active;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Clinic Management</h1>
          <p className="text-gray-500 mt-1">Manage tenant clinics, owners, and system access.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg shadow-sm font-medium hover:bg-indigo-700 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          + Add New Clinic
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit mb-4">
        <button
          onClick={() => setActiveTab('clinics')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'clinics' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Active Clinics
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'pending' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Pending Registrations
          {pendingRegistrations.length > 0 && (
            <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs font-bold">
              {pendingRegistrations.length}
            </span>
          )}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Filters Bar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between bg-gray-50">
          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by clinic name or email..."
              className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border bg-white cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'clinics' ? (
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Clinic Details</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Owner / Contact</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stats</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                <th scope="col" className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredClinics.length > 0 ? filteredClinics.map(clinic => (
                <tr key={clinic.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                        {clinic.name.charAt(0)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{clinic.name}</div>
                        <div className="text-sm text-gray-500 font-mono text-xs mt-0.5" title={clinic.id}>
                          {clinic.id.substring(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-medium">{clinic.ownerName}</div>
                    <div className="text-sm text-gray-500">{clinic.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700 flex flex-col gap-1">
                      <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-medium inline-block w-max">
                        {clinic.staffCount} Staff
                      </span>
                      <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-medium inline-block w-max">
                        {clinic.patientCount} Patients
                      </span>
                      <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-medium inline-block w-max">
                        {clinic.appointmentCount} Appts
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {clinic.is_active ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <XCircle className="w-3 h-3 mr-1" /> Suspended
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(clinic.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-3">
                      <button
                        onClick={() => setViewingClinic(clinic)}
                        className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1.5 rounded-md hover:bg-indigo-100 transition-colors"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => toggleStatus(clinic.id, clinic.is_active)}
                        className={`px-3 py-1.5 rounded-md transition-colors ${clinic.is_active ? 'text-orange-600 hover:text-orange-900 bg-orange-50 hover:bg-orange-100' : 'text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100'}`}
                      >
                        {clinic.is_active ? 'Suspend' : 'Activate'}
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to permanently delete the clinic "${clinic.name}"? This action cannot be undone.`)) {
                            await supabase.rpc('delete_clinic_admin', { p_clinic_id: clinic.id });
                            fetchClinicsAndStats();
                          }
                        }}
                        className="px-3 py-1.5 rounded-md transition-colors text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No clinics found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Clinic & Owner</th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact Info</th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Address & License</th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Requested At</th>
                  <th scope="col" className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {pendingRegistrations.length > 0 ? pendingRegistrations.map(reg => (
                  <tr key={reg.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="ml-4">
                          <div className="text-sm font-bold text-gray-900">{reg.clinic_name}</div>
                          <div className="text-sm text-gray-500 mt-0.5">Owner: {reg.owner_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium">Clinic: {reg.email}</div>
                      <div className="text-sm text-gray-500">{reg.phone || 'N/A'}</div>
                      <div className="mt-2 text-sm text-gray-900 font-medium">Owner: {reg.owner_email || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{reg.owner_phone || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">
                        <div>{reg.city ? `${reg.city}, ${reg.state} ${reg.zip_code}` : reg.address}</div>
                        <div className="mt-1 font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded inline-block">
                          License: {reg.license_number || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(reg.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={async () => {
                          if (!window.confirm(`Are you sure you want to approve and create a clinic for "${reg.clinic_name}"?`)) return;
                          
                          try {
                            const clinicId = uuidv4();
                            const fullAddress = reg.city ? `${reg.address || ''}, ${reg.city}, ${reg.state} ${reg.zip_code}`.replace(/^, /, '') : reg.address;
                            
                            // 1. Create Clinic
                            const { error: clinicError } = await supabase.from('clinics').insert([{
                              id: clinicId,
                              name: reg.clinic_name,
                              address: fullAddress,
                              phone: reg.phone,
                              email: reg.email,
                              is_active: true
                            }]);
                            
                            if (clinicError) throw new Error(`Clinic creation failed: ${clinicError.message}`);

                            // 2. Create Owner Auth User via RPC
                            const userId = uuidv4();
                            const adminEmail = reg.owner_email || reg.email;
                            const adminPhone = reg.owner_phone || reg.phone || '';
                            const defaultPassword = adminPhone; // Default generated password is just phone number
                            const { error: profileError } = await supabase.rpc('create_user_admin', {
                              p_id: userId,
                              p_email: adminEmail,
                              p_password: defaultPassword,
                              p_name: reg.owner_name,
                              p_role: 'Dentist',
                              p_phone: adminPhone,
                              p_clinic_id: clinicId
                            });

                            if (profileError) {
                              // Rollback clinic creation
                              await supabase.from('clinics').delete().eq('id', clinicId);
                              throw new Error(`Admin user creation failed: ${profileError.message}`);
                            }

                            // 3. Mark Registration as Approved
                            const { error: updErr } = await supabase.from('clinic_registrations').update({ status: 'Approved' }).eq('id', reg.id);
                            if (updErr) throw new Error(`Status update failed: ${updErr.message}`);
                            
                            alert(`Registration approved! Clinic and admin account created.\n\nCredentials to share with owner:\nEmail: ${adminEmail}\nDefault Password: ${defaultPassword}`);
                            fetchClinicsAndStats();
                          } catch (err: any) {
                            alert('Error: ' + err.message);
                          }
                        }}
                        className="text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-md transition-colors shadow-sm"
                      >
                        Approve & Create Clinic
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No pending registrations.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateClinicModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchClinicsAndStats();
          }}
        />
      )}

      {viewingClinic && (
        <ViewClinicModal
          clinic={viewingClinic}
          onClose={() => setViewingClinic(null)}
        />
      )}
    </div>
  );
};
