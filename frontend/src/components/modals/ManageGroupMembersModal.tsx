import React, { useState, useEffect } from 'react';
import { Group } from '../../types/okr';
import { User } from '../../types/auth';
import { userApi, groupApi } from '../../services/api';
import { useLanguage } from '../../i18n';

interface Props {
  group: Group;
  departmentId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ManageGroupMembersModal({ group, departmentId, onClose, onSuccess }: Props) {
  const { t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    group.members?.map(m => m.id) || []
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    userApi.getByDepartment(departmentId)
      .then(res => setUsers(res.data))
      .catch(() => setError('Failed to load users'))
      .finally(() => setFetching(false));
  }, [departmentId]);

  const handleToggle = (userId: string) => {
    setSelectedIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = () => setSelectedIds(users.map(u => u.id));
  const handleDeselectAll = () => setSelectedIds([]);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await groupApi.updateMembers(group.id, selectedIds);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update members');
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = () => {
    const currentIds = group.members?.map(m => m.id) || [];
    if (currentIds.length !== selectedIds.length) return true;
    return !currentIds.every(id => selectedIds.includes(id));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold">{t.manageMembers}</h2>
            <p className="text-blue-100 text-sm">{group.name}</p>
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

          {fetching ? (
            <p className="text-center text-slate-400 py-8">Loading...</p>
          ) : users.length === 0 ? (
            <p className="text-center text-slate-400 py-8">{t.noEmployeesInDepartment}</p>
          ) : (
            <>
              <div className="flex gap-2 mb-4">
                <button type="button" onClick={handleSelectAll}
                  className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  Select All
                </button>
                <button type="button" onClick={handleDeselectAll}
                  className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                  Deselect All
                </button>
              </div>
              <div className="space-y-2">
                {users.map(user => (
                  <label
                    key={user.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedIds.includes(user.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(user.id)}
                      onChange={() => handleToggle(user.id)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-slate-800">{user.fullName}</div>
                      <div className="text-xs text-slate-500">{user.username}</div>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 flex justify-between items-center bg-slate-50">
          <div className="text-sm text-slate-500">
            {selectedIds.length} member{selectedIds.length !== 1 ? 's' : ''} selected
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors">
              {t.cancel}
            </button>
            <button type="button" onClick={handleSubmit}
              disabled={loading || !hasChanges()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50">
              {loading ? '...' : t.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
