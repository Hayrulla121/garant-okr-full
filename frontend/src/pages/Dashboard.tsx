import React, { useEffect, useState } from 'react';
import { Department, ScoreResult } from '../types/okr';
import { Role } from '../types/auth';
import { departmentApi, demoApi, evaluationApi, importApi } from '../services/api';
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
  const [importing, setImporting] = useState(false);
  const importFileRef = React.useRef<HTMLInputElement>(null);
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

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx')) {
      setError(t.onlyXlsxSupported);
      e.target.value = '';
      return;
    }

    setImporting(true);
    setError(null);
    try {
      const result = await importApi.importExcel(file);
      if (result.data.success) {
        alert(t.importSuccess + (result.data.warnings?.length
          ? '\n\n' + result.data.warnings.join('\n')
          : ''));
        await fetchDepartments();
      } else {
        setError(result.data.message || t.importFailed);
      }
    } catch (err: any) {
      console.error('Failed to import Excel', err);
      setError(err?.response?.data?.message || t.importFailed);
    } finally {
      setImporting(false);
      e.target.value = '';
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
      <aside className="w-64 bg-white border-r border-slate-200 shadow-xl flex flex-col h-screen transition-all duration-300">
        <div className="bg-white text-slate-800 p-6 shadow-md flex-shrink-0 flex flex-col justify-center items-center border-b border-slate-200">
          <img src="/logo_garantbank.png" alt="Garant Bank" className="h-12 w-auto object-contain mb-3 drop-shadow-sm transition-transform hover:scale-105" />
          <h2 className="text-sm font-bold tracking-wide text-slate-800">{t.controlPanel}</h2>
          <p className="text-primary text-xs font-bold uppercase tracking-widest mt-1 opacity-90">{t.departments}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-0 custom-scrollbar">
          {departments.map((dept) => {
            const displayScore = getDepartmentDisplayScore(dept);
            return (
              <button
                key={dept.id}
                onClick={() => selectDepartment(dept)}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 border-2 ${selectedDepartment?.id === dept.id
                  ? 'bg-gradient-to-r from-primary to-primary-dark text-white border-transparent shadow-lg shadow-primary/30'
                  : 'bg-transparent text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900 hover:border-slate-100'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm truncate flex-1">{dept.name}</h3>
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
            );
          })}

          {departments.length === 0 && (
            <div className="text-center py-6 text-slate-400">
              <p className="text-xs">{t.noDepartments}</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 space-y-2 flex-shrink-0 bg-white/95 backdrop-blur-sm">
          {user && (
            <div className="px-3 py-2.5 bg-slate-50 rounded-xl text-xs mb-3 border border-slate-200 shadow-inner">
              <div className="font-bold text-slate-800 text-sm mb-0.5">{user.fullName}</div>
              <div className="text-primary font-medium">{user.role}</div>
              {user.role === Role.EMPLOYEE && !user.canEditAssignedDepartments && (
                <div className="mt-2 px-2 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded-md text-[10px] font-bold uppercase tracking-wider">
                  {t.readOnlyMode}
                </div>
              )}
              {user.role === Role.EMPLOYEE && user.canEditAssignedDepartments && (
                <div className="mt-2 px-2 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-md text-[10px] font-bold uppercase tracking-wider">
                  {t.editEnabled}
                </div>
              )}
            </div>
          )}

          {/* My Profile Link */}
          <button
            onClick={() => navigate(`/profile/${user?.id}`)}
            className="w-full px-2 py-1.5 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-red-900 text-white rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 shadow-sm"
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
              className="w-full px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
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
              className="w-full px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
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
              className="w-full px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
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
              className="w-full px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {t.performanceAlerts}
            </button>
          )}

          <button
            onClick={() => setShowSettings(true)}
            className="w-full px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
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
              className="flex-1 px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              {t.export}
            </button>
            {user?.role === Role.ADMIN && (
              <>
                <button
                  onClick={() => importFileRef.current?.click()}
                  disabled={importing}
                  className="flex-1 px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  {importing ? '...' : t.import}
                </button>
                <input
                  ref={importFileRef}
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={handleImportExcel}
                />
              </>
            )}
            {user?.role === Role.ADMIN && (
              <button
                onClick={handleLoadDemoData}
                className="flex-1 px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
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
            className="w-full px-2 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium shadow transition-colors flex items-center justify-center gap-1 pt-2 pb-2 mt-2"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {t.logout}
          </button>
        </div>
      </aside>

      {/* Main Content - Rest of the existing code */}
      <main className="flex-1 overflow-y-auto bg-slate-50 relative">
        <header className="bg-white/70 backdrop-blur-xl border-b border-slate-200/60 shadow-sm sticky top-0 z-20">
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
          <div className={`mx-6 mt-4 rounded-lg border-l-4 p-4 shadow-sm ${myEvalSummary.disciplinaryStatus === 'TERMINATION_RISK'
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div
                  className="lg:col-span-1 rounded-2xl shadow-lg p-6 border border-slate-100 relative overflow-hidden flex flex-col items-center justify-center transition-transform hover:scale-[1.01]"
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

                <div className="lg:col-span-2 bg-white rounded-2xl shadow-md p-6 border border-slate-100 transition-all hover:shadow-lg">
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

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-white rounded-2xl shadow-sm hover:shadow-md p-5 border border-slate-100 transition-all">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{t.departmentsLabel}</div>
                  <div className="text-3xl font-bold text-slate-800">{departments.length}</div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm hover:shadow-md p-5 border border-slate-100 transition-all">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{t.objectivesLabel}</div>
                  <div className="text-3xl font-bold text-slate-800">
                    {departments.reduce((sum, d) => sum + d.objectives.length, 0)}
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm hover:shadow-md p-5 border border-slate-100 transition-all">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{t.keyResultsLabel}</div>
                  <div className="text-3xl font-bold text-slate-800">
                    {departments.reduce((sum, d) => sum + d.objectives.reduce((s, o) => s + o.keyResults.length, 0), 0)}
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm hover:shadow-md p-5 border border-slate-100 transition-all">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{t.avgScore}</div>
                  <div className="text-3xl font-bold" style={{ color: overallScore.color }}>
                    {overallScore.score.toFixed(2)}
                  </div>
                </div>
              </div>

              {departments.length > 0 && (
                <div className="bg-white rounded-3xl shadow-md p-6 mt-6 border border-slate-100">
                  <h2 className="text-lg font-bold text-slate-800 mb-4 ml-2">{t.allDepartments}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {departments.map((dept) => {
                      const displayScore = getDepartmentDisplayScore(dept);
                      return (
                        <div
                          key={dept.id}
                          onClick={() => setModalDepartment(dept)}
                          className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col items-center justify-between"
                        >
                          <div className="text-center mb-4 w-full">
                            <h3 className="font-bold text-slate-800 text-sm truncate group-hover:text-primary transition-colors">
                              {dept.name}
                            </h3>
                            <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">
                              {dept.objectives.length} {t.objectives}
                              {dept.finalScore && <span className="ml-1.5 text-emerald-500"><svg className="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg></span>}
                            </p>
                          </div>
                          <Speedometer
                            score={displayScore || defaultScore}
                            size="sm"
                            compact={true}
                            showLabel={true}
                          />
                        </div>
                      );
                    })}
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
              <div className="mt-4 mb-6 flex justify-end">
                <div className="inline-flex rounded-xl p-1 bg-slate-200/50 shadow-inner">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all shadow-sm ${viewMode === 'list'
                      ? 'bg-white text-slate-800 shadow-md'
                      : 'bg-transparent text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    {t.listView}
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all shadow-sm ${viewMode === 'grid'
                      ? 'bg-white text-slate-800 shadow-md'
                      : 'bg-transparent text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {selectedDepartment.objectives.map((objective) => (
                    <div key={objective.id} className="bg-white rounded-3xl shadow-md hover:shadow-xl border border-slate-100 overflow-hidden transition-all duration-300">
                      <div className="bg-slate-900 p-5 border-b-4" style={{ borderColor: objective.score?.color || '#334155' }}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1 pr-4">
                            <h3 className="text-lg font-bold text-white tracking-tight">{objective.name}</h3>
                          </div>
                          <span className="bg-white/10 text-white text-xs px-3 py-1 rounded-full font-bold border border-white/20 whitespace-nowrap">
                            {t.weight}: {objective.weight}%
                          </span>
                        </div>
                      </div>

                      <div className="p-8 flex items-center justify-between bg-gradient-to-br from-white to-slate-50">
                        <div>
                          <p className="text-slate-500 font-semibold text-sm uppercase tracking-wider mb-2">
                            {t.keyResultsLabel}
                          </p>
                          <p className="text-3xl font-extrabold text-slate-800">
                            {objective.keyResults.length}
                          </p>
                        </div>
                        <div className="p-2 rounded-full bg-white shadow-inner">
                          <Speedometer
                            score={objective.score || { score: 0, level: 'не_соответствует', color: '#d9534f', percentage: 0 }}
                            size="md"
                            compact={true}
                          />
                        </div>
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
