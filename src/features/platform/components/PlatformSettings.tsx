import React, { useState, useEffect } from 'react';
import { Save, Shield, Mail, Globe, AlertTriangle } from 'lucide-react';

export const PlatformSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    platformName: 'Dental CRM Platform',
    supportEmail: 'support@crmdental.com',
    allowRegistrations: false,
    maintenanceMode: false,
    maxClinics: '100'
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load from local storage on mount (simulating DB fetch for now)
  useEffect(() => {
    const saved = localStorage.getItem('platform_settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        // use defaults
      }
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = () => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      localStorage.setItem('platform_settings', JSON.stringify(settings));
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 800);
  };

  return (
    <div className="max-w-4xl space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Platform Settings</h1>
        <p className="text-gray-500 mt-1">Configure global settings and policies for the entire multi-clinic platform.</p>
      </div>

      {saveSuccess && (
        <div className="bg-green-50 text-green-800 p-4 rounded-lg flex items-center border border-green-200">
          <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
          </svg>
          Platform settings saved successfully.
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <Globe className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">General Information</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Platform Name</label>
              <input 
                type="text" 
                name="platformName"
                value={settings.platformName}
                onChange={handleChange}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5 border"
              />
              <p className="mt-1 text-xs text-gray-500">This name appears in emails and global headers.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Global Support Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input 
                  type="email" 
                  name="supportEmail"
                  value={settings.supportEmail}
                  onChange={handleChange}
                  className="pl-10 w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5 border"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">Security & Onboarding</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between py-2 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Allow Public Clinic Registrations</h3>
              <p className="text-sm text-gray-500 mt-1">If enabled, new clinics can sign up from the public homepage.</p>
            </div>
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input type="checkbox" name="allowRegistrations" checked={settings.allowRegistrations} onChange={handleChange} className="sr-only" />
                <div className={`block w-14 h-8 rounded-full transition-colors ${settings.allowRegistrations ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${settings.allowRegistrations ? 'transform translate-x-6' : ''}`}></div>
              </div>
            </label>
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Allowed Clinics (License Limit)</label>
              <input 
                type="number" 
                name="maxClinics"
                value={settings.maxClinics}
                onChange={handleChange}
                className="w-full md:w-1/3 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5 border"
              />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
        <div className="p-6 border-b border-red-100 bg-red-50 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
        </div>
        <div className="p-6 space-y-4">
           <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Maintenance Mode</h3>
              <p className="text-sm text-gray-500 mt-1">Suspend access for all clinic users. Only Super Admins can log in.</p>
            </div>
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input type="checkbox" name="maintenanceMode" checked={settings.maintenanceMode} onChange={handleChange} className="sr-only" />
                <div className={`block w-14 h-8 rounded-full transition-colors ${settings.maintenanceMode ? 'bg-red-600' : 'bg-gray-300'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${settings.maintenanceMode ? 'transform translate-x-6' : ''}`}></div>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center bg-indigo-600 text-white px-6 py-2.5 rounded-lg shadow-sm font-medium hover:bg-indigo-700 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70"
        >
          {isSaving ? (
            <div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Save className="w-5 h-5 mr-2" />
          )}
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

    </div>
  );
};
