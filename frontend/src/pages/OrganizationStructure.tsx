import React, { useEffect, useState } from 'react';
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

export default function OrganizationStructure() {
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
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
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

  const expandAll = () => {
    setExpandedDivisions(new Set(divisions.map(d => d.id)));
    setExpandedDepartments(new Set(departments.map(d => d.id)));
  };

  const collapseAll = () => {
    setExpandedDivisions(new Set());
    setExpandedDepartments(new Set());
  };

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
          <p className="mt-4 text-slate-700 font-medium">Loading organization structure...</p>
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
              Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-slate-800">Organization Structure</h1>
            <p className="text-slate-500">Manage divisions, departments, and employee assignments</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
            >
              Collapse All
            </button>
            {canManage && (
              <button
                onClick={() => setShowCreateDivisionModal(true)}
                className="px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:from-primary-dark hover:to-red-900 transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Division
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
                <div className="text-sm text-slate-500">Divisions</div>
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
                <div className="text-sm text-slate-500">Departments</div>
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
                <div className="text-sm text-slate-500">Employees</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tree View */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-primary text-white p-4">
            <h2 className="text-lg font-semibold">Organization Hierarchy</h2>
            <p className="text-red-100 text-sm">Division &rarr; Department &rarr; Employee</p>
          </div>

          <div className="p-4">
            {divisions.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="text-lg font-medium">No divisions yet</p>
                <p className="text-sm mt-1">Create your first division to start building the organization structure</p>
              </div>
            ) : (
              <div className="space-y-2">
                {divisions.map((division) => {
                  const divisionDepartments = getDepartmentsForDivision(division.id);
                  const isExpanded = expandedDivisions.has(division.id);
                  const divisionScore = divisionScores.get(division.id);

                  return (
                    <div key={division.id} className="border border-slate-200 rounded-lg overflow-hidden">
                      {/* Division Header */}
                      <div
                        className="flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 cursor-pointer transition-colors"
                        onClick={() => toggleDivision(division.id)}
                      >
                        <div className="flex items-center gap-3">
                          <button className="text-purple-600">
                            <svg
                              className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold text-sm">
                            {division.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800">{division.name}</div>
                            <div className="text-xs text-slate-500">
                              {divisionDepartments.length} department{divisionDepartments.length !== 1 ? 's' : ''}
                              {division.divisionLeader && (
                                <span className="ml-2">
                                  &middot; Leader: {division.divisionLeader.fullName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Division Score */}
                        {divisionScore && divisionScore.score !== undefined && (
                          <div className="flex items-center gap-2 mr-2" onClick={(e) => e.stopPropagation()}>
                            <div
                              className="px-3 py-1 rounded-full text-white text-sm font-bold"
                              style={{ backgroundColor: divisionScore.color || '#6b7280' }}
                            >
                              {divisionScore.score.toFixed(2)}
                            </div>
                            <span className="text-xs text-slate-500 capitalize">
                              {divisionScore.scoreLevel?.replace('_', ' ')}
                            </span>
                          </div>
                        )}
                        {canManage && (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleAddDepartment(division)}
                              className="p-1.5 text-green-600 hover:bg-green-100 rounded"
                              title="Add Department"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleEditDivision(division)}
                              className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"
                              title="Edit Division"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteDivision(division)}
                                className="p-1.5 text-red-600 hover:bg-red-100 rounded"
                                title="Delete Division"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Departments under Division */}
                      {isExpanded && (
                        <div className="border-t border-slate-200">
                          {divisionDepartments.length === 0 ? (
                            <div className="p-4 pl-12 text-slate-400 text-sm">
                              No departments in this division
                            </div>
                          ) : (
                            divisionDepartments.map((department) => {
                              const departmentEmployees = getEmployeesForDepartment(department.id);
                              const isDeptExpanded = expandedDepartments.has(department.id);

                              return (
                                <div key={department.id} className="border-b border-slate-100 last:border-b-0">
                                  {/* Department Header */}
                                  <div
                                    className="flex items-center justify-between p-3 pl-10 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                                    onClick={() => toggleDepartment(department.id)}
                                  >
                                    <div className="flex items-center gap-3">
                                      <button className="text-primary">
                                        <svg
                                          className={`w-4 h-4 transform transition-transform ${isDeptExpanded ? 'rotate-90' : ''}`}
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                      </button>
                                      <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xs">
                                        {department.name.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <div className="font-medium text-slate-800">{department.name}</div>
                                        <div className="text-xs text-slate-500">
                                          {departmentEmployees.length} employee{departmentEmployees.length !== 1 ? 's' : ''}
                                          {department.objectives && (
                                            <span className="ml-2">
                                              &middot; {department.objectives.length} objective{department.objectives.length !== 1 ? 's' : ''}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    {/* Department Score */}
                                    <div className="flex items-center gap-2">
                                      {(department.finalScore || department.score) && (
                                        <div
                                          className="px-2 py-0.5 rounded-full text-white text-xs font-bold"
                                          style={{ backgroundColor: (department.finalScore || department.score)?.color || '#6b7280' }}
                                        >
                                          {(department.finalScore || department.score)?.score.toFixed(2)}
                                        </div>
                                      )}
                                    </div>
                                    {isAdmin && (
                                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                        <button
                                          onClick={() => handleDeleteDepartment(department)}
                                          className="p-1.5 text-red-600 hover:bg-red-100 rounded"
                                          title="Delete Department"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* Employees under Department */}
                                  {isDeptExpanded && (
                                    <div className="bg-slate-50">
                                      {departmentEmployees.length === 0 ? (
                                        <div className="p-3 pl-20 text-slate-400 text-sm">
                                          No employees assigned
                                        </div>
                                      ) : (
                                        departmentEmployees.map((employee) => (
                                          <div
                                            key={employee.id}
                                            className="flex items-center justify-between p-2 pl-20 hover:bg-slate-100 transition-colors"
                                          >
                                            <div className="flex items-center gap-3">
                                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-xs overflow-hidden">
                                                {employee.profilePhotoUrl ? (
                                                  <img
                                                    src={getImageUrl(employee.profilePhotoUrl)}
                                                    alt={employee.fullName}
                                                    className="w-full h-full object-cover"
                                                  />
                                                ) : (
                                                  employee.fullName.charAt(0).toUpperCase()
                                                )}
                                              </div>
                                              <div>
                                                <div className="font-medium text-slate-700 text-sm">{employee.fullName}</div>
                                                <div className="text-xs text-slate-500">{employee.jobTitle || employee.role}</div>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                                employee.role === Role.ADMIN ? 'bg-purple-100 text-purple-800' :
                                                employee.role === Role.DIRECTOR ? 'bg-blue-100 text-blue-800' :
                                                employee.role === Role.DEPARTMENT_LEADER ? 'bg-red-100 text-red-800' :
                                                'bg-gray-100 text-gray-800'
                                              }`}>
                                                {employee.role.replace('_', ' ')}
                                              </span>
                                              <button
                                                onClick={() => navigate(`/profile/${employee.id}`)}
                                                className="p-1 text-slate-400 hover:text-slate-600"
                                                title="View Profile"
                                              >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                              </button>
                                              {isAdmin && (
                                                <button
                                                  onClick={() => handleAssignEmployee(employee)}
                                                  className="p-1 text-gray-400 hover:text-primary"
                                                  title="Manage Departments"
                                                >
                                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                  </svg>
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Unassigned Departments Section */}
                {getUnassignedDepartments().length > 0 && (
                  <div className="border border-amber-200 rounded-lg overflow-hidden mt-4">
                    <div className="p-3 bg-amber-50">
                      <div className="flex items-center gap-2 text-amber-800">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="font-semibold">Unassigned Departments</span>
                        <span className="text-sm">({getUnassignedDepartments().length})</span>
                      </div>
                    </div>
                    <div className="p-3 space-y-2">
                      {getUnassignedDepartments().map((department) => (
                        <div
                          key={department.id}
                          className="flex items-center justify-between p-2 bg-amber-25 border border-amber-100 rounded"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center text-white font-bold text-xs">
                              {department.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-slate-700">{department.name}</span>
                          </div>
                          <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded">
                            Needs Division Assignment
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
