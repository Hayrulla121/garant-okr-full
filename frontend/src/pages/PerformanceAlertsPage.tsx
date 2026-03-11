import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { evaluationApi } from '../services/api';
import { EmployeeEvaluationSummary, DisciplinaryStatus } from '../types/evaluation';
import DisciplinaryBadge from '../components/DisciplinaryBadge';
import { useLanguage } from '../i18n';

const STATUS_ORDER: DisciplinaryStatus[] = ['TERMINATION_RISK', 'FINE', 'WARNING', 'WATCH', 'NONE'];

const rowHighlight: Record<string, string> = {
  TERMINATION_RISK: 'bg-red-50 border-l-4 border-red-500',
  FINE: 'bg-orange-50 border-l-4 border-orange-400',
  WARNING: 'bg-yellow-50 border-l-4 border-yellow-400',
  WATCH: 'bg-amber-50 border-l-4 border-amber-300',
  NONE: '',
};

export default function PerformanceAlertsPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [data, setData] = useState<EmployeeEvaluationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await evaluationApi.getAtRisk();
      setData(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || t.failedToLoadPerformanceAlerts);
    } finally {
      setLoading(false);
    }
  };

  const filtered = data.filter(
    (d) => filterStatus === 'ALL' || d.disciplinaryStatus === filterStatus
  );

  const counts = {
    TERMINATION_RISK: data.filter((d) => d.disciplinaryStatus === 'TERMINATION_RISK').length,
    FINE: data.filter((d) => d.disciplinaryStatus === 'FINE').length,
    WARNING: data.filter((d) => d.disciplinaryStatus === 'WARNING').length,
    WATCH: data.filter((d) => d.disciplinaryStatus === 'WATCH').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-red-50 to-orange-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-500 mx-auto" />
          <p className="mt-4 text-slate-700 font-medium">{t.loadingPerformanceAlerts}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-orange-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-3 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t.backToDashboard}
          </button>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{t.performanceAlertsTitle}</h1>
              <p className="text-slate-500 text-sm">{t.employeesWithBelowExpectations}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xl leading-none">&times;</button>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {([
            { key: 'TERMINATION_RISK', label: t.terminationRisk, color: 'red' },
            { key: 'FINE', label: t.finedStatus, color: 'orange' },
            { key: 'WARNING', label: t.warningStatus, color: 'amber' },
            { key: 'WATCH', label: t.underWatch, color: 'yellow' },
          ] as const).map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(filterStatus === key ? 'ALL' : key)}
              className={`p-4 rounded-xl shadow border-2 transition-all text-left ${
                filterStatus === key
                  ? `border-${color}-500 bg-${color}-100`
                  : `border-${color}-200 bg-white hover:border-${color}-300 hover:bg-${color}-50`
              }`}
            >
              <div className={`text-2xl font-bold ${color === 'red' ? 'text-red-700' : color === 'orange' ? 'text-orange-700' : color === 'amber' ? 'text-amber-700' : 'text-yellow-700'}`}>
                {counts[key]}
              </div>
              <div className="text-sm text-slate-600">{label}</div>
            </button>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-slate-600">{t.filterByStatus}</span>
          {(['ALL', 'TERMINATION_RISK', 'FINE', 'WARNING', 'WATCH'] as const).map((s) => {
            const statusLabels: Record<string, string> = {
              TERMINATION_RISK: t.terminationRisk,
              FINE: t.finedStatus,
              WARNING: t.warningStatus,
              WATCH: t.underWatch,
            };
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filterStatus === s
                    ? 'bg-slate-800 text-white shadow'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s === 'ALL' ? `${t.allAtRisk} (${data.length})` : statusLabels[s]}
              </button>
            );
          })}
          {filterStatus !== 'ALL' && (
            <span className="text-sm text-slate-500 ml-auto">
              {t.showing} {filtered.length} {t.of} {data.length}
            </span>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mb-3 flex justify-center">
                <svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-600 mb-1">{t.noPerformanceAlerts}</h3>
              <p className="text-slate-400 text-sm">{t.allEmployeesGoodStanding}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{t.employee}</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">{t.totalEvals}</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">{t.belowExpectations}</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">{t.disciplinaryStatus}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{t.latestEvaluationsCol}</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">{t.action}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <tr key={item.userId} className={`hover:bg-slate-50 ${rowHighlight[item.disciplinaryStatus] || ''}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {item.userFullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">{item.userFullName}</div>
                          <div className="text-xs text-slate-500">
                            {item.belowExpectationsCount} {item.belowExpectationsCount === 1 ? t.belowExpectationsEvaluation : t.belowExpectationsEvaluations}
                            {' — '}
                            {item.disciplinaryStatus === 'WATCH' ? t.disciplinaryDescWatch
                              : item.disciplinaryStatus === 'WARNING' ? t.disciplinaryDescWarning
                              : item.disciplinaryStatus === 'FINE' ? t.disciplinaryDescFine
                              : t.disciplinaryDescTermination}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-lg font-bold text-slate-700">{item.totalEvaluations}</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {Array.from({ length: Math.min(item.totalEvaluations, 10) }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-4 h-4 rounded-full ${
                              i < item.belowExpectationsCount ? 'bg-red-500' : 'bg-emerald-400'
                            }`}
                            title={i < item.belowExpectationsCount ? t.belowExpectationsLabel : t.satisfactoryLabel}
                          />
                        ))}
                        {item.totalEvaluations > 10 && (
                          <span className="text-xs text-slate-400">+{item.totalEvaluations - 10}</span>
                        )}
                      </div>
                      <div className="text-sm font-bold text-red-600 mt-1">
                        {item.belowExpectationsCount} / {item.totalEvaluations}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <DisciplinaryBadge
                        status={item.disciplinaryStatus as DisciplinaryStatus}
                        count={item.belowExpectationsCount}
                        size="md"
                        showCount={false}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {item.recentEvaluations.slice(0, 3).map((ev) => (
                          <div
                            key={ev.id}
                            className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded"
                            title={ev.comment || t.noComment}
                          >
                            <span className="font-medium">{ev.evaluatorType}</span>
                            {ev.letterRating
                              ? ` · ${ev.letterRating}`
                              : ev.numericRating !== undefined
                              ? ` · ${(ev.numericRating * 100).toFixed(0)}%`
                              : ''}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => navigate(`/profile/${item.userId}`)}
                        className="px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg hover:bg-slate-700 transition-colors font-medium"
                      >
                        {t.viewProfile}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="mt-4 text-sm text-slate-400">
          {t.showing} {filtered.length} {t.showingEmployeesWithConcerns}
        </p>
      </div>
    </div>
  );
}
