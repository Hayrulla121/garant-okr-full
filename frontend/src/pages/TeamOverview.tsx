import React, { useEffect, useState } from 'react';
import { UserWithScore, Role } from '../types/auth';
import { Department } from '../types/okr';
import { userApi, departmentApi } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n';
import UserScoreCard from '../components/UserScoreCard';
import DisciplinaryBadge from '../components/DisciplinaryBadge';
import { DisciplinaryStatus } from '../types/evaluation';

const roleLabels: Record<Role, string> = {
  [Role.ADMIN]: 'Admin',
  [Role.DIRECTOR]: 'Director',
  [Role.HR]: 'HR',
  [Role.BUSINESS_BLOCK]: 'Business Block',
  [Role.DEPARTMENT_LEADER]: 'Dept Leader',
  [Role.EMPLOYEE]: 'Employee',
};

export default function TeamOverview() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [users, setUsers] = useState<UserWithScore[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [disciplinaryFilter, setDisciplinaryFilter] = useState<string>('ALL');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, deptsRes] = await Promise.all([
        userApi.getAllWithScores(),
        departmentApi.getAll(),
      ]);
      setUsers(usersRes.data);
      setDepartments(deptsRes.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || t.failedToLoadTeamData);
      console.error('Failed to load team data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter users
  const filteredUsers = users.filter((user) => {
    // Search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      user.username.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.fullName.toLowerCase().includes(searchLower);

    // Role filter
    const matchesRole = !roleFilter || user.role === roleFilter;

    // Department filter
    const matchesDepartment =
      !departmentFilter ||
      user.assignedDepartments?.some((d) => d.id === departmentFilter);

    // Active filter
    const matchesActive = !showActiveOnly || user.isActive;

    // Disciplinary filter
    const matchesDisciplinary =
      disciplinaryFilter === 'ALL' ||
      (disciplinaryFilter === 'AT_RISK'
        ? user.disciplinaryStatus && user.disciplinaryStatus !== 'NONE'
        : user.disciplinaryStatus === disciplinaryFilter);

    return matchesSearch && matchesRole && matchesDepartment && matchesActive && matchesDisciplinary;
  });

  // Sort by score (highest first), then by name
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const scoreA = a.overallScore ?? 0;
    const scoreB = b.overallScore ?? 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.fullName.localeCompare(b.fullName);
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto"></div>
          <p className="mt-4 text-slate-700 font-medium">{t.loadingTeamOverview}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              {t.backToDashboard}
            </button>
            <h1 className="text-2xl font-bold text-slate-800">{t.teamOverviewTitle}</h1>
            <p className="text-slate-500">{t.viewAllTeamMembers}</p>
          </div>
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

        {/* Performance Alert Summary */}
        {(() => {
          const atRisk = users.filter(u => u.disciplinaryStatus && u.disciplinaryStatus !== 'NONE');
          if (atRisk.length === 0) return null;
          const termRisk = atRisk.filter(u => u.disciplinaryStatus === 'TERMINATION_RISK').length;
          const fined = atRisk.filter(u => u.disciplinaryStatus === 'FINE').length;
          const warned = atRisk.filter(u => u.disciplinaryStatus === 'WARNING').length;
          return (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86l-8.6 14.86A1 1 0 002.56 20h18.88a1 1 0 00.87-1.28l-8.6-14.86a1 1 0 00-1.72 0z" />
                  </svg>
                </span>
                <h3 className="font-semibold text-red-800 text-sm">{t.performanceAlerts} — {atRisk.length} {t.employeesNeedAttention}</h3>
              </div>
              <div className="flex gap-4 flex-wrap">
                {termRisk > 0 && <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded">{termRisk} {t.terminationRiskCount}</span>}
                {fined > 0 && <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-1 rounded">{fined} {t.finedCount}</span>}
                {warned > 0 && <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded">{warned} {t.warnedCount}</span>}
                <button
                  onClick={() => setDisciplinaryFilter(disciplinaryFilter === 'AT_RISK' ? 'ALL' : 'AT_RISK')}
                  className="text-xs text-red-600 hover:text-red-800 font-medium underline"
                >
                  {disciplinaryFilter === 'AT_RISK' ? t.showAll : t.showAtRiskOnly}
                </button>
              </div>
            </div>
          );
        })()}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
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
                {Object.values(Role).map((role) => (
                  <option key={role} value={role}>
                    {roleLabels[role]}
                  </option>
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
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
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
          {/* Disciplinary Filter Row */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t.performanceFilter}</span>
            {(['ALL', 'AT_RISK', 'WATCH', 'WARNING', 'FINE', 'TERMINATION_RISK'] as const).map(f => (
              <button
                key={f}
                onClick={() => setDisciplinaryFilter(f)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  disciplinaryFilter === f
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f === 'ALL' ? t.all : f === 'AT_RISK' ? t.atRisk : f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
            <div className="text-xs text-slate-500">{t.totalMembers}</div>
            <div className="text-2xl font-bold text-slate-800">{users.length}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
            <div className="text-xs text-slate-500">{t.active}</div>
            <div className="text-2xl font-bold text-emerald-600">{users.filter(u => u.isActive).length}</div>
          </div>
          <div className={`rounded-xl shadow-sm border p-3 ${users.filter(u => u.disciplinaryStatus && u.disciplinaryStatus !== 'NONE').length > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
            <div className="text-xs text-slate-500">{t.atRisk}</div>
            <div className={`text-2xl font-bold ${users.filter(u => u.disciplinaryStatus && u.disciplinaryStatus !== 'NONE').length > 0 ? 'text-orange-600' : 'text-slate-800'}`}>
              {users.filter(u => u.disciplinaryStatus && u.disciplinaryStatus !== 'NONE').length}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
            <div className="text-xs text-slate-500">{t.showing}</div>
            <div className="text-2xl font-bold text-slate-800">{sortedUsers.length}</div>
          </div>
        </div>

        {/* Users Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {sortedUsers.map((user) => (
            <UserScoreCard
              key={user.id}
              user={user}
              onClick={() => navigate(`/profile/${user.id}`)}
            />
          ))}
        </div>

        {sortedUsers.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="mb-3 flex justify-center">
              <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-600 mb-1">{t.noUsersFound}</h3>
            <p className="text-slate-400 text-sm">{t.tryAdjustingFilters}</p>
          </div>
        )}

        {/* Summary */}
        <div className="mt-4 text-sm text-slate-500">
          {t.showing} {sortedUsers.length} {t.of} {users.length} {t.showingXOfYTeamMembers}
        </div>
      </div>
    </div>
  );
}
