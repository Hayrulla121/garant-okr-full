import React, { useState } from 'react';
import { Role, CreateUserRequest } from '../../types/auth';
import { Department } from '../../types/okr';
import { userApi } from '../../services/api';

interface Props {
  departments: Department[];
  onClose: () => void;
  onSuccess: () => void;
}

const roleLabels: Record<Role, string> = {
  [Role.ADMIN]: 'Admin',
  [Role.DIRECTOR]: 'Director',
  [Role.HR]: 'HR',
  [Role.BUSINESS_BLOCK]: 'Business Block',
  [Role.DEPARTMENT_LEADER]: 'Department Leader',
  [Role.EMPLOYEE]: 'Employee',
};

export default function CreateUserModal({ departments, onClose, onSuccess }: Props) {
  const [formData, setFormData] = useState<CreateUserRequest>({
    username: '',
    email: '',
    password: '',
    fullName: '',
    role: Role.EMPLOYEE,
    assignedGroupIds: [],
    jobTitle: '',
    phoneNumber: '',
    bio: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await userApi.create(formData);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleGroupToggle = (groupId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedGroupIds: prev.assignedGroupIds?.includes(groupId)
        ? prev.assignedGroupIds.filter(id => id !== groupId)
        : [...(prev.assignedGroupIds || []), groupId]
    }));
  };

  const departmentsWithGroups = departments.filter(d => d.groups && d.groups.length > 0);
  const hasAnyGroups = departmentsWithGroups.length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-primary text-white p-4 rounded-t-xl flex justify-between items-center">
          <h2 className="text-xl font-bold">Create New User</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="johndoe"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="john@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Min 6 characters"
              />
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="John Doe"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                {Object.values(Role).map(role => (
                  <option key={role} value={role}>{roleLabels[role]}</option>
                ))}
              </select>
            </div>

            {/* Job Title */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Job Title</label>
              <input
                type="text"
                value={formData.jobTitle || ''}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Software Engineer"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={formData.phoneNumber || ''}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bio</label>
            <textarea
              value={formData.bio || ''}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              rows={3}
              placeholder="Brief description about the user..."
            />
          </div>

          {/* Groups (organized by department) */}
          {formData.role !== Role.ADMIN && formData.role !== Role.HR && formData.role !== Role.BUSINESS_BLOCK && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Assign Groups</label>
              <div className="border border-slate-300 rounded-lg p-3 max-h-60 overflow-y-auto">
                {!hasAnyGroups ? (
                  <p className="text-slate-400 text-sm">No groups available</p>
                ) : (
                  <div className="space-y-3">
                    {departmentsWithGroups.map(dept => (
                      <div key={dept.id}>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{dept.name}</p>
                        <div className="space-y-1 ml-2">
                          {dept.groups!.map(group => (
                            <label key={group.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                              <input
                                type="checkbox"
                                checked={formData.assignedGroupIds?.includes(group.id) || false}
                                onChange={() => handleGroupToggle(group.id)}
                                className="w-4 h-4 text-primary rounded focus:ring-primary"
                              />
                              <span className="text-sm text-slate-700">{group.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:from-primary-dark hover:to-red-900 transition-all disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
