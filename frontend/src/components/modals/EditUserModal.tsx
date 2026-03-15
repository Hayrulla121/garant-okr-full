import React, { useState } from 'react';
import { User, Role, UpdateUserRequest } from '../../types/auth';
import { Department } from '../../types/okr';
import { userApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  user: User;
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

export default function EditUserModal({ user, departments, onClose, onSuccess }: Props) {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === Role.ADMIN;
  const isSelf = currentUser?.id === user.id;

  const [formData, setFormData] = useState<UpdateUserRequest>({
    fullName: user.fullName,
    email: user.email,
    jobTitle: user.jobTitle || '',
    phoneNumber: user.phoneNumber || '',
    bio: user.bio || '',
    role: user.role,
    assignedGroupIds: user.assignedGroups?.map(g => g.id) || [],
    isActive: user.isActive,
    canEditAssignedDepartments: user.canEditAssignedDepartments || false,
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const updateData: UpdateUserRequest = {
        fullName: formData.fullName,
        email: formData.email,
        jobTitle: formData.jobTitle,
        phoneNumber: formData.phoneNumber,
        bio: formData.bio,
      };

      if (isAdmin) {
        updateData.role = formData.role;
        updateData.assignedGroupIds = formData.assignedGroupIds;
        updateData.isActive = formData.isActive;
        updateData.canEditAssignedDepartments = formData.canEditAssignedDepartments;
      }

      if (formData.password && formData.password.length >= 6) {
        updateData.password = formData.password;
      }

      await userApi.update(user.id, updateData);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update user');
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
        <div className="bg-gradient-to-r from-primary to-primary-dark text-white p-4 rounded-t-xl flex justify-between items-center">
          <h2 className="text-xl font-bold">Edit User: {user.fullName}</h2>
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
            {/* Username (read-only) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <input
                type="text"
                value={user.username}
                disabled
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={formData.fullName || ''}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            {/* Role (Admin only) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Role {!isAdmin && <span className="text-slate-400">(Admin only)</span>}
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                disabled={!isAdmin}
                className={`w-full px-3 py-2 border rounded-lg ${isAdmin
                    ? 'border-slate-300 focus:ring-2 focus:ring-primary focus:border-primary'
                    : 'border-slate-200 bg-slate-50 text-slate-500'
                  }`}
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
              />
            </div>

            {/* New Password */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                New Password <span className="text-slate-400">(leave empty to keep current)</span>
              </label>
              <input
                type="password"
                value={formData.password || ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Min 6 characters"
                minLength={6}
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
            />
          </div>

          {/* Active Status (Admin only) */}
          {isAdmin && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-primary rounded focus:ring-primary"
                />
                <span className="text-sm font-medium text-slate-700">Account is active</span>
              </label>
            </div>
          )}

          {/* Can Edit Assigned Departments (Admin only, for EMPLOYEE role) */}
          {isAdmin && formData.role === Role.EMPLOYEE && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.canEditAssignedDepartments}
                  onChange={(e) => setFormData({ ...formData, canEditAssignedDepartments: e.target.checked })}
                  className="w-4 h-4 text-green-500 rounded focus:ring-green-500"
                />
                <span className="text-sm font-medium text-slate-700">Can edit assigned departments</span>
              </label>
              <p className="text-xs text-slate-500 mt-1 ml-6">
                Allows this employee to edit KRs for their assigned departments
              </p>
            </div>
          )}

          {/* Groups (Admin only, organized by department) */}
          {isAdmin && formData.role !== Role.ADMIN && formData.role !== Role.HR && formData.role !== Role.BUSINESS_BLOCK && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Assign Groups
              </label>
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
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
