import React, { useState } from 'react';
import { User } from '../../types/auth';
import { Department } from '../../types/okr';
import { userApi } from '../../services/api';

interface Props {
  user: User;
  departments: Department[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignDepartmentsModal({ user, departments, onClose, onSuccess }: Props) {
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>(
    user.assignedDepartments?.map(d => d.id) || []
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleToggle = (deptId: string) => {
    setSelectedDeptIds(prev =>
      prev.includes(deptId)
        ? prev.filter(id => id !== deptId)
        : [...prev, deptId]
    );
  };

  const handleSelectAll = () => {
    setSelectedDeptIds(departments.map(d => d.id));
  };

  const handleDeselectAll = () => {
    setSelectedDeptIds([]);
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      await userApi.assignDepartments(user.id, selectedDeptIds);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to assign departments');
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = () => {
    const currentIds = user.assignedDepartments?.map(d => d.id) || [];
    if (currentIds.length !== selectedDeptIds.length) return true;
    return !currentIds.every(id => selectedDeptIds.includes(id));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-primary text-white p-4 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold">Assign Departments</h2>
            <p className="text-red-100 text-sm">{user.fullName}</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded text-sm">
              {error}
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-3 py-1.5 text-sm text-primary hover:bg-gray-50 rounded-lg transition-colors"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Deselect All
            </button>
          </div>

          {/* Department List */}
          <div className="space-y-2">
            {departments.length === 0 ? (
              <p className="text-center text-slate-400 py-8">No departments available</p>
            ) : (
              departments.map(dept => (
                <label
                  key={dept.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedDeptIds.includes(dept.id)
                      ? 'border-primary bg-red-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedDeptIds.includes(dept.id)}
                    onChange={() => handleToggle(dept.id)}
                    className="w-5 h-5 text-primary rounded focus:ring-primary"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-800">{dept.name}</div>
                    <div className="text-xs text-slate-500">
                      {dept.objectives?.length || 0} objectives
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 flex justify-between items-center bg-slate-50">
          <div className="text-sm text-slate-500">
            {selectedDeptIds.length} department{selectedDeptIds.length !== 1 ? 's' : ''} selected
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !hasChanges()}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Assignments'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
