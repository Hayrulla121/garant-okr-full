import React, { useEffect, useState } from 'react';
import { Department, ScoreResult } from '../types/okr';
import { Role } from '../types/auth';
import { departmentApi, demoApi, evaluationApi } from '../services/api';
import Speedometer from '../components/Speedometer';
import DepartmentCard from '../components/DepartmentCard';
import SettingsModal from '../components/SettingsModal';
import DepartmentModal from '../components/DepartmentModal';
import DepartmentDetailView from '../components/DepartmentDetailView';
import OrgScoreChart from '../components/OrgScoreChart';
import ObjectiveScoreChart from '../components/ObjectiveScoreChart';
import LanguageSelector from '../components/LanguageSelector';
import DisciplinaryBadge from '../components/DisciplinaryBadge';
import { useLanguage } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useScoreLevels } from '../contexts/ScoreLevelContext';
import { EmployeeEvaluationSummary, DisciplinaryStatus } from '../types/evaluation';

function Dashboard() {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { scoreLevels } = useScoreLevels();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [modalDepartment, setModalDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [myEvalSummary, setMyEvalSummary] = useState<EmployeeEvaluationSummary | null>(null);

  const selectDepartment = (dept: Department | null) => {
    setSelectedDepartment(dept);
    if (dept) {
      setSearchParams({ dept: String(dept.id) }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await departmentApi.getAll();
      setDepartments(response.data);
      // Only update selectedDepartment if it actually changed (compare by JSON)
      setSelectedDepartment(currentSelected => {
        // On first load, restore from URL
        if (!currentSelected) {
          const deptIdParam = searchParams.get('dept');
          if (deptIdParam) {
            const restored = response.data.find(d => String(d.id) === deptIdParam);
            if (restored) return restored;
          }
          return currentSelected;
        }
        if (currentSelected) {
          const updatedDept = response.data.find(d => d.id === currentSelected.id);
          if (updatedDept) {
            // Only update if data actually changed to prevent unnecessary re-renders
            const currentJson = JSON.stringify(currentSelected);
            const updatedJson = JSON.stringify(updatedDept);
            return currentJson === updatedJson ? currentSelected : updatedDept;
          }
          return currentSelected;
        }
        return currentSelected;
      });
      setError(null);
    } catch (err) {
      setError(t.failedToLoadDepartments);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8080/api'}/export/excel`);

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'okr_export.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to export Excel', err);
      setError(t.failedToExportExcel);
    }
  };

  const handleLoadDemoData = async () => {
    if (!window.confirm(t.confirmLoadDemoData)) {
      return;
    }

    try {
      const response = await demoApi.loadDemoData();
      setDepartments(response.data);
      alert(t.demoDataLoaded);
    } catch (err) {
      console.error('Failed to load demo data:', err);
      setError(t.failedToLoadDemoData);
    }
  };

  const refreshAllData = () => {
    fetchDepartments();
  };

  useEffect(() => {
    fetchDepartments();
    // Fetch current user's disciplinary summary
    if (user?.id) {
      evaluationApi.getEmployeeSummary(user.id)
        .then(res => setMyEvalSummary(res.data))
        .catch(() => setMyEvalSummary(null));
    }
  }, []);

  // Helper to get the best available score for a department (finalScore if available, otherwise OKR score)
  const getDepartmentDisplayScore = (dept: Department): ScoreResult | undefined => {
    return dept.finalScore || dept.score;
  };

  const overallScore = React.useMemo((): ScoreResult => {
    // Use finalScore when available (has all evaluations), otherwise fall back to OKR score
    const scores = departments
        .filter(d => getDepartmentDisplayScore(d) && getDepartmentDisplayScore(d)!.score > 0)
        .map(d => getDepartmentDisplayScore(d)!.score);

    const defaultColor = '#d9534f';
    const defaultLevel = 'не_соответствует';

    if (scores.length === 0) {
      return { score: 0, level: defaultLevel, color: defaultColor, percentage: 0 };
    }

    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

    let level = defaultLevel;
    let color = defaultColor;

    if (scoreLevels.length > 0) {
      const minScore = scoreLevels[0].scoreValue;
      const maxScore = scoreLevels[scoreLevels.length - 1].scoreValue;

      for (let i = scoreLevels.length - 1; i >= 0; i--) {
        if (avg >= scoreLevels[i].scoreValue) {
          level = scoreLevels[i].name.toLowerCase().replace(/\s+/g, '_');
          color = scoreLevels[i].color;
          break;
        }
      }

      const percentage = ((avg - minScore) / (maxScore - minScore)) * 100;
      return { score: avg, level: level as ScoreResult['level'], color, percentage: Math.max(0, Math.min(100, percentage)) };
    }

    const fallbackLevel: ScoreResult['level'] = avg >= 0.98 ? 'исключительно' :
        avg >= 0.86 ? 'превышает_ожидания' :
            avg >= 0.51 ? 'на_уровне_ожиданий' :
                avg >= 0.31 ? 'ниже_ожиданий' : 'не_соответствует';
    const fallbackColors: Record<string, string> = {
      'не_соответствует': '#d9534f', 'ниже_ожиданий': '#f0ad4e', 'на_уровне_ожиданий': '#5cb85c',
      'превышает_ожидания': '#28a745', 'исключительно': '#1e7b34'
    };

    return { score: avg, level: fallbackLevel, color: fallbackColors[fallbackLevel] || '#d9534f', percentage: (avg / 1.0) * 100 };
  }, [departments, scoreLevels]);

  const defaultScore: ScoreResult = { score: 0, level: 'не_соответствует', color: scoreLevels[0]?.color || '#d9534f', percentage: 0 };

  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto"></div>
            <p className="mt-4 text-slate-700 font-medium">{t.loadingOKRTracker}</p>
          </div>
        </div>
    );
  }

  return (
      <div className="h-screen bg-gray-50 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-52 bg-white border-r border-slate-200 shadow-lg flex flex-col h-screen">
          <div className="bg-primary text-white p-3 shadow-lg flex-shrink-0">
            <img src="/logo_garantbank.png" alt="Garant Bank" className="h-12 mb-2 brightness-0 invert" />
            <h2 className="text-sm font-bold">{t.controlPanel}</h2>
            <p className="text-red-100 text-xs opacity-80">{t.departments}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
            {departments.map((dept) => {
                const displayScore = getDepartmentDisplayScore(dept);
                return (
                <button
                    key={dept.id}
                    onClick={() => selectDepartment(dept)}
                    className={`w-full text-left p-2 rounded-lg transition-all duration-200 ${
                        selectedDepartment?.id === dept.id
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-gray-50 hover:bg-gray-100 text-slate-700 border border-gray-200'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-xs truncate flex-1">{dept.name}</h3>
                    {displayScore && (
                        <span
                            className="text-xs font-bold ml-1"
                            style={{ color: selectedDepartment?.id === dept.id ? 'white' : displayScore.color }}
                        >
                          {displayScore.score.toFixed(2)}
                        </span>
                    )}
                  </div>
                  {dept.finalScore && (
                      <div className="text-xs opacity-75 mt-0.5">{t.evaluated}</div>
                  )}
                </button>
            );})}

            {departments.length === 0 && (
                <div className="text-center py-6 text-slate-400">
                  <p className="text-xs">{t.noDepartments}</p>
                </div>
            )}
          </div>

          <div className="p-2 border-t border-slate-200 space-y-1.5 flex-shrink-0 bg-slate-50">
            {user && (
                <div className="px-2 py-1.5 bg-gray-50 rounded text-xs mb-1.5">
                  <div className="font-semibold text-slate-700">{user.fullName}</div>
                  <div className="text-slate-500">{user.role}</div>
                  {user.role === Role.EMPLOYEE && !user.canEditAssignedDepartments && (
                    <div className="mt-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium">
                      {t.readOnlyMode}
                    </div>
                  )}
                  {user.role === Role.EMPLOYEE && user.canEditAssignedDepartments && (
                    <div className="mt-1 px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-medium">
                      {t.editEnabled}
                    </div>
                  )}
                </div>
            )}

            {/* My Profile Link */}
            <button
                onClick={() => navigate(`/profile/${user?.id}`)}
                className="w-full px-2 py-1.5 bg-primary hover:bg-primary-dark text-white rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {t.myProfile}
            </button>

            {/* User Management Link (Admin Only) */}
            {user?.role === Role.ADMIN && (
              <button
                  onClick={() => navigate('/users')}
                  className="w-full px-2 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                {t.userManagement}
              </button>
            )}

            {/* Team Overview Link (Admin and Director) */}
            {(user?.role === Role.ADMIN || user?.role === Role.DIRECTOR) && (
              <button
                  onClick={() => navigate('/team-overview')}
                  className="w-full px-2 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {t.teamOverview}
              </button>
            )}

            {/* Organization Structure Link (Admin and Director) */}
            {(user?.role === Role.ADMIN || user?.role === Role.DIRECTOR) && (
              <button
                  onClick={() => navigate('/organization')}
                  className="w-full px-2 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {t.organization}
              </button>
            )}

            {/* Performance Alerts Link (Admin, Director, HR) */}
            {(user?.role === Role.ADMIN || user?.role === Role.DIRECTOR || user?.role === Role.HR) && (
              <button
                  onClick={() => navigate('/performance-alerts')}
                  className="w-full px-2 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {t.performanceAlerts}
              </button>
            )}

            <button
                onClick={() => setShowSettings(true)}
                className="w-full px-2 py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {t.settings}
            </button>
            <div className="flex gap-1.5">
              <button
                  onClick={handleExportExcel}
                  className="flex-1 px-2 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                {t.export}
              </button>
              {user?.role === Role.ADMIN && (
                <button
                    onClick={handleLoadDemoData}
                    className="flex-1 px-2 py-1.5 bg-secondary hover:bg-gray-400 text-white rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  {t.demo}
                </button>
              )}
            </div>
            <button
                onClick={logout}
                className="w-full px-2 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {t.logout}
            </button>
          </div>
        </aside>

        {/* Main Content - Rest of the existing code */}
        <main className="flex-1 overflow-y-auto">
          <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
            <div className="px-4 py-2 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-primary">
                  {t.appTitle}
                </h1>
                <p className="text-slate-500 text-xs">
                  {selectedDepartment
                      ? `${selectedDepartment.name} ${t.departmentDetails}`
                      : t.organizationOverview
                  }
                </p>
              </div>
              <div className="flex items-center gap-3">
                <LanguageSelector />
                <div className="text-right text-xs text-slate-400">
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            </div>
          </header>

          {error && (
              <div className="mx-6 mt-4 bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded text-sm">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              </div>
          )}

          {/* Disciplinary Warning Banner — visible to the employee themselves */}
          {myEvalSummary && myEvalSummary.disciplinaryStatus !== 'NONE' && (
            <div className={`mx-6 mt-4 rounded-lg border-l-4 p-4 shadow-sm ${
              myEvalSummary.disciplinaryStatus === 'TERMINATION_RISK'
                ? 'bg-red-50 border-red-600'
                : myEvalSummary.disciplinaryStatus === 'FINE'
                ? 'bg-orange-50 border-orange-500'
                : myEvalSummary.disciplinaryStatus === 'WARNING'
                ? 'bg-amber-50 border-amber-500'
                : 'bg-yellow-50 border-yellow-400'
            }`}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <svg className="w-6 h-6 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-800 text-sm">
                      {myEvalSummary.disciplinaryStatus === 'TERMINATION_RISK'
                        ? t.atRiskOfTermination
                        : myEvalSummary.disciplinaryStatus === 'FINE'
                        ? t.financialPenaltyApplied
                        : myEvalSummary.disciplinaryStatus === 'WARNING'
                        ? t.formalWarningIssued
                        : t.performanceBeingMonitored}
                    </span>
                    <DisciplinaryBadge
                      status={myEvalSummary.disciplinaryStatus as DisciplinaryStatus}
                      count={myEvalSummary.belowExpectationsCount}
                      size="sm"
                    />
                  </div>
                  <p className="text-sm text-slate-600">
                    {myEvalSummary.belowExpectationsCount} {myEvalSummary.belowExpectationsCount === 1 ? t.belowExpectationsEvaluation : t.belowExpectationsEvaluations}
                    {' — '}
                    {myEvalSummary.disciplinaryStatus === 'WATCH' ? t.disciplinaryDescWatch
                      : myEvalSummary.disciplinaryStatus === 'WARNING' ? t.disciplinaryDescWarning
                      : myEvalSummary.disciplinaryStatus === 'FINE' ? t.disciplinaryDescFine
                      : t.disciplinaryDescTermination}
                  </p>
                  <button
                    onClick={() => navigate(`/profile/${user?.id}`)}
                    className="mt-2 text-xs font-semibold text-primary hover:underline"
                  >
                    {t.viewFullPerformanceDetails} &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 space-y-4">
            {!selectedDepartment ? (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div
                        className="lg:col-span-1 rounded-xl shadow-lg p-4 border-2 relative overflow-hidden"
                        style={{
                          background: `linear-gradient(135deg, #ffffff 0%, ${overallScore.color}08 100%)`,
                          borderColor: `${overallScore.color}40`,
                        }}
                    >
                      <div
                          className="absolute inset-0 opacity-30"
                          style={{
                            background: `radial-gradient(circle at 50% 70%, ${overallScore.color}60 0%, transparent 50%)`,
                          }}
                      />
                      <h2 className="text-sm font-bold text-slate-700 mb-2 text-center relative z-10">
                        {t.organizationScore}
                      </h2>
                      <div className="flex justify-center relative z-10">
                        <Speedometer score={overallScore} size="md" glow={true} compact={true} />
                      </div>
                    </div>

                    <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-4 border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <h2 className="text-sm font-bold text-slate-800">{t.organizationScoreBreakdown}</h2>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="w-3 h-0.5 rounded" style={{ backgroundColor: overallScore.color }}></span>
                          <span>{t.orgAverage}</span>
                        </div>
                      </div>
                      <OrgScoreChart departments={departments} overallScore={overallScore} height={180} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white rounded-lg shadow p-3 border border-slate-200">
                      <div className="text-xs text-slate-500">{t.departmentsLabel}</div>
                      <div className="text-2xl font-bold text-slate-800">{departments.length}</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-3 border border-slate-200">
                      <div className="text-xs text-slate-500">{t.objectivesLabel}</div>
                      <div className="text-2xl font-bold text-slate-800">
                        {departments.reduce((sum, d) => sum + d.objectives.length, 0)}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-3 border border-slate-200">
                      <div className="text-xs text-slate-500">{t.keyResultsLabel}</div>
                      <div className="text-2xl font-bold text-slate-800">
                        {departments.reduce((sum, d) => sum + d.objectives.reduce((s, o) => s + o.keyResults.length, 0), 0)}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-3 border border-slate-200">
                      <div className="text-xs text-slate-500">{t.avgScore}</div>
                      <div className="text-2xl font-bold" style={{ color: overallScore.color }}>
                        {overallScore.score.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {departments.length > 0 && (
                      <div className="bg-white rounded-xl shadow-lg p-4 border border-slate-200">
                        <h2 className="text-sm font-bold text-slate-800 mb-3">{t.allDepartments}</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                          {departments.map((dept) => {
                              const displayScore = getDepartmentDisplayScore(dept);
                              return (
                              <div
                                  key={dept.id}
                                  onClick={() => setModalDepartment(dept)}
                                  className="bg-gray-50 p-3 rounded-lg border border-gray-200 hover:border-primary hover:shadow-md transition-all duration-200 cursor-pointer group"
                              >
                                <div className="text-center mb-1">
                                  <h3 className="font-bold text-slate-800 text-xs truncate group-hover:text-primary transition-colors">
                                    {dept.name}
                                  </h3>
                                  <p className="text-xs text-slate-500">
                                    {dept.objectives.length} {t.objectives}
                                    {dept.finalScore && <span className="ml-1 text-green-600"><svg className="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></span>}
                                  </p>
                                </div>
                                <Speedometer
                                    score={displayScore || defaultScore}
                                    size="sm"
                                    compact={true}
                                    showLabel={true}
                                />
                              </div>
                          );})}
                        </div>
                      </div>
                  )}

                  {departments.length === 0 && (
                      <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200 text-center">
                        <svg className="w-10 h-10 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <h3 className="text-base font-semibold text-slate-600 mb-1">{t.noObjectivesYet}</h3>
                        <p className="text-slate-400 text-xs">{t.addObjectivesFromSettings}</p>
                      </div>
                  )}
                </>
            ) : (
                <>
                  <div className="mb-4">
                    <button
                        onClick={() => selectDepartment(null)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg text-sm font-semibold hover:from-slate-700 hover:to-slate-800 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      {t.backToDashboard}
                    </button>
                  </div>

                  {/* Department Detail View with Multi-Speedometer and Evaluation Panel */}
                  <DepartmentDetailView
                    department={selectedDepartment}
                    onUpdate={refreshAllData}
                  />

                  {/* ── Leader Objectives Section ─────────────────────────── */}
                  {selectedDepartment.leaderObjectives && selectedDepartment.leaderObjectives.length > 0 && (
                    <div className="mt-6 mb-2">
                      {/* Leader header */}
                      <div className="bg-gradient-to-r from-red-100 to-gray-100 rounded-xl p-4 mb-3 shadow-md flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center">
                            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-primary text-xs font-semibold uppercase tracking-wide">{t.leaderPersonalGoals}</p>
                            <h3 className="text-slate-800 font-bold text-base">{selectedDepartment.leaderName}</h3>
                          </div>
                        </div>
                        {selectedDepartment.leaderScore && (
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-primary text-xs">{t.leaderScore}</p>
                              <p className="text-slate-800 text-2xl font-bold">{selectedDepartment.leaderScore.score.toFixed(2)}</p>
                            </div>
                            <Speedometer
                              score={selectedDepartment.leaderScore}
                              size="sm"
                              compact={true}
                            />
                          </div>
                        )}
                      </div>

                      {/* Leader's objective cards */}
                      <div className="space-y-4">
                        {selectedDepartment.leaderObjectives.map((objective) => (
                          <DepartmentCard
                            key={objective.id}
                            department={selectedDepartment}
                            objective={objective}
                            onUpdate={refreshAllData}
                            canEditOverride={
                              user?.role === Role.ADMIN ||
                              user?.role === Role.DIRECTOR ||
                              user?.id === selectedDepartment.leaderId
                            }
                          />
                        ))}
                      </div>

                      {/* Colorful separator */}
                      <div className="relative my-6 text-center">
                        <div className="h-0.5 bg-gradient-to-r from-red-400 via-yellow-400 via-green-400 via-gray-400 to-red-400 rounded-full" />
                        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-50 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                          {t.departmentGoals}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* View Mode Toggle */}
                  <div className="mt-2 mb-4 flex justify-end">
                    <div className="inline-flex rounded-lg border border-slate-300 bg-white shadow-sm">
                      <button
                          onClick={() => setViewMode('list')}
                          className={`px-4 py-2 text-sm font-semibold rounded-l-lg transition-all ${
                              viewMode === 'list'
                                  ? 'bg-primary text-white'
                                  : 'bg-white text-slate-700 hover:bg-gray-50'
                          }`}
                      >
                        <svg className="w-4 h-4 inline mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        {t.listView}
                      </button>
                      <button
                          onClick={() => setViewMode('grid')}
                          className={`px-4 py-2 text-sm font-semibold rounded-r-lg transition-all ${
                              viewMode === 'grid'
                                  ? 'bg-primary text-white'
                                  : 'bg-white text-slate-700 hover:bg-gray-50'
                          }`}
                      >
                        <svg className="w-4 h-4 inline mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                        </svg>
                        {t.gridView}
                      </button>
                    </div>
                  </div>

                  {/* ── Department Objectives Section ─────────────────────── */}
                  {selectedDepartment.objectives.length === 0 ? (
                      <div className="bg-white rounded-xl shadow-lg p-12 border border-slate-200 text-center">
                        <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <h3 className="text-lg font-semibold text-slate-600 mb-1.5">{t.noObjectivesYet}</h3>
                        <p className="text-slate-400 text-sm">{t.addObjectivesFromSettings}</p>
                      </div>
                  ) : viewMode === 'list' ? (
                      <div className="space-y-4">
                        {selectedDepartment.objectives.map((objective) => (
                            <DepartmentCard
                                key={objective.id}
                                department={selectedDepartment}
                                objective={objective}
                                onUpdate={refreshAllData}
                            />
                        ))}
                      </div>
                  ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {selectedDepartment.objectives.map((objective) => (
                            <div key={objective.id} className="bg-white rounded-xl shadow-lg border-2 border-slate-200 overflow-hidden">
                              <div className="bg-primary p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <h3 className="text-base font-bold text-white">{objective.name}</h3>
                                    <p className="text-red-100 text-xs mt-0.5">
                                      {objective.keyResults.length} {t.keyResult}{objective.keyResults.length !== 1 ? 's' : ''}
                                    </p>
                                  </div>
                                  <span className="bg-white/30 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                                    {t.weight}: {objective.weight}%
                                  </span>
                                </div>
                              </div>

                              <div className="p-6 flex justify-center">
                                <Speedometer
                                    score={objective.score || { score: 0, level: 'не_соответствует', color: '#d9534f', percentage: 0 }}
                                    size="md"
                                />
                              </div>
                            </div>
                        ))}
                      </div>
                  )}
                </>
            )}
          </div>
        </main>

        {showSettings && (
            <SettingsModal
                departments={departments}
                onClose={() => setShowSettings(false)}
                onUpdate={refreshAllData}
            />
        )}

        {modalDepartment && (
            <DepartmentModal
                department={modalDepartment}
                onClose={() => setModalDepartment(null)}
                onUpdate={async () => {
                  const response = await departmentApi.getAll();
                  setDepartments(response.data);
                  setModalDepartment(prev => {
                    if (!prev) return prev;
                    const updatedDept = response.data.find(d => d.id === prev.id);
                    return updatedDept || prev;
                  });
                }}
            />
        )}
      </div>
  );
}

export default Dashboard;
