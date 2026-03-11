import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Division, Department, DivisionWithScore } from '../types/okr';
import { User, Role } from '../types/auth';
import { divisionApi, departmentApi, userApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import CreateDivisionModal from '../components/modals/CreateDivisionModal';
import EditDivisionModal from '../components/modals/EditDivisionModal';
import CreateDepartmentModal from '../components/modals/CreateDepartmentModal';
import AssignDepartmentsModal from '../components/modals/AssignDepartmentsModal';
import { getImageUrl } from '../utils/imageUrl';
import { useLanguage } from '../i18n';
import './OrgChart.css';

export default function OrganizationStructure() {
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [divisions, setDivisions] = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [divisionScores, setDivisionScores] = useState<Map<string, DivisionWithScore>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded state for tree nodes
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set());
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());

  // Modal states
  const [showCreateDivisionModal, setShowCreateDivisionModal] = useState(false);
  const [showEditDivisionModal, setShowEditDivisionModal] = useState(false);
  const [showCreateDepartmentModal, setShowCreateDepartmentModal] = useState(false);
  const [showAssignEmployeeModal, setShowAssignEmployeeModal] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const isAdmin = currentUser?.role === Role.ADMIN;
  const isDirector = currentUser?.role === Role.DIRECTOR;
  const canManage = isAdmin || isDirector;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [divisionsRes, departmentsRes, usersRes] = await Promise.all([
        divisionApi.getAll(),
        departmentApi.getAll(),
        userApi.getAll().catch(() => ({ data: [] })) // Users may fail if not admin
      ]);
      setDivisions(divisionsRes.data);
      setDepartments(departmentsRes.data);
      setUsers(usersRes.data);

      // Fetch division scores
      const scoresMap = new Map<string, DivisionWithScore>();
      await Promise.all(
        divisionsRes.data.map(async (div: Division) => {
          try {
            const scoreRes = await divisionApi.getWithScore(div.id);
            scoresMap.set(div.id, scoreRes.data);
          } catch (err) {
            console.error(`Failed to load score for division ${div.id}:`, err);
          }
        })
      );
      setDivisionScores(scoresMap);

      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load organization data');
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDivision = (divisionId: string) => {
    setExpandedDivisions(prev => {
      const next = new Set(prev);
      if (next.has(divisionId)) {
        next.delete(divisionId);
      } else {
        next.add(divisionId);
      }
      return next;
    });
  };

  const toggleDepartment = (departmentId: string) => {
    setExpandedDepartments(prev => {
      const next = new Set(prev);
      if (next.has(departmentId)) {
        next.delete(departmentId);
      } else {
        next.add(departmentId);
      }
      return next;
    });
  };

  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const expandAll = () => {
    setExpandedDivisions(new Set(divisions.map(d => d.id)));
    setExpandedDepartments(new Set(departments.map(d => d.id)));
  };

  const isFullyExpanded = divisions.length > 0 &&
    expandedDivisions.size === divisions.length &&
    expandedDepartments.size === departments.length;

  const collapseAll = () => {
    setExpandedDivisions(new Set());
    setExpandedDepartments(new Set());
    setScale(1); // Reset scale on collapse
  };

  // Effect to calculate and adjust scale when tree expands/collapses or window resizes
  useEffect(() => {
    const adjustScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const treeElement = containerRef.current.querySelector('.org-tree') as HTMLDivElement;

        if (treeElement) {
          // Keep current zoom to restore later, temporarily remove to get true width
          const currentZoom = (treeElement.style as any).zoom;
          (treeElement.style as any).zoom = '1';

          // Add some padding to the needed width
          const unzoomedWidth = treeElement.scrollWidth + 40;
          const unzoomedHeight = treeElement.scrollHeight + 40;

          const availableHeight = window.innerHeight - 300; // Account for header, padding, stats

          let newScale = 1;

          if (unzoomedWidth > containerWidth && unzoomedWidth > 0) {
            newScale = Math.min(newScale, containerWidth / unzoomedWidth);
          }

          if (unzoomedHeight > availableHeight && unzoomedHeight > 0) {
            newScale = Math.min(newScale, availableHeight / unzoomedHeight);
          }

          setScale(newScale);

          // Restore (will be overridden by React render anyway but good practice)
          (treeElement.style as any).zoom = currentZoom;
        }
      }
    };

    // Wait a brief moment for DOM elements to render their expanded state
    const timeoutId = setTimeout(adjustScale, 50);

    window.addEventListener('resize', adjustScale);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', adjustScale);
    };
  }, [expandedDivisions, expandedDepartments, divisions, departments]);

  const handleDeleteDivision = async (division: Division) => {
    if (division.departments.length > 0) {
      setError('Cannot delete division with departments. Please remove all departments first.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${division.name}"?`)) {
      return;
    }
    try {
      await divisionApi.delete(division.id);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete division');
    }
  };

  const handleDeleteDepartment = async (department: Department) => {
    if (!window.confirm(`Are you sure you want to delete "${department.name}"? This will also delete all objectives and key results.`)) {
      return;
    }
    try {
      await departmentApi.delete(department.id);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete department');
    }
  };

  const handleEditDivision = (division: Division) => {
    setSelectedDivision(division);
    setShowEditDivisionModal(true);
  };

  const handleAddDepartment = (division: Division) => {
    setSelectedDivision(division);
    setShowCreateDepartmentModal(true);
  };

  const handleAssignEmployee = (user: User) => {
    setSelectedUser(user);
    setShowAssignEmployeeModal(true);
  };

  // Get departments for a division
  const getDepartmentsForDivision = (divisionId: string): Department[] => {
    return departments.filter(d => d.division?.id === divisionId || d.divisionId === divisionId);
  };

  // Get employees for a department
  const getEmployeesForDepartment = (departmentId: string): User[] => {
    return users.filter(u => u.assignedDepartments?.some(d => d.id === departmentId));
  };

  // Get departments without a division
  const getUnassignedDepartments = (): Department[] => {
    return departments.filter(d => !d.division && !d.divisionId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto"></div>
          <p className="mt-4 text-slate-700 font-medium">{t.loadingOrgStructure}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {t.backToDashboard}
            </button>
            <h1 className="text-2xl font-bold text-slate-800">{t.orgStructureTitle}</h1>
            <p className="text-slate-500">{t.orgStructureDesc}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
            >
              {t.expandAll}
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
            >
              {t.collapseAll}
            </button>
            {canManage && (
              <button
                onClick={() => setShowCreateDivisionModal(true)}
                className="px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:from-primary-dark hover:to-red-900 transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t.createDivision}
              </button>
            )}
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

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{divisions.length}</div>
                <div className="text-sm text-slate-500">{t.divisionsCount}</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{departments.length}</div>
                <div className="text-sm text-slate-500">{t.departmentsCount}</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{users.length}</div>
                <div className="text-sm text-slate-500">{t.employeesCount}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden mb-12">
          <div className="bg-primary text-white p-4 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">{t.hierarchicalView}</h2>
              <p className="text-red-100 text-sm">{t.nodePath}</p>
            </div>
          </div>

          <div className="p-4">
            {divisions.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="text-lg font-medium">{t.noDivisionsYet}</p>
                <p className="text-sm mt-1">{t.createFirstDivision}</p>
              </div>
            ) : (
              <div
                className="w-full custom-scrollbar overflow-x-auto overflow-y-hidden pb-8 pt-4"
                ref={containerRef}
              >
                <div
                  className="org-tree px-8 min-w-max mx-auto origin-top transition-transform duration-300"
                  style={{
                    zoom: scale,
                    '--hover-scale': scale < 1 ? Math.max(1.1, 1 / scale * 0.95) : 1.05
                  } as React.CSSProperties}
                >
                  <ul>
                    <li>
                      {/* Root Node (Company/Organization) */}
                      <div className="org-node bg-white border-2 border-slate-800 rounded-2xl shadow-lg p-5 mb-4 relative z-10 min-w-[250px] inline-block">
                        <div className="w-12 h-12 rounded-xl bg-slate-900 mx-auto flex items-center justify-center mb-3">
                          <img src="/logo_garantbank.png" alt="Logo" className="h-8 brightness-0 invert" />
                        </div>
                        <h3 className="font-bold text-slate-800 text-lg">Garant Bank</h3>
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mt-1">{t.headquarters}</p>
                        <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-500">
                          <span>{divisions.length} {t.divisionsCount}</span>
                          <span>{users.length} {t.employeesCount}</span>
                        </div>
                      </div>

                      {/* Divisions Level */}
                      <ul>
                        {divisions.map((division) => {
                          const divisionDepartments = getDepartmentsForDivision(division.id);
                          const isExpanded = expandedDivisions.has(division.id);
                          const divisionScore = divisionScores.get(division.id);

                          return (
                            <li key={division.id}>
                              {/* Division Node */}
                              <div className="org-node bg-white border border-slate-200 rounded-xl shadow-md p-4 w-56 relative group">
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {canManage && (
                                    <>
                                      <button onClick={(e) => { e.stopPropagation(); handleAddDepartment(division); }} className="p-1 text-green-600 hover:bg-green-50 rounded bg-white shadow-sm border border-slate-100"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></button>
                                      <button onClick={(e) => { e.stopPropagation(); handleEditDivision(division); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded bg-white shadow-sm border border-slate-100"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                                      <button onClick={(e) => { e.stopPropagation(); handleDeleteDivision(division); }} className="p-1 text-red-600 hover:bg-red-50 rounded bg-white shadow-sm border border-slate-100"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                    </>
                                  )}
                                </div>
                                <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 mx-auto flex items-center justify-center mb-2 font-bold text-lg cursor-pointer" onClick={() => toggleDivision(division.id)}>
                                  {division.name.charAt(0).toUpperCase()}
                                </div>
                                <h4 className="font-bold text-slate-800 text-sm mb-1">{division.name}</h4>
                                {division.divisionLeader && <p className="text-[10px] text-slate-500 mb-2 truncate px-2">{t.leaderLabel} {division.divisionLeader.fullName}</p>}

                                <div className="flex items-center justify-center gap-2 mt-2">
                                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{divisionDepartments.length} {t.deptsShort}</span>
                                  {divisionScore && divisionScore.score !== undefined && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full text-white font-bold" style={{ backgroundColor: divisionScore.color || '#6b7280' }}>
                                      {divisionScore.score.toFixed(2)}
                                    </span>
                                  )}
                                </div>

                                {/* Expand/Collapse Toggle */}
                                {divisionDepartments.length > 0 && (
                                  <button
                                    onClick={() => toggleDivision(division.id)}
                                    className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-white border border-slate-300 rounded-full p-0.5 shadow-sm text-slate-400 hover:text-purple-600 z-20 transition-colors"
                                  >
                                    <svg className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                  </button>
                                )}
                              </div>

                              {/* Departments Level */}
                              {isExpanded && divisionDepartments.length > 0 && (
                                <ul>
                                  {divisionDepartments.map((department) => {
                                    const departmentEmployees = getEmployeesForDepartment(department.id);
                                    const isDeptExpanded = expandedDepartments.has(department.id);

                                    return (
                                      <li key={department.id}>
                                        {/* Department Node */}
                                        <div className="org-node bg-white border border-slate-200 rounded-xl shadow-sm p-3 w-48 relative group mt-4 hover:border-primary transition-colors">
                                          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                            {isAdmin && (
                                              <button onClick={(e) => { e.stopPropagation(); handleDeleteDepartment(department); }} className="p-1 text-red-600 hover:bg-red-50 rounded bg-white shadow-sm border border-slate-100"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                            )}
                                          </div>
                                          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary mx-auto flex items-center justify-center mb-2 font-bold text-sm cursor-pointer" onClick={() => toggleDepartment(department.id)}>
                                            {department.name.charAt(0).toUpperCase()}
                                          </div>
                                          <h5 className="font-semibold text-slate-800 text-xs text-center mb-1 leading-tight h-8 flex items-center justify-center">{department.name}</h5>

                                          <div className="flex items-center justify-center gap-1.5 mt-1 border-t border-slate-100 pt-2">
                                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">{departmentEmployees.length} {t.empShort}</span>
                                            {(department.finalScore || department.score) && (
                                              <span className="text-[9px] px-1.5 py-0.5 rounded text-white font-bold" style={{ backgroundColor: (department.finalScore || department.score)?.color || '#6b7280' }}>
                                                {(department.finalScore || department.score)?.score.toFixed(2)}
                                              </span>
                                            )}
                                          </div>

                                          {/* Expand/Collapse Toggle */}
                                          {departmentEmployees.length > 0 && (
                                            <button
                                              onClick={() => toggleDepartment(department.id)}
                                              className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-white border border-slate-300 rounded-full p-0.5 shadow-sm text-slate-400 hover:text-primary z-20 transition-colors"
                                            >
                                              <svg className={`w-3 h-3 transform transition-transform ${isDeptExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                            </button>
                                          )}
                                        </div>

                                        {/* Employees Level */}
                                        {isDeptExpanded && departmentEmployees.length > 0 && (
                                          <ul>
                                            {departmentEmployees.map((employee) => (
                                              <li key={employee.id}>
                                                {/* Employee Node */}
                                                <div
                                                  className="org-node bg-white border border-slate-200 rounded-xl shadow-sm p-3 w-40 relative group mt-4 cursor-pointer hover:border-green-400 hover:shadow-md transition-all"
                                                  onClick={() => navigate(`/profile/${employee.id}`)}
                                                >
                                                  {isAdmin && (
                                                    <button
                                                      onClick={(e) => { e.stopPropagation(); handleAssignEmployee(employee); }}
                                                      className="absolute -top-2 -right-2 p-1.5 text-white bg-blue-500 hover:bg-blue-600 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                                      title="Manage Departments"
                                                    >
                                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg>
                                                    </button>
                                                  )}
                                                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 mx-auto flex items-center justify-center mb-2 font-bold text-xs overflow-hidden border-2 border-white shadow-sm">
                                                    {employee.profilePhotoUrl ? (
                                                      <img src={getImageUrl(employee.profilePhotoUrl)} alt={employee.fullName} className="w-full h-full object-cover" />
                                                    ) : (
                                                      employee.fullName.charAt(0).toUpperCase()
                                                    )}
                                                  </div>
                                                  <h6 className="font-semibold text-slate-800 text-[11px] text-center truncate w-full px-1">{employee.fullName}</h6>
                                                  <p className="text-[9px] text-slate-500 text-center truncate w-full mb-1">{employee.jobTitle || employee.role}</p>
                                                  <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${employee.role === Role.DEPARTMENT_LEADER ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{employee.role.replace('_', ' ')}</span>
                                                </div>
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  </ul>

                  {/* Unassigned Departments Section */}
                  {getUnassignedDepartments().length > 0 && (
                    <div className="border border-amber-200 bg-white rounded-xl shadow-md overflow-hidden mt-8 max-w-sm mx-auto">
                      <div className="p-3 bg-amber-50 border-b border-amber-100">
                        <div className="flex items-center justify-center gap-2 text-amber-800">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span className="font-semibold text-sm">{t.unassignedDepts}</span>
                          <span className="text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full">{getUnassignedDepartments().length}</span>
                        </div>
                      </div>
                      <div className="p-3 space-y-2">
                        {getUnassignedDepartments().map((department) => (
                          <div
                            key={department.id}
                            className="flex items-center justify-between p-2 bg-amber-25 border border-amber-100 rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded bg-amber-500 flex items-center justify-center text-white font-bold text-xs">
                                {department.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-slate-700 text-xs">{department.name}</span>
                            </div>
                            <span className="text-[10px] text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                              {t.needsDivision}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreateDivisionModal && (
        <CreateDivisionModal
          onClose={() => setShowCreateDivisionModal(false)}
          onSuccess={() => {
            setShowCreateDivisionModal(false);
            loadData();
          }}
        />
      )}

      {showEditDivisionModal && selectedDivision && (
        <EditDivisionModal
          division={selectedDivision}
          onClose={() => {
            setShowEditDivisionModal(false);
            setSelectedDivision(null);
          }}
          onSuccess={() => {
            setShowEditDivisionModal(false);
            setSelectedDivision(null);
            loadData();
          }}
        />
      )}

      {showCreateDepartmentModal && selectedDivision && (
        <CreateDepartmentModal
          divisionId={selectedDivision.id}
          divisionName={selectedDivision.name}
          onClose={() => {
            setShowCreateDepartmentModal(false);
            setSelectedDivision(null);
          }}
          onSuccess={() => {
            setShowCreateDepartmentModal(false);
            setSelectedDivision(null);
            loadData();
          }}
        />
      )}

      {showAssignEmployeeModal && selectedUser && (
        <AssignDepartmentsModal
          user={selectedUser}
          departments={departments}
          onClose={() => {
            setShowAssignEmployeeModal(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            setShowAssignEmployeeModal(false);
            setSelectedUser(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
