import React, { useState, useEffect, useMemo } from 'react';
import { Department, Objective, MetricType, Division } from '../types/okr';
import { departmentApi, objectiveApi, keyResultApi, divisionApi, platformSettingsApi, SERVER_BASE } from '../services/api';
import ScoreLevelsManager from './ScoreLevelsManager';
import { useLanguage } from '../i18n';
import { useScoreLevels } from '../contexts/ScoreLevelContext';
import { useAuth } from '../contexts/AuthContext';
import { useWatermark } from '../contexts/WatermarkContext';
import { Role } from '../types/auth';

// ── Shared icons & styles (top-level so they never remount) ────────────────

const inputCls = 'px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary bg-white';
const btnPrimary = 'px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors';

const PlusIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
  </svg>
);
const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
export const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

// ── KrAddForm — top-level component so it NEVER remounts on parent re-renders

interface KrAddFormProps {
  objId: string;
  objName: string;
  existingKrWeightTotal: number;  // sum of weights of existing KRs in this objective
  scoreLevels: import('../types/okr').ScoreLevel[];
  t: any;
  onCancel: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

const KrAddForm: React.FC<KrAddFormProps> = ({ objId, objName, existingKrWeightTotal, scoreLevels, t, onCancel, onSuccess, onError }) => {
  const [krName, setKrName] = useState('');
  const [krDesc, setKrDesc] = useState('');
  const [krMetricType, setKrMetricType] = useState<MetricType>('HIGHER_BETTER');
  const [krUnit, setKrUnit] = useState('');
  const [krWeight, setKrWeight] = useState('');
  const [showThresholds, setShowThresholds] = useState(false);
  const [loading, setLoading] = useState(false);

  const weightNum = parseFloat(krWeight) || 0;
  const remaining = 100 - existingKrWeightTotal;
  const weightExceeds = weightNum > remaining;

  const initThresholds = () => {
    const init: Record<string, string> = {};
    scoreLevels.forEach((level, i) => {
      const inc = 100 / (scoreLevels.length - 1 || 1);
      init[level.name] = (i * inc).toFixed(0);
    });
    return init;
  };
  const [krThresholds, setKrThresholds] = useState<Record<string, string>>(initThresholds);

  const mapThresholds = () => {
    const sorted = [...scoreLevels].sort((a, b) => a.scoreValue - b.scoreValue);
    const vals = sorted.map(l => parseFloat(krThresholds[l.name] || '0'));
    const n = sorted.length;
    if (n >= 5) return { below: vals[0], meets: vals[1], good: vals[2], veryGood: vals[3], exceptional: vals[4] };
    if (n === 4) return { below: vals[0], meets: vals[1], good: vals[2], veryGood: vals[3], exceptional: vals[3] };
    if (n === 3) return { below: vals[0], meets: vals[1], good: vals[2], veryGood: vals[2], exceptional: vals[2] };
    if (n === 2) return { below: vals[0], meets: vals[1], good: vals[1], veryGood: vals[1], exceptional: vals[1] };
    const v = vals[0] || 0;
    return { below: v, meets: v, good: v, veryGood: v, exceptional: v };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!krName.trim() || weightExceeds) return;
    setLoading(true);
    try {
      await keyResultApi.create(objId, {
        name: krName, description: krDesc, metricType: krMetricType,
        unit: krUnit || undefined, weight: krWeight ? parseFloat(krWeight) : undefined,
        thresholds: mapThresholds(),
        actualValue: krMetricType === 'QUALITATIVE' ? 'E' : '0',
      });
      onSuccess();
    } catch {
      onError(t.failedToCreateKeyResult);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}
      className="mt-2 ml-4 bg-white border border-primary/30 rounded-xl p-4 space-y-3 shadow-sm">
      <p className="text-xs font-bold text-primary uppercase tracking-wide">New Key Result in {objName}</p>
      <input
        className={`${inputCls} w-full`}
        placeholder="Key result name *"
        value={krName}
        onChange={e => setKrName(e.target.value)}
        required
        autoFocus
      />
      <textarea
        className={`${inputCls} w-full`}
        placeholder="Description (optional)"
        value={krDesc}
        onChange={e => setKrDesc(e.target.value)}
        rows={2}
      />
      <div className="grid grid-cols-2 gap-2">
        <select className={inputCls} value={krMetricType} onChange={e => setKrMetricType(e.target.value as MetricType)}>
          <option value="HIGHER_BETTER">{t.higherIsBetter}</option>
          <option value="LOWER_BETTER">{t.lowerIsBetter}</option>
          <option value="QUALITATIVE">{t.qualitative} (A-E)</option>
        </select>
        {krMetricType !== 'QUALITATIVE'
          ? <input className={inputCls} placeholder={t.unitExample} value={krUnit} onChange={e => setKrUnit(e.target.value)} />
          : <div />
        }
      </div>
      <div>
        <input
          className={`${inputCls} w-full ${weightExceeds ? 'border-red-400 focus:ring-red-400' : ''}`}
          type="number"
          placeholder={t.weightPercent}
          min="0" max={remaining}
          value={krWeight}
          onChange={e => setKrWeight(e.target.value)}
        />
        <p className={`text-xs mt-1 ${weightExceeds ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
          {weightExceeds
            ? `${t.exceedsLimitExisting} ${existingKrWeightTotal}%, max: ${remaining}%`
            : `${t.existingKrsAvailable} ${existingKrWeightTotal}% · ${remaining}%`}
        </p>
      </div>

      {krMetricType !== 'QUALITATIVE' && (
        <div>
          <button type="button" onClick={() => setShowThresholds(v => !v)}
            className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 font-medium">
            <ChevronIcon open={showThresholds} />
            {showThresholds ? t.hideThresholds : t.setThresholds} {t.thresholdValues.toLowerCase()}
          </button>
          {showThresholds && (
            <div className="mt-2 bg-slate-50 rounded-lg p-3 border border-slate-200">
              <p className="text-xs text-slate-500 mb-2">{t.enterActualMetricValues}</p>
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${scoreLevels.length}, minmax(0, 1fr))` }}>
                {[...scoreLevels].sort((a, b) => a.scoreValue - b.scoreValue).map(level => (
                  <div key={level.name} className="flex flex-col">
                    <label className="text-xs font-semibold mb-1 truncate" style={{ color: level.color }} title={level.name}>
                      {level.name}
                    </label>
                    <input
                      type="number"
                      value={krThresholds[level.name] || ''}
                      onChange={e => setKrThresholds(prev => ({ ...prev, [level.name]: e.target.value }))}
                      className="px-2 py-1.5 border-2 rounded-lg text-sm focus:ring-1"
                      style={{ borderColor: level.color }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onCancel} className="px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg">
          {t.cancel}
        </button>
        <button type="submit" disabled={loading || weightExceeds} className={btnPrimary}>
          {loading ? t.creatingKr : t.addKeyResult}
        </button>
      </div>
    </form>
  );
};

// ── KrEditForm — top-level component for editing an existing KR ───────────────

interface KrEditFormProps {
  kr: import('../types/okr').KeyResult;
  objName: string;
  otherKrWeightTotal: number;  // sum of weights of sibling KRs
  scoreLevels: import('../types/okr').ScoreLevel[];
  t: any;
  onCancel: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

const KrEditForm: React.FC<KrEditFormProps> = ({ kr, objName, otherKrWeightTotal, scoreLevels, t, onCancel, onSuccess, onError }) => {
  const [name, setName] = useState(kr.name);
  const [desc, setDesc] = useState(kr.description || '');
  const [metricType, setMetricType] = useState<MetricType>(kr.metricType);
  const [unit, setUnit] = useState(kr.unit || '');
  const [weight, setWeight] = useState(String(kr.weight ?? ''));
  const [showThresholds, setShowThresholds] = useState(false);
  const [loading, setLoading] = useState(false);

  const initThresholds = () => ({
    [scoreLevels.length > 0 ? [...scoreLevels].sort((a, b) => a.scoreValue - b.scoreValue)[0]?.name ?? 'below' : 'below']: String(kr.thresholds?.below ?? ''),
    ...(() => {
      const sorted = [...scoreLevels].sort((a, b) => a.scoreValue - b.scoreValue);
      const names = ['below', 'meets', 'good', 'veryGood', 'exceptional'];
      const threshVals = [kr.thresholds?.below, kr.thresholds?.meets, kr.thresholds?.good, kr.thresholds?.veryGood, kr.thresholds?.exceptional];
      const result: Record<string, string> = {};
      sorted.forEach((level, i) => { result[level.name] = String(threshVals[Math.min(i, 4)] ?? ''); });
      return result;
    })(),
  });

  // simpler: just pre-fill threshold inputs from the 5 backend fields
  const initialThresholds = (): Record<string, string> => {
    const sorted = [...scoreLevels].sort((a, b) => a.scoreValue - b.scoreValue);
    const backendVals = [kr.thresholds?.below, kr.thresholds?.meets, kr.thresholds?.good, kr.thresholds?.veryGood, kr.thresholds?.exceptional];
    const result: Record<string, string> = {};
    sorted.forEach((level, i) => { result[level.name] = String(backendVals[Math.min(i, 4)] ?? 0); });
    return result;
  };
  const [thresholds, setThresholds] = useState<Record<string, string>>(initialThresholds);

  const weightNum = parseFloat(weight) || 0;
  const remaining = 100 - otherKrWeightTotal;
  const weightExceeds = weightNum > remaining;

  const mapThresholds = () => {
    const sorted = [...scoreLevels].sort((a, b) => a.scoreValue - b.scoreValue);
    const vals = sorted.map(l => parseFloat(thresholds[l.name] || '0'));
    const n = sorted.length;
    if (n >= 5) return { below: vals[0], meets: vals[1], good: vals[2], veryGood: vals[3], exceptional: vals[4] };
    if (n === 4) return { below: vals[0], meets: vals[1], good: vals[2], veryGood: vals[3], exceptional: vals[3] };
    if (n === 3) return { below: vals[0], meets: vals[1], good: vals[2], veryGood: vals[2], exceptional: vals[2] };
    if (n === 2) return { below: vals[0], meets: vals[1], good: vals[1], veryGood: vals[1], exceptional: vals[1] };
    const v = vals[0] || 0;
    return { below: v, meets: v, good: v, veryGood: v, exceptional: v };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || weightExceeds) return;
    setLoading(true);
    try {
      await keyResultApi.update(kr.id, {
        name, description: desc, metricType, unit: unit || undefined,
        weight: weight ? parseFloat(weight) : undefined,
        thresholds: mapThresholds(),
      } as any);
      onSuccess();
    } catch (err: any) {
      onError(err.response?.data?.message || t.failedToUpdateKr);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}
      className="mt-1 ml-4 bg-gray-50 border border-gray-300 rounded-xl p-4 space-y-3 shadow-sm">
      <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Edit Key Result — {objName}</p>
      <input className={`${inputCls} w-full`} placeholder="Key result name *" value={name}
        onChange={e => setName(e.target.value)} required autoFocus />
      <textarea className={`${inputCls} w-full`} placeholder="Description (optional)" value={desc}
        onChange={e => setDesc(e.target.value)} rows={2} />
      <div className="grid grid-cols-2 gap-2">
        <select className={inputCls} value={metricType} onChange={e => setMetricType(e.target.value as MetricType)}>
          <option value="HIGHER_BETTER">{t.higherIsBetter}</option>
          <option value="LOWER_BETTER">{t.lowerIsBetter}</option>
          <option value="QUALITATIVE">{t.qualitative} (A-E)</option>
        </select>
        {metricType !== 'QUALITATIVE'
          ? <input className={inputCls} placeholder={t.unitExample} value={unit} onChange={e => setUnit(e.target.value)} />
          : <div />}
      </div>
      <div>
        <input className={`${inputCls} w-full ${weightExceeds ? 'border-red-400 focus:ring-red-400' : ''}`}
          type="number" placeholder={t.weightPercent} min="0" max={remaining}
          value={weight} onChange={e => setWeight(e.target.value)} />
        <p className={`text-xs mt-1 ${weightExceeds ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
          {weightExceeds
            ? `${t.exceedsLimitOther} ${otherKrWeightTotal}%, max: ${remaining}%`
            : `${t.otherKrsAvailable} ${otherKrWeightTotal}% · ${remaining}%`}
        </p>
      </div>

      {metricType !== 'QUALITATIVE' && (
        <div>
          <button type="button" onClick={() => setShowThresholds(v => !v)}
            className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 font-medium">
            <ChevronIcon open={showThresholds} />
            {showThresholds ? t.hideThresholds : t.editThresholds} {t.thresholdValues.toLowerCase()}
          </button>
          {showThresholds && (
            <div className="mt-2 bg-white rounded-lg p-3 border border-slate-200">
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${scoreLevels.length}, minmax(0, 1fr))` }}>
                {[...scoreLevels].sort((a, b) => a.scoreValue - b.scoreValue).map(level => (
                  <div key={level.name} className="flex flex-col">
                    <label className="text-xs font-semibold mb-1 truncate" style={{ color: level.color }}>{level.name}</label>
                    <input type="number" value={thresholds[level.name] || ''}
                      onChange={e => setThresholds(prev => ({ ...prev, [level.name]: e.target.value }))}
                      className="px-2 py-1.5 border-2 rounded-lg text-sm" style={{ borderColor: level.color }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onCancel} className="px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg">{t.cancel}</button>
        <button type="submit" disabled={loading || weightExceeds} className={btnPrimary}>
          {loading ? t.savingChanges : t.saveChanges}
        </button>
      </div>
    </form>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

interface SettingsModalProps {
  departments: Department[];
  onClose: () => void;
  onUpdate: () => void;
}

type Tab = 'structure' | 'scoreLevels' | 'watermark';

// Which "add form" is open — keyed by a string like "div", "dept-{divId}", "obj-{deptId}", "kr-{objId}"
type OpenForm = string | null;

const SettingsModal: React.FC<SettingsModalProps> = ({ departments, onClose, onUpdate }) => {
  const { t } = useLanguage();
  const { scoreLevels } = useScoreLevels();
  const { user, canEditDepartment, hasRole, canEditScoreLevels, canCreateDepartment } = useAuth();
  const { settings: wm, updateSetting: wmUpdate, uploadImage: wmUploadImage } = useWatermark();
  const isAdmin = hasRole(Role.ADMIN);
  const isReadOnly = user?.role === Role.EMPLOYEE;

  const [activeTab, setActiveTab] = useState<Tab>('structure');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [divisions, setDivisions] = useState<Division[]>([]);

  // Which add-form is open
  const [openForm, setOpenForm] = useState<OpenForm>(null);
  // Which division/dept/objective rows are collapsed
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Form values — div / dept / obj levels only (KR state lives in KrAddForm)
  const [divName, setDivName] = useState('');
  const [deptName, setDeptName] = useState('');
  const [objName, setObjName] = useState('');
  const [objWeight, setObjWeight] = useState('');

  // Watermark state
  const [wmEnabled, setWmEnabled] = useState(wm.enabled);
  const [wmType, setWmType] = useState<'TEXT' | 'IMAGE'>(wm.type);
  const [wmText, setWmText] = useState(wm.text);
  const [wmOpacity, setWmOpacity] = useState(wm.opacity);
  const [wmSaving, setWmSaving] = useState(false);
  const [wmSuccess, setWmSuccess] = useState<string | null>(null);
  const [wmError, setWmError] = useState<string | null>(null);
  const [wmImagePreview, setWmImagePreview] = useState<string | null>(null);

  // Attachment requirement setting
  const [attachmentRequired, setAttachmentRequired] = useState(false);
  const [attachmentSaving, setAttachmentSaving] = useState(false);

  useEffect(() => {
    setWmEnabled(wm.enabled); setWmType(wm.type); setWmText(wm.text); setWmOpacity(wm.opacity);
  }, [wm]);

  const loadDivisions = async () => {
    try {
      const res = await divisionApi.getAll();
      setDivisions(res.data);
    } catch { /* non-critical */ }
  };

  useEffect(() => { loadDivisions(); }, []);

  // Load attachment requirement setting
  useEffect(() => {
    if (isAdmin) {
      platformSettingsApi.getAll().then(res => {
        const setting = res.data.find(s => s.settingKey === 'REQUIRE_ATTACHMENT_FOR_ACTUAL_VALUE');
        setAttachmentRequired(setting?.settingValue === 'true');
      }).catch(() => {});
    }
  }, [isAdmin]);

  const handleToggleAttachmentRequired = async () => {
    const newVal = !attachmentRequired;
    setAttachmentSaving(true);
    try {
      await platformSettingsApi.update('REQUIRE_ATTACHMENT_FOR_ACTUAL_VALUE', String(newVal), 'Whether file attachment is required when updating KR actual values');
      setAttachmentRequired(newVal);
    } catch {
      setError('Failed to update attachment setting');
    } finally {
      setAttachmentSaving(false);
    }
  };

  const toggleCollapse = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openAddForm = (key: string) => {
    setOpenForm(prev => prev === key ? null : key);
    setError(null);
    setSuccess(null);
    // Reset simple form fields when opening a new form
    setDivName(''); setDeptName(''); setObjName(''); setObjWeight('');
  };

  const flashSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCreateDivision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!divName.trim()) return;
    setLoading(true); setError(null);
    try {
      await divisionApi.create({ name: divName });
      setDivName('');
      setOpenForm(null);
      await loadDivisions();
      onUpdate();
      flashSuccess('Division created.');
    } catch { setError('Failed to create division.'); }
    finally { setLoading(false); }
  };

  const handleDeleteDivision = async (id: string, name: string) => {
    if (!window.confirm(`Delete division "${name}"? All its departments and data will also be deleted.`)) return;
    setLoading(true);
    try { await divisionApi.delete(id); await loadDivisions(); onUpdate(); }
    catch { setError('Failed to delete division.'); }
    finally { setLoading(false); }
  };

  const handleCreateDepartment = async (e: React.FormEvent, divisionId: string) => {
    e.preventDefault();
    if (!deptName.trim()) return;
    setLoading(true); setError(null);
    try {
      await departmentApi.create({ name: deptName, divisionId });
      setDeptName('');
      setOpenForm(null);
      onUpdate();
      flashSuccess('Department created.');
    } catch { setError(t.failedToCreateDepartment); }
    finally { setLoading(false); }
  };

  const handleDeleteDepartment = async (id: string) => {
    if (!window.confirm(t.confirmDeleteDepartment)) return;
    setLoading(true);
    try { await departmentApi.delete(id); onUpdate(); }
    catch { setError(t.failedToDeleteDepartment); }
    finally { setLoading(false); }
  };

  const handleCreateObjective = async (e: React.FormEvent, deptId: string) => {
    e.preventDefault();
    if (!objName.trim()) return;
    setLoading(true); setError(null);
    try {
      await objectiveApi.create(deptId, { name: objName, weight: objWeight ? parseFloat(objWeight) : undefined });
      setObjName(''); setObjWeight('');
      setOpenForm(null);
      onUpdate();
      flashSuccess('Objective created.');
    } catch { setError(t.failedToCreateObjective); }
    finally { setLoading(false); }
  };

  const handleCreateLeaderObjective = async (e: React.FormEvent, deptId: string) => {
    e.preventDefault();
    if (!objName.trim()) return;
    setLoading(true); setError(null);
    try {
      await objectiveApi.createLeaderObjective(deptId, { name: objName, weight: objWeight ? parseFloat(objWeight) : undefined } as any);
      setObjName(''); setObjWeight('');
      setOpenForm(null);
      onUpdate();
      flashSuccess('Leader objective created.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create leader objective.');
    }
    finally { setLoading(false); }
  };

  const handleDeleteObjective = async (id: string) => {
    if (!window.confirm(t.confirmDeleteObjective)) return;
    setLoading(true);
    try { await objectiveApi.delete(id); onUpdate(); }
    catch { setError(t.failedToDeleteObjective); }
    finally { setLoading(false); }
  };

  const handleDeleteKeyResult = async (id: string) => {
    if (!window.confirm(t.confirmDeleteKeyResult)) return;
    setLoading(true);
    try { await keyResultApi.delete(id); onUpdate(); }
    catch { setError(t.failedToDeleteKeyResult); }
    finally { setLoading(false); }
  };

  const handleSaveWatermark = async () => {
    setWmSaving(true); setWmError(null); setWmSuccess(null);
    try {
      await wmUpdate('WATERMARK_ENABLED', String(wmEnabled), 'Whether the UI watermark overlay is active');
      await wmUpdate('WATERMARK_TYPE', wmType, 'Watermark type: TEXT or IMAGE');
      await wmUpdate('WATERMARK_TEXT', wmText, 'Text to display as watermark');
      await wmUpdate('WATERMARK_OPACITY', String(wmOpacity), 'Watermark opacity (0.0–1.0)');
      setWmSuccess(t.watermarkSaved);
    } catch { setWmError(t.watermarkFailed); }
    finally { setWmSaving(false); }
  };

  const handleWatermarkImageUpload = async (file: File) => {
    setWmSaving(true); setWmError(null);
    try {
      const url = await wmUploadImage(file);
      setWmImagePreview(`${SERVER_BASE}${url}`);
      setWmSuccess(t.watermarkSaved);
    } catch { setWmError(t.watermarkImageFailed); }
    finally { setWmSaving(false); }
  };

  // ── Shared style shortcuts (reference top-level constants) ──────────────────
  const btnGhost = 'px-3 py-1.5 text-sm font-medium text-primary hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-1';
  const btnDanger = 'p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors';

  // ── Main structure tree ────────────────────────────────────────────────────

  // Build a map: divisionId → departments (from props)
  const deptsByDivision = useMemo(() => {
    const map: Record<string, Department[]> = {};
    departments.forEach(d => {
      const divId = d.division?.id || '__none__';
      if (!map[divId]) map[divId] = [];
      map[divId].push(d);
    });
    return map;
  }, [departments]);

  // Divisions that have no departments yet but exist in `divisions` state
  const allDivisionIds = new Set(divisions.map(d => d.id));
  // Departments with no division
  const orphanDepts = deptsByDivision['__none__'] || [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-dark text-white p-5 rounded-t-2xl flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold">{t.settings}</h2>
            <p className="text-red-100 text-xs mt-0.5">{t.manageOkrStructure}</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 px-5 flex-shrink-0">
          <div className="flex gap-1">
            {([
              { key: 'structure', label: '🏗 Structure' },
              { key: 'scoreLevels', label: t.scoreLevel },
              ...(isAdmin ? [{ key: 'watermark', label: t.watermark }] : []),
            ] as { key: Tab; label: string }[]).map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-semibold transition-all ${
                  activeTab === tab.key
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >{tab.label}</button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* Global feedback */}
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded text-sm flex justify-between">
              {error}
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
          )}
          {success && (
            <div className="mb-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 p-3 rounded text-sm">
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{success}
            </div>
          )}

          {/* ── STRUCTURE TAB ─────────────────────────────────────────── */}
          {activeTab === 'structure' && (
            <div className="space-y-1">

              {/* Legend */}
              <div className="flex items-center gap-4 text-xs text-slate-500 mb-4 bg-slate-50 rounded-lg px-4 py-2.5 border border-slate-200">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-purple-500 inline-block" />Division</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary inline-block" />Department</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500 inline-block" />Objective</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" />Key Result</span>
              </div>

              {/* Divisions */}
              {divisions.map(div => {
                const divDepts = deptsByDivision[div.id] || [];
                const isDivCollapsed = collapsed.has(`div-${div.id}`);

                return (
                  <div key={div.id} className="rounded-xl border border-purple-200 bg-purple-50 overflow-hidden mb-3">
                    {/* Division row */}
                    <div className="flex items-center gap-2 px-4 py-3">
                      <button onClick={() => toggleCollapse(`div-${div.id}`)} className="text-purple-600 hover:text-purple-800 p-0.5 rounded">
                        <ChevronIcon open={!isDivCollapsed} />
                      </button>
                      <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
                      <span className="font-bold text-purple-800 text-sm flex-1">{div.name}</span>
                      <span className="text-xs text-purple-500">{divDepts.length} dept{divDepts.length !== 1 ? 's' : ''}</span>

                      {canCreateDepartment && !isReadOnly && (
                        <button onClick={() => openAddForm(`dept-${div.id}`)} className={btnGhost}>
                          <PlusIcon /> Add Dept
                        </button>
                      )}
                      {isAdmin && (
                        <button onClick={() => handleDeleteDivision(div.id, div.name)} className={btnDanger} title={t.deleteDivision}>
                          <TrashIcon />
                        </button>
                      )}
                    </div>

                    {/* Department add form */}
                    {openForm === `dept-${div.id}` && (
                      <form onSubmit={e => handleCreateDepartment(e, div.id)}
                        className="mx-4 mb-3 bg-white border border-primary/30 rounded-xl p-4 space-y-2 shadow-sm">
                        <p className="text-xs font-bold text-primary uppercase tracking-wide">New Department in {div.name}</p>
                        <div className="flex gap-2">
                          <input className={`${inputCls} flex-1`} placeholder="Department name *" value={deptName}
                            onChange={e => setDeptName(e.target.value)} required autoFocus />
                          <button type="button" onClick={() => setOpenForm(null)} className="px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg">{t.cancel}</button>
                          <button type="submit" disabled={loading} className={btnPrimary}>{loading ? '…' : '+ Add'}</button>
                        </div>
                      </form>
                    )}

                    {/* Departments */}
                    {!isDivCollapsed && (
                      <div className="px-3 pb-3 space-y-2">
                        {divDepts.map(dept => {
                          const isDeptCollapsed = collapsed.has(`dept-${dept.id}`);
                          const canEdit = canEditDepartment(dept.id);

                          return (
                            <div key={dept.id} className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
                              {/* Department row */}
                              <div className="flex items-center gap-2 px-4 py-2.5">
                                <button onClick={() => toggleCollapse(`dept-${dept.id}`)} className="text-primary hover:text-primary-dark p-0.5 rounded">
                                  <ChevronIcon open={!isDeptCollapsed} />
                                </button>
                                <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                                <span className="font-semibold text-slate-800 text-sm flex-1">{dept.name}</span>
                                <span className="text-xs text-slate-400">{dept.objectives.length} obj</span>

                                {canEdit && !isReadOnly && (
                                  <button onClick={() => openAddForm(`obj-${dept.id}`)} className={btnGhost}>
                                    <PlusIcon /> Add Objective
                                  </button>
                                )}
                                {/* Add Leader Objective — only shown if dept has a leader */}
                                {canEdit && !isReadOnly && dept.leaderName && (
                                  <button
                                    onClick={() => openAddForm(`leader-obj-${dept.id}`)}
                                    className="px-3 py-1.5 text-sm font-medium text-violet-600 hover:bg-violet-50 rounded-lg transition-colors flex items-center gap-1"
                                    title={`Add personal objective for ${dept.leaderName}`}
                                  >
                                    <PlusIcon /> {t.leaderPersonalGoals}
                                  </button>
                                )}
                                {isAdmin && (
                                  <button onClick={() => handleDeleteDepartment(dept.id)} className={btnDanger} title={t.deleteDepartment}>
                                    <TrashIcon />
                                  </button>
                                )}
                              </div>

                              {/* Department Objective add form */}
                              {openForm === `obj-${dept.id}` && (
                                <form onSubmit={e => handleCreateObjective(e, dept.id)}
                                  className="mx-3 mb-3 bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">New Objective in {dept.name}</p>
                                  <input className={`${inputCls} w-full`} placeholder="Objective name *" value={objName}
                                    onChange={e => setObjName(e.target.value)} required autoFocus />
                                  <div className="flex gap-2">
                                    <input className={`${inputCls} flex-1`} type="number" placeholder={t.weightPercent} min="0" max="100"
                                      value={objWeight} onChange={e => setObjWeight(e.target.value)} />
                                    <button type="button" onClick={() => setOpenForm(null)} className="px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg">{t.cancel}</button>
                                    <button type="submit" disabled={loading} className={btnPrimary}>{loading ? '…' : '+ Add'}</button>
                                  </div>
                                </form>
                              )}

                              {/* Leader Objective add form */}
                              {openForm === `leader-obj-${dept.id}` && (
                                <form onSubmit={e => handleCreateLeaderObjective(e, dept.id)}
                                  className="mx-3 mb-3 bg-violet-50 border border-violet-200 rounded-xl p-3 space-y-2">
                                  <p className="text-xs font-bold text-violet-700 uppercase tracking-wide">
                                    {t.leaderPersonalGoals} — {dept.leaderName}
                                  </p>
                                  <input className={`${inputCls} w-full`} placeholder="Objective name *" value={objName}
                                    onChange={e => setObjName(e.target.value)} required autoFocus />
                                  <div className="flex gap-2">
                                    <input className={`${inputCls} flex-1`} type="number" placeholder={t.weightPercent} min="0" max="100"
                                      value={objWeight} onChange={e => setObjWeight(e.target.value)} />
                                    <button type="button" onClick={() => setOpenForm(null)} className="px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg">{t.cancel}</button>
                                    <button type="submit" disabled={loading}
                                      className="px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors">
                                      {loading ? '…' : '+ Add'}
                                    </button>
                                  </div>
                                </form>
                              )}

                              {/* Leader Objectives (purple) */}
                              {!isDeptCollapsed && dept.leaderObjectives && dept.leaderObjectives.length > 0 && (
                                <div className="px-3 pb-2 space-y-1">
                                  <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide px-1 pt-1 flex items-center gap-1">
                                    {dept.leaderName} — {t.leaderPersonalGoals}
                                  </p>
                                  {dept.leaderObjectives.map(obj => (
                                    <div key={obj.id} className="rounded-lg border border-violet-200 bg-violet-50 overflow-hidden">
                                      <div className="flex items-center gap-2 px-3 py-2">
                                        <button onClick={() => toggleCollapse(`obj-${obj.id}`)} className="text-violet-500 p-0.5 rounded">
                                          <ChevronIcon open={!collapsed.has(`obj-${obj.id}`)} />
                                        </button>
                                        <div className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0" />
                                        <span className="font-medium text-slate-700 text-sm flex-1">{obj.name}</span>
                                        <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">{obj.weight ?? 0}%</span>
                                        <span className="text-xs text-slate-400">{obj.keyResults.length} KR</span>
                                        {canEdit && !isReadOnly && (
                                          <button onClick={() => openAddForm(`kr-${obj.id}`)} className="px-2 py-1 text-xs font-medium text-violet-600 hover:bg-violet-100 rounded-lg flex items-center gap-1">
                                            <PlusIcon /> Add KR
                                          </button>
                                        )}
                                        {canEdit && (
                                          <button onClick={() => handleDeleteObjective(obj.id)} className={btnDanger}>
                                            <TrashIcon />
                                          </button>
                                        )}
                                      </div>
                                      {openForm === `kr-${obj.id}` && (
                                        <KrAddForm
                                          objId={obj.id} objName={obj.name}
                                          existingKrWeightTotal={obj.keyResults.reduce((s, k) => s + (k.weight ?? 0), 0)}
                                          scoreLevels={scoreLevels} t={t}
                                          onCancel={() => setOpenForm(null)}
                                          onSuccess={() => { setOpenForm(null); onUpdate(); flashSuccess('Key Result created.'); }}
                                          onError={msg => setError(msg)}
                                        />
                                      )}
                                      {!collapsed.has(`obj-${obj.id}`) && obj.keyResults.length > 0 && (
                                        <div className="px-3 pb-2 space-y-1">
                                          {obj.keyResults.map(kr => (
                                            <div key={kr.id} className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-violet-100">
                                              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                                              <span className="text-sm text-slate-700 flex-1">{kr.name}</span>
                                              <span className="text-xs font-bold px-1 rounded bg-violet-50 text-violet-600">{kr.weight ?? 0}%</span>
                                              {canEdit && (
                                                <button onClick={() => handleDeleteKeyResult(kr.id)} className={btnDanger}><TrashIcon /></button>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Department Objectives (amber) */}
                              {!isDeptCollapsed && dept.objectives.length > 0 && (
                                <div className="px-3 pb-3 space-y-2">
                                  {dept.objectives.map(obj => {
                                    const isObjCollapsed = collapsed.has(`obj-${obj.id}`);

                                    return (
                                      <div key={obj.id} className="rounded-lg border border-amber-200 bg-amber-50 overflow-hidden">
                                        {/* Objective row */}
                                        <div className="flex items-center gap-2 px-3 py-2">
                                          <button onClick={() => toggleCollapse(`obj-${obj.id}`)} className="text-amber-600 hover:text-amber-800 p-0.5 rounded">
                                            <ChevronIcon open={!isObjCollapsed} />
                                          </button>
                                          <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                                          <span className="font-medium text-slate-700 text-sm flex-1">{obj.name}</span>
                                          <span className="text-xs text-amber-600 font-semibold">{obj.weight}%</span>
                                          <span className="text-xs text-slate-400">{obj.keyResults.length} KR</span>

                                          {canEdit && !isReadOnly && (
                                            <button onClick={() => openAddForm(`kr-${obj.id}`)} className={btnGhost}>
                                              <PlusIcon /> Add KR
                                            </button>
                                          )}
                                          {canEdit && (
                                            <button onClick={() => handleDeleteObjective(obj.id)} className={btnDanger} title={t.deleteObjective}>
                                              <TrashIcon />
                                            </button>
                                          )}
                                        </div>

                                        {/* KR add form */}
                                        {openForm === `kr-${obj.id}` && (
                                          <KrAddForm
                                            objId={obj.id}
                                            objName={obj.name}
                                            existingKrWeightTotal={obj.keyResults.reduce((s, k) => s + (k.weight ?? 0), 0)}
                                            scoreLevels={scoreLevels}
                                            t={t}
                                            onCancel={() => setOpenForm(null)}
                                            onSuccess={() => { setOpenForm(null); onUpdate(); flashSuccess('Key Result created.'); }}
                                            onError={msg => setError(msg)}
                                          />
                                        )}

                                        {/* Key Results */}
                                        {!isObjCollapsed && obj.keyResults.length > 0 && (
                                          <div className="px-3 pb-2 space-y-1">
                                            {obj.keyResults.map(kr => {
                                              const totalWeight = obj.keyResults.reduce((s, k) => s + (k.weight ?? 0), 0);
                                              const otherWeight = totalWeight - (kr.weight ?? 0);
                                              return (
                                              <div key={kr.id} className="rounded-lg border border-emerald-200 overflow-hidden">
                                                <div className="flex items-center gap-2 px-3 py-2 bg-white">
                                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                                                  <div className="flex-1 min-w-0">
                                                    <span className="text-sm text-slate-700 font-medium">{kr.name}</span>
                                                    <span className="ml-2 text-xs text-slate-400">{kr.metricType.replace('_', ' ')}</span>
                                                    {kr.unit && <span className="ml-1 text-xs text-slate-400">({kr.unit})</span>}
                                                    <span className={`ml-2 text-xs font-bold px-1.5 py-0.5 rounded ${totalWeight > 100 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                                                      {kr.weight ?? 0}%
                                                    </span>
                                                  </div>
                                                  {canEdit && (
                                                    <>
                                                      <button
                                                        onClick={() => openAddForm(`edit-kr-${kr.id}`)}
                                                        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
                                                        title={t.editKeyResult}
                                                      >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                      </button>
                                                      <button onClick={() => handleDeleteKeyResult(kr.id)} className={btnDanger} title={t.deleteKeyResult}>
                                                        <TrashIcon />
                                                      </button>
                                                    </>
                                                  )}
                                                </div>
                                                {openForm === `edit-kr-${kr.id}` && (
                                                  <KrEditForm
                                                    kr={kr}
                                                    objName={obj.name}
                                                    otherKrWeightTotal={otherWeight}
                                                    scoreLevels={scoreLevels}
                                                    t={t}
                                                    onCancel={() => setOpenForm(null)}
                                                    onSuccess={() => { setOpenForm(null); onUpdate(); flashSuccess('Key Result updated.'); }}
                                                    onError={msg => setError(msg)}
                                                  />
                                                )}
                                              </div>
                                              );
                                            })}
                                            {/* Total weight indicator */}
                                            {(() => {
                                              const total = obj.keyResults.reduce((s, k) => s + (k.weight ?? 0), 0);
                                              return (
                                                <div className={`flex items-center justify-end gap-2 px-2 py-1 rounded text-xs font-semibold ${total > 100 ? 'bg-red-50 text-red-600' : total === 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                                  {total > 100 ? t.weightExceeded : total === 100 ? t.weightsBalanced : `${t.totalWeightRemaining} ${total}% (${100 - total}%)`}
                                                  <span className="font-bold">{total}% / 100%</span>
                                                </div>
                                              );
                                            })()}
                                          </div>
                                        )}

                                        {!isObjCollapsed && obj.keyResults.length === 0 && openForm !== `kr-${obj.id}` && (
                                          <p className="text-xs text-slate-400 px-6 pb-2">{t.noKeyResultsYet}</p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {!isDeptCollapsed && dept.objectives.length === 0 && openForm !== `obj-${dept.id}` && (
                                <p className="text-xs text-slate-400 px-6 pb-3">{t.noObjectivesYetClick}</p>
                              )}
                            </div>
                          );
                        })}

                        {divDepts.length === 0 && openForm !== `dept-${div.id}` && (
                          <p className="text-xs text-slate-400 px-4 py-2">{t.noDepartmentsYetClick}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Orphan departments (no division linked) */}
              {orphanDepts.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden mb-3">
                  <div className="px-4 py-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-400 flex-shrink-0" />
                    <span className="font-bold text-slate-600 text-sm flex-1">Unassigned Departments</span>
                  </div>
                  <div className="px-3 pb-3 space-y-1">
                    {orphanDepts.map(dept => (
                      <div key={dept.id} className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200">
                        <span className="text-sm text-slate-700 flex-1">{dept.name}</span>
                        {isAdmin && (
                          <button onClick={() => handleDeleteDepartment(dept.id)} className={btnDanger}>
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Division button */}
              {isAdmin && (
                <div className="mt-4">
                  {openForm === 'div' ? (
                    <form onSubmit={handleCreateDivision}
                      className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-bold text-purple-700 uppercase tracking-wide">New Division</p>
                      <div className="flex gap-2">
                        <input className={`${inputCls} flex-1`} placeholder="Division name *" value={divName}
                          onChange={e => setDivName(e.target.value)} required autoFocus />
                        <button type="button" onClick={() => setOpenForm(null)} className="px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg">{t.cancel}</button>
                        <button type="submit" disabled={loading}
                          className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors">
                          {loading ? '…' : '+ Create Division'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button onClick={() => openAddForm('div')}
                      className="w-full py-2.5 border-2 border-dashed border-purple-300 text-purple-600 rounded-xl text-sm font-semibold hover:border-purple-500 hover:bg-purple-50 transition-all flex items-center justify-center gap-2">
                      <PlusIcon /> Add Division
                    </button>
                  )}
                </div>
              )}

              {divisions.length === 0 && !isAdmin && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-700 text-sm text-center">
                  No divisions have been created yet. Ask an administrator to set up the structure.
                </div>
              )}
            </div>
          )}

          {/* ── SCORE LEVELS TAB ──────────────────────────────────────── */}
          {activeTab === 'scoreLevels' && (
            canEditScoreLevels
              ? <ScoreLevelsManager onUpdate={onUpdate} />
              : <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-700 text-sm">{t.onlyAdminsCanEditScoreLevels}</div>
          )}

          {/* ── WATERMARK TAB ─────────────────────────────────────────── */}
          {activeTab === 'watermark' && isAdmin && (
            <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-5">
                <h3 className="text-lg font-bold text-slate-800">{t.watermarkSettings}</h3>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">{t.enableWatermark}</span>
                  <button type="button" onClick={() => setWmEnabled(v => !v)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${wmEnabled ? 'bg-primary' : 'bg-slate-300'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${wmEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">{t.watermarkType}</label>
                  <div className="flex gap-3">
                    {(['TEXT', 'IMAGE'] as const).map(type => (
                      <button key={type} type="button" onClick={() => setWmType(type)}
                        className={`flex-1 py-2 rounded-lg font-semibold border-2 transition-colors text-sm ${wmType === type ? 'border-primary bg-primary text-white' : 'border-slate-200 text-slate-600 hover:border-primary'}`}>
                        {type === 'TEXT' ? t.watermarkTypeText : t.watermarkTypeImage}
                      </button>
                    ))}
                  </div>
                </div>
                {wmType === 'TEXT' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">{t.watermarkText}</label>
                    <input type="text" value={wmText} onChange={e => setWmText(e.target.value)} maxLength={40}
                      placeholder="e.g. CONFIDENTIAL" className={`${inputCls} w-full`} />
                  </div>
                )}
                {wmType === 'IMAGE' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">{t.watermarkImageUpload}</label>
                    {(wmImagePreview || wm.imageUrl) && (
                      <div className="mb-3 p-3 bg-white border border-slate-200 rounded-lg">
                        <p className="text-xs text-slate-500 mb-2">{t.watermarkCurrentImage}</p>
                        <img src={wmImagePreview || `${SERVER_BASE}${wm.imageUrl}`} alt="watermark" className="max-h-24 object-contain" />
                      </div>
                    )}
                    <input type="file" accept="image/jpeg,image/png,image/gif" disabled={wmSaving}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleWatermarkImageUpload(f); }}
                      className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold file:bg-primary file:text-white hover:file:bg-primary" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    {t.watermarkOpacity}: <span className="text-primary">{Math.round(wmOpacity * 100)}%</span>
                  </label>
                  <input type="range" min="0.03" max="0.5" step="0.01" value={wmOpacity}
                    onChange={e => setWmOpacity(parseFloat(e.target.value))} className="w-full accent-[#B5333D]" />
                  <div className="flex justify-between text-xs text-slate-400 mt-1"><span>3%</span><span>50%</span></div>
                </div>
                {wmSuccess && <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-3 rounded text-sm">{wmSuccess}</div>}
                {wmError && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded text-sm">{wmError}</div>}
                <button type="button" onClick={handleSaveWatermark} disabled={wmSaving}
                  className={`${btnPrimary} w-full py-2.5`}>
                  {wmSaving ? t.saving : t.saveChanges}
                </button>
              </div>

              {/* Attachment Requirement Setting */}
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
                <h3 className="text-lg font-bold text-slate-800">Настройки вложений</h3>
                <p className="text-sm text-slate-500">
                  Если включено, пользователи должны прикрепить файл-основание (PDF, DOC и т.д.) при изменении фактического значения KR.
                </p>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Требовать файл-основание</span>
                  <button
                    type="button"
                    onClick={handleToggleAttachmentRequired}
                    disabled={attachmentSaving}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${attachmentRequired ? 'bg-primary' : 'bg-slate-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${attachmentRequired ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <div className={`text-xs px-3 py-2 rounded-lg ${attachmentRequired ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                  {attachmentRequired
                    ? 'Вложение обязательно — пользователи не смогут обновить факт без прикрепленного файла.'
                    : 'Вложение необязательно — пользователи могут обновлять факт без файла.'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
