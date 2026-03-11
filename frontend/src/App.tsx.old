import React, { useEffect, useState } from 'react';
import { Department, ScoreResult, ScoreLevel } from './types/okr';
import { departmentApi, demoApi, scoreLevelApi } from './services/api';
import Speedometer from './components/Speedometer';
import DepartmentCard from './components/DepartmentCard';
import SettingsModal from './components/SettingsModal';
import DepartmentModal from './components/DepartmentModal';
import OrgScoreChart from './components/OrgScoreChart';
import ObjectiveScoreChart from './components/ObjectiveScoreChart';
import LanguageSelector from './components/LanguageSelector';
import { useLanguage } from './i18n';

function App() {
  const { t } = useLanguage();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [modalDepartment, setModalDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [scoreLevels, setScoreLevels] = useState<ScoreLevel[]>([]);

  const fetchDepartments = async () => {
    try {
      const response = await departmentApi.getAll();
      setDepartments(response.data);
      setSelectedDepartment(currentSelected => {
        if (currentSelected) {
          const updatedDept = response.data.find(d => d.id === currentSelected.id);
          return updatedDept || currentSelected;
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
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8080/api'}/export/excel`, {
        method: 'GET',
      });

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

  const fetchScoreLevels = async () => {
    try {
      const response = await scoreLevelApi.getAll();
      const sorted = response.data.sort((a, b) => a.scoreValue - b.scoreValue);
      setScoreLevels(sorted);
    } catch (err) {
      console.error('Failed to fetch score levels:', err);
    }
  };

  const refreshAllData = () => {
    fetchDepartments();
    fetchScoreLevels();
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  const overallScore = React.useMemo((): ScoreResult => {
    const scores = departments
        .filter(d => d.score && d.score.score > 0)
        .map(d => d.score!.score);

    const defaultColor = '#d9534f';
    const defaultLevel = 'below';

    if (scores.length === 0) {
      return { score: 3, level: defaultLevel, color: defaultColor, percentage: 0 };
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

    const fallbackLevel: ScoreResult['level'] = avg >= 5 ? 'exceptional' :
        avg >= 4.75 ? 'very_good' :
            avg >= 4.5 ? 'good' :
                avg >= 4.25 ? 'meets' : 'below';
    const fallbackColors: Record<ScoreResult['level'], string> = {
      below: '#d9534f', meets: '#f0ad4e', good: '#5cb85c',
      very_good: '#28a745', exceptional: '#1e7b34'
    };

    return { score: avg, level: fallbackLevel, color: fallbackColors[fallbackLevel], percentage: ((avg - 3) / 2) * 100 };
  }, [departments, scoreLevels]);

  const defaultScore: ScoreResult = { score: 3, level: 'below', color: scoreLevels[0]?.color || '#d9534f', percentage: 0 };

  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-cyan-50 to-teal-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto"></div>
            <p className="mt-4 text-slate-700 font-medium">{t.loadingOKRTracker}</p>
          </div>
        </div>
    );
  }

  return (
      <div className="h-screen bg-gradient-to-br from-sky-50 via-cyan-50 to-teal-50 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-52 bg-white border-r border-slate-200 shadow-lg flex flex-col h-screen">
          <div className="bg-gradient-to-br from-primary to-cyan-600 text-white p-3 shadow-lg flex-shrink-0">
            <h2 className="text-sm font-bold">{t.controlPanel}</h2>
            <p className="text-cyan-100 text-xs opacity-80">{t.departments}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
            {departments.map((dept) => (
                <button
                    key={dept.id}
                    onClick={() => setSelectedDepartment(dept)}
                    className={`w-full text-left p-2 rounded-lg transition-all duration-200 ${
                        selectedDepartment?.id === dept.id
                            ? 'bg-gradient-to-r from-primary to-cyan-600 text-white shadow-md'
                            : 'bg-sky-50 hover:bg-sky-100 text-slate-700 border border-sky-200'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-xs truncate flex-1">{dept.name}</h3>
                    {dept.score && (
                        <span
                            className="text-xs font-bold ml-1"
                            style={{ color: selectedDepartment?.id === dept.id ? 'white' : dept.score.color }}
                        >
                          {dept.score.score.toFixed(2)}
                        </span>
                    )}
                  </div>
                </button>
            ))}

            {departments.length === 0 && (
                <div className="text-center py-6 text-slate-400">
                  <p className="text-2xl mb-1">📋</p>
                  <p className="text-xs">{t.noDepartments}</p>
                </div>
            )}
          </div>

          <div className="p-2 border-t border-slate-200 space-y-1.5 flex-shrink-0 bg-slate-50">
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
              <button
                  onClick={handleLoadDemoData}
                  className="flex-1 px-2 py-1.5 bg-secondary hover:bg-[#FACE68] text-white rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {t.demo}
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
            <div className="px-4 py-2 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-cyan-600 bg-clip-text text-transparent">
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
                          {departments.map((dept) => (
                              <div
                                  key={dept.id}
                                  onClick={() => setModalDepartment(dept)}
                                  className="bg-gradient-to-br from-sky-50 to-cyan-50 p-3 rounded-lg border border-sky-200 hover:border-primary hover:shadow-md transition-all duration-200 cursor-pointer group"
                              >
                                <div className="text-center mb-1">
                                  <h3 className="font-bold text-slate-800 text-xs truncate group-hover:text-primary transition-colors">
                                    {dept.name}
                                  </h3>
                                  <p className="text-xs text-slate-500">{dept.objectives.length} {t.objectives}</p>
                                </div>
                                <Speedometer
                                    score={dept.score || defaultScore}
                                    size="sm"
                                    compact={true}
                                    showLabel={true}
                                />
                              </div>
                          ))}
                        </div>
                      </div>
                  )}

                  {departments.length === 0 && (
                      <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200 text-center">
                        <div className="text-4xl mb-2">📊</div>
                        <h3 className="text-base font-semibold text-slate-600 mb-1">{t.noObjectivesYet}</h3>
                        <p className="text-slate-400 text-xs">{t.addObjectivesFromSettings}</p>
                      </div>
                  )}
                </>
            ) : (
                <>
                  <div className="mb-4">
                    <button
                        onClick={() => setSelectedDepartment(null)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg text-sm font-semibold hover:from-slate-700 hover:to-slate-800 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      {t.backToDashboard}
                    </button>
                  </div>

                  <div className="mb-4 flex justify-end">
                    <div className="inline-flex rounded-lg border border-slate-300 bg-white shadow-sm">
                      <button
                          onClick={() => setViewMode('list')}
                          className={`px-4 py-2 text-sm font-semibold rounded-l-lg transition-all ${
                              viewMode === 'list'
                                  ? 'bg-gradient-to-r from-primary to-cyan-600 text-white'
                                  : 'bg-white text-slate-700 hover:bg-sky-50'
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
                                  ? 'bg-gradient-to-r from-primary to-cyan-600 text-white'
                                  : 'bg-white text-slate-700 hover:bg-sky-50'
                          }`}
                      >
                        <svg className="w-4 h-4 inline mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                        </svg>
                        {t.gridView}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                    <div className="lg:col-span-1 bg-white rounded-xl shadow-lg p-5 border border-slate-200">
                      <h2 className="text-base font-bold text-slate-800 mb-4 text-center">{t.departmentScore}</h2>
                      <Speedometer score={selectedDepartment.score || defaultScore} size="md" />
                    </div>

                    <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-5 border border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-bold text-slate-800">{t.scoreSummary}</h2>
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="w-3 h-0.5 rounded" style={{ backgroundColor: selectedDepartment.score?.color || '#666' }}></span>
                            <span className="text-slate-500">{t.avgScore}: <span className="font-bold" style={{ color: selectedDepartment.score?.color || '#666' }}>{selectedDepartment.score?.score.toFixed(2) || '0.00'}</span></span>
                          </div>
                          <div className="text-slate-400">
                            {selectedDepartment.objectives.length} {t.objectives} | {selectedDepartment.objectives.reduce((sum, obj) => sum + obj.keyResults.length, 0)} {t.keyResultsLabel}
                          </div>
                        </div>
                      </div>
                      <ObjectiveScoreChart
                        objectives={selectedDepartment.objectives}
                        departmentScore={selectedDepartment.score || defaultScore}
                        height={160}
                      />
                    </div>
                  </div>

                  {selectedDepartment.objectives.length === 0 ? (
                      <div className="bg-white rounded-xl shadow-lg p-12 border border-slate-200 text-center">
                        <div className="text-5xl mb-3">🎯</div>
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
                              <div className="bg-gradient-to-r from-primary to-cyan-600 p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <h3 className="text-base font-bold text-white">{objective.name}</h3>
                                    <p className="text-cyan-100 text-xs mt-0.5">
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
                                    score={objective.score || { score: 3, level: 'below', color: '#d9534f', percentage: 0 }}
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
                  await fetchDepartments();
                  const response = await departmentApi.getAll();
                  const updatedDept = response.data.find(d => d.id === modalDepartment.id);
                  if (updatedDept) {
                    setModalDepartment(updatedDept);
                  }
                }}
            />
        )}
      </div>
  );
}

export default App;
