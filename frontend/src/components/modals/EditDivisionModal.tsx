import React, { useState, useEffect } from 'react';
import { Division, UpdateDivisionRequest } from '../../types/okr';
import { User } from '../../types/auth';
import { divisionApi, userApi } from '../../services/api';

interface Props {
  division: Division;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditDivisionModal({ division, onClose, onSuccess }: Props) {
  const [formData, setFormData] = useState<UpdateDivisionRequest>({
    name: division.name,
    leaderId: division.divisionLeader?.id,
  });
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await userApi.getAll();
      setUsers(response.data);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await divisionApi.update(division.id, formData);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update division');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-dark text-white p-4 rounded-t-xl flex justify-between items-center">
          <h2 className="text-xl font-bold">Edit Division</h2>
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

          {/* Division Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Division Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="e.g., Technology Division"
            />
          </div>

          {/* Division Leader */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Division Leader
            </label>
            <select
              value={formData.leaderId || ''}
              onChange={(e) => setFormData({ ...formData, leaderId: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">No leader assigned</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.fullName} ({user.role})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Optional: Assign a user as the division leader
            </p>
          </div>

          {/* Division Info */}
          <div className="bg-slate-50 rounded-lg p-3 text-sm">
            <div className="text-slate-600">
              <span className="font-medium">Departments:</span>{' '}
              {division.departments.length} department{division.departments.length !== 1 ? 's' : ''}
            </div>
            {division.departments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {division.departments.map(dept => (
                  <span key={dept.id} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                    {dept.name}
                  </span>
                ))}
              </div>
            )}
          </div>

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
              className="px-4 py-2 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg font-semibold hover:from-primary-dark hover:to-red-900 transition-all disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
