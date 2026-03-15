import React, { useEffect, useState } from 'react';
import { User, Role, UserWithScore } from '../types/auth';
import { Department } from '../types/okr';
import { userApi, departmentApi, evaluationApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import CreateUserModal from '../components/modals/CreateUserModal';
import EditUserModal from '../components/modals/EditUserModal';
import AssignDepartmentsModal from '../components/modals/AssignDepartmentsModal';
import { getImageUrl } from '../utils/imageUrl';
import DisciplinaryBadge from '../components/DisciplinaryBadge';
import { useLanguage } from '../i18n';
import { EmployeeEvaluationSummary, DisciplinaryStatus } from '../types/evaluation';

const roleColors: Record<Role, string> = {
  [Role.ADMIN]: 'bg-purple-100 text-purple-800',
  [Role.DIRECTOR]: 'bg-blue-100 text-blue-800',
  [Role.HR]: 'bg-green-100 text-green-800',
  [Role.BUSINESS_BLOCK]: 'bg-orange-100 text-orange-800',
  [Role.DEPARTMENT_LEADER]: 'bg-red-100 text-red-800',
  [Role.EMPLOYEE]: 'bg-gray-100 text-gray-800',
};

const roleLabels: Record<Role, string> = {
  [Role.ADMIN]: 'Admin',
  [Role.DIRECTOR]: 'Director',
  [Role.HR]: 'HR',
  [Role.BUSINESS_BLOCK]: 'Business Block',
  [Role.DEPARTMENT_LEADER]: 'Dept Leader',
  [Role.EMPLOYEE]: 'Employee',
};

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [evalSummaries, setEvalSummaries] = useState<Record<string, EmployeeEvaluationSummary>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignDeptModal, setShowAssignDeptModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, deptsRes] = await Promise.all([
        userApi.getAll(),
        departmentApi.getAll()
      ]);
      setUsers(usersRes.data);
      setDepartments(deptsRes.data);
      // Load at-risk summaries
      try {
        const atRiskRes = await evaluationApi.getAtRisk();
        const summaryMap: Record<string, EmployeeEvaluationSummary> = {};
        atRiskRes.data.forEach(s => { summaryMap[s.userId] = s; });
        setEvalSummaries(summaryMap);
      } catch {
        // Non-critical: evaluation summaries may not be available
      }
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load users');
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm(t.confirmDeleteUser)) {
      return;
    }
    try {
      await userApi.delete(userId);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleAssignDepartments = (user: User) => {
    setSelectedUser(user);
    setShowAssignDeptModal(true);
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    // Search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      user.username.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.fullName.toLowerCase().includes(searchLower);

    // Role filter
    const matchesRole = !roleFilter || user.role === roleFilter;

    // Department filter
    const matchesDepartment = !departmentFilter ||
      user.assignedDepartments?.some(d => d.id === departmentFilter);

    // Active filter
    const matchesActive = !showActiveOnly || user.isActive;

    return matchesSearch && matchesRole && matchesDepartment && matchesActive;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto"></div>
          <p className="mt-4 text-slate-700 font-medium">{t.loadingUsers}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center mb-2">
          <div>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-3 px-3 py-1.5 rounded-lg bg-white shadow-sm border border-slate-200 transition-all hover:shadow-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {t.backToDashboard}
            </button>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">{t.userManagementTitle}</h1>
            <p className="text-slate-500 mt-1 font-medium">{t.manageUsersRolesDepartments}</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2 border border-primary/50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            {t.createUser}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">
              &times;
            </button>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-3xl shadow-sm hover:shadow-md border border-slate-100 p-6 transition-all">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{t.totalUsers}</div>
            <div className="text-3xl font-bold text-slate-800">{users.length}</div>
          </div>
          <div className="bg-white rounded-3xl shadow-sm hover:shadow-md border border-slate-100 p-6 transition-all">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{t.active}</div>
            <div className="text-3xl font-bold text-emerald-500">{users.filter(u => u.isActive).length}</div>
          </div>
          <div className={`rounded-3xl shadow-sm hover:shadow-md border p-6 transition-all ${Object.keys(evalSummaries).length > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-100'}`}>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{t.performanceAlerts}</div>
            <div className={`text-3xl font-bold ${Object.keys(evalSummaries).length > 0 ? 'text-orange-500' : 'text-slate-800'}`}>
              {Object.keys(evalSummaries).length}
            </div>
          </div>
          <div className={`rounded-3xl shadow-sm hover:shadow-md border p-6 transition-all ${Object.values(evalSummaries).filter(s => s.disciplinaryStatus === 'TERMINATION_RISK' || s.disciplinaryStatus === 'FINE').length > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100'}`}>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{t.criticalFineTermination}</div>
            <div className={`text-3xl font-bold ${Object.values(evalSummaries).filter(s => s.disciplinaryStatus === 'TERMINATION_RISK' || s.disciplinaryStatus === 'FINE').length > 0 ? 'text-red-500' : 'text-slate-800'}`}>
              {Object.values(evalSummaries).filter(s => s.disciplinaryStatus === 'TERMINATION_RISK' || s.disciplinaryStatus === 'FINE').length}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-3xl shadow-md p-6 border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t.search}</label>
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            {/* Role Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t.role}</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as Role | '')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">{t.allRoles}</option>
                {Object.values(Role).map(role => (
                  <option key={role} value={role}>{roleLabels[role]}</option>
                ))}
              </select>
            </div>

            {/* Department Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t.department}</label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">{t.allDepartments2}</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>

            {/* Active Only Toggle */}
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showActiveOnly}
                  onChange={(e) => setShowActiveOnly(e.target.checked)}
                  className="w-4 h-4 text-primary rounded focus:ring-primary"
                />
                <span className="text-sm font-medium text-slate-700">{t.activeUsersOnly}</span>
              </label>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-3xl shadow-md overflow-hidden border border-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">{t.user}</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">{t.role}</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">{t.departments}</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">{t.status}</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">{t.performance}</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">{t.lastLoginCol}</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(user => {
                  const summary = evalSummaries[user.id];
                  const rowClass = summary?.disciplinaryStatus === 'TERMINATION_RISK'
                    ? 'bg-red-50 border-l-4 border-red-500 hover:bg-red-100'
                    : summary?.disciplinaryStatus === 'FINE'
                      ? 'bg-orange-50 border-l-4 border-orange-400 hover:bg-orange-100'
                      : summary?.disciplinaryStatus === 'WARNING'
                        ? 'bg-yellow-50 border-l-4 border-yellow-400 hover:bg-yellow-100'
                        : summary?.disciplinaryStatus === 'WATCH'
                          ? 'bg-amber-50 border-l-4 border-amber-300 hover:bg-amber-100'
                          : 'hover:bg-slate-50';
                  return (
                    <tr key={user.id} className={rowClass}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-bold overflow-hidden">
                            {user.profilePhotoUrl ? (
                              <img src={getImageUrl(user.profilePhotoUrl)} alt={user.fullName} className="w-full h-full object-cover" />
                            ) : (
                              user.fullName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800">{user.fullName}</div>
                            <div className="text-sm text-slate-500">{user.username} &middot; {user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${roleColors[user.role]}`}>
                          {roleLabels[user.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {user.assignedDepartments?.length > 0 ? (
                            user.assignedDepartments.slice(0, 2).map(dept => (
                              <span key={dept.id} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                                {dept.name.length > 20 ? dept.name.substring(0, 20) + '...' : dept.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-sm">{t.none}</span>
                          )}
                          {user.assignedDepartments?.length > 2 && (
                            <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded">
                              +{user.assignedDepartments.length - 2} {t.more}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {user.isActive ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">{t.active}</span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">{t.inactive}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {evalSummaries[user.id] ? (
                          <DisciplinaryBadge
                            status={evalSummaries[user.id].disciplinaryStatus as DisciplinaryStatus}
                            count={evalSummaries[user.id].belowExpectationsCount}
                            size="sm"
                            showLabel={true}
                            showCount={true}
                          />
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : t.none}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/profile/${user.id}`)}
                            className="p-1 text-slate-400 hover:text-slate-600"
                            title={t.viewProfile}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleEditUser(user)}
                            className="p-1 text-blue-400 hover:text-blue-600"
                            title={t.editUser}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          {user.role !== Role.ADMIN && user.role !== Role.HR && user.role !== Role.BUSINESS_BLOCK && (
                            <button
                              onClick={() => handleAssignDepartments(user)}
                              className="p-1 text-gray-400 hover:text-primary"
                              title={t.assignDepartmentsAction}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            </button>
                          )}
                          {currentUser?.id !== user.id && (
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-1 text-red-400 hover:text-red-600"
                              title={t.deleteUser}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              {t.noUsersMatchingFilters}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="mt-4 text-sm text-slate-500">
          {t.showing} {filteredUsers.length} {t.of} {users.length} {t.showingXOfYUsers}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateUserModal
          departments={departments}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadData();
          }}
        />
      )}

      {showEditModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          departments={departments}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedUser(null);
            loadData();
          }}
        />
      )}

      {showAssignDeptModal && selectedUser && (
        <AssignDepartmentsModal
          user={selectedUser}
          departments={departments}
          onClose={() => {
            setShowAssignDeptModal(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            setShowAssignDeptModal(false);
            setSelectedUser(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
