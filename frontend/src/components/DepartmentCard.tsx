import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Department, Objective, KeyResult } from '../types/okr';
import { keyResultApi, objectiveApi, platformSettingsApi } from '../services/api';
import Speedometer from './Speedometer';
import { useLanguage } from '../i18n';
import { useScoreLevels } from '../contexts/ScoreLevelContext';
import { useAuth } from '../contexts/AuthContext';

interface DepartmentCardProps {
    department: Department;
    objective: Objective;
    onUpdate: () => void;
    /** 1-based display index for numbering (e.g. 1, 2, 3) */
    index?: number;
    /**
     * Override the default canEditDepartment permission check.
     * Used for leader objectives where edit access is granted to
     * Admin, Director, or the leader themselves (not HR/Business Block).
     */
    canEditOverride?: boolean;
}

const DepartmentCard: React.FC<DepartmentCardProps> = ({ department, objective, onUpdate, index, canEditOverride }) => {
    const { t } = useLanguage();
    const { scoreLevels } = useScoreLevels();
    const { canEditDepartment, canEditProgress: canEditProgressFn } = useAuth();
    const canEdit = canEditOverride !== undefined ? canEditOverride : canEditDepartment(department.id);
    const canEditProg = canEditProgressFn(department.id);
    const [expanded, setExpanded] = useState(true);
    const [isEditingObjective, setIsEditingObjective] = useState(false);
    const [editName, setEditName] = useState(objective.name);
    const [editWeight, setEditWeight] = useState(String(objective.weight));
    const [savingObjective, setSavingObjective] = useState(false);
    const [localValues, setLocalValues] = useState<Record<string, string>>({});
    const [localProgress, setLocalProgress] = useState<Record<string, number | string>>({});
    const focusedIdRef = useRef<string | null>(null);
    const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
    const [savingProgressIds, setSavingProgressIds] = useState<Set<string>>(new Set());
    const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});
    const [attachmentRequired, setAttachmentRequired] = useState(false);
    const [attachmentErrors, setAttachmentErrors] = useState<Record<string, string>>({});
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
    const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
    const progressDebounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

    useEffect(() => {
        const newValues: Record<string, string> = {};
        objective.keyResults.forEach(kr => {
            if (focusedIdRef.current === kr.id) {
                newValues[kr.id] = localValues[kr.id] ?? kr.actualValue ?? '';
            } else {
                newValues[kr.id] = kr.actualValue ?? '';
            }
        });
        setLocalValues(newValues);
    }, [objective.keyResults]);

    useEffect(() => {
        const newProgress: Record<string, number | string> = {};
        objective.keyResults.forEach(kr => {
            if (kr.progress != null) {
                newProgress[kr.id] = localProgress[kr.id] ?? kr.progress;
            }
        });
        setLocalProgress(newProgress);
    }, [objective.keyResults]);

    useEffect(() => {
        platformSettingsApi.getAll().then(res => {
            const setting = res.data.find(s => s.settingKey === 'REQUIRE_ATTACHMENT_FOR_ACTUAL_VALUE');
            setAttachmentRequired(setting?.settingValue === 'true');
        }).catch(() => { });
    }, []);

    useEffect(() => {
        return () => {
            Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer));
            Object.values(progressDebounceTimers.current).forEach(timer => clearTimeout(timer));
        };
    }, []);

    const saveValue = useCallback(async (krId: string, value: string, skipRefresh = false) => {
        const file = pendingFiles[krId];
        if (attachmentRequired && !file) {
            // Check if there's already an attachment on the KR
            const kr = objective.keyResults.find(k => k.id === krId);
            if (!kr?.attachmentUrl) {
                setAttachmentErrors(prev => ({ ...prev, [krId]: t.attachmentRequired }));
                return;
            }
        }
        setAttachmentErrors(prev => {
            const next = { ...prev };
            delete next[krId];
            return next;
        });
        setSavingIds(prev => new Set(prev).add(krId));
        try {
            await keyResultApi.updateActualValue(krId, value, file);
            // Clear the pending file after successful save
            if (file) {
                setPendingFiles(prev => {
                    const next = { ...prev };
                    delete next[krId];
                    return next;
                });
            }
            if (!skipRefresh) {
                if (focusedIdRef.current === krId) {
                    focusedIdRef.current = null;
                }
                onUpdate();
            }
        } catch (err: any) {
            console.error('Failed to update key result', err);
            const msg = err.response?.data?.message || err.response?.data || 'Failed to save';
            if (typeof msg === 'string' && msg.includes('Attachment is required')) {
                setAttachmentErrors(prev => ({ ...prev, [krId]: t.attachmentRequired }));
            }
        } finally {
            setSavingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(krId);
                return newSet;
            });
        }
    }, [onUpdate, pendingFiles, attachmentRequired, objective.keyResults]);

    const handleActualValueChange = (kr: KeyResult, value: string) => {
        setLocalValues(prev => ({
            ...prev,
            [kr.id]: value
        }));

        if (debounceTimers.current[kr.id]) {
            clearTimeout(debounceTimers.current[kr.id]);
        }

        debounceTimers.current[kr.id] = setTimeout(() => {
            // skipRefresh=true so the input retains focus while typing.
            // The score will update when the user presses Enter, blurs, or clicks Refresh.
            saveValue(kr.id, value, true);
        }, 1000);
    };

    const handleFocus = (krId: string) => {
        focusedIdRef.current = krId;
    };

    const handleBlur = (kr: KeyResult) => {
        if (debounceTimers.current[kr.id]) {
            clearTimeout(debounceTimers.current[kr.id]);
            delete debounceTimers.current[kr.id];
        }

        const value = localValues[kr.id] ?? kr.actualValue ?? '';
        focusedIdRef.current = null;
        saveValue(kr.id, value, false);
    };

    const handleEnter = (kr: KeyResult, e: React.KeyboardEvent) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        // Cancel any pending debounce and save immediately
        if (debounceTimers.current[kr.id]) {
            clearTimeout(debounceTimers.current[kr.id]);
            delete debounceTimers.current[kr.id];
        }
        const value = localValues[kr.id] ?? kr.actualValue ?? '';
        focusedIdRef.current = null;
        (e.target as HTMLElement).blur();
        saveValue(kr.id, value, false);
    };

    const handleRefresh = () => {
        Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer));
        debounceTimers.current = {};
        focusedIdRef.current = null;
        onUpdate();
    };

    const saveProgress = useCallback(async (krId: string, value: number) => {
        setSavingProgressIds(prev => new Set(prev).add(krId));
        try {
            await keyResultApi.updateProgress(krId, value);
            // Don't call onUpdate() here — it triggers a parent re-render
            // which resets localProgress and causes the input to lose focus.
        } catch (err) {
            console.error('Failed to update progress', err);
        } finally {
            setSavingProgressIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(krId);
                return newSet;
            });
        }
    }, []);

    const handleProgressChange = (krId: string, rawValue: string) => {
        if (rawValue === '') {
            setLocalProgress(prev => ({ ...prev, [krId]: '' }));
            return;
        }
        const parsed = parseInt(rawValue);
        if (isNaN(parsed)) return;
        const clamped = Math.min(100, Math.max(0, parsed));
        setLocalProgress(prev => ({ ...prev, [krId]: clamped }));

        if (progressDebounceTimers.current[krId]) {
            clearTimeout(progressDebounceTimers.current[krId]);
        }
        progressDebounceTimers.current[krId] = setTimeout(() => {
            saveProgress(krId, clamped);
        }, 1000);
    };

    const handleProgressBlur = (krId: string, fallback: number) => {
        const current = localProgress[krId];
        if (current === '' || current === undefined) {
            setLocalProgress(prev => ({ ...prev, [krId]: fallback }));
        }
    };

    const getScoreLevelLabel = (score: number): string => {
        if (scoreLevels.length === 0) {
            // Fallback to defaults
            if (score >= 0.98) return t.exceptional;
            if (score >= 0.86) return t.veryGood;
            if (score >= 0.51) return t.good;
            if (score >= 0.31) return t.meets;
            return t.below;
        }
        // Find the appropriate level from dynamic score levels
        for (let i = scoreLevels.length - 1; i >= 0; i--) {
            if (score >= scoreLevels[i].scoreValue) {
                return scoreLevels[i].name;
            }
        }
        return scoreLevels[0]?.name || t.below;
    };

    const getScoreLevelColor = (score: number): string => {
        if (scoreLevels.length === 0) {
            // Fallback to defaults
            if (score >= 0.98) return '#1e7b34';
            if (score >= 0.86) return '#28a745';
            if (score >= 0.51) return '#5cb85c';
            if (score >= 0.31) return '#f0ad4e';
            return '#d9534f';
        }
        // Find the appropriate color from dynamic score levels
        for (let i = scoreLevels.length - 1; i >= 0; i--) {
            if (score >= scoreLevels[i].scoreValue) {
                return scoreLevels[i].color;
            }
        }
        return scoreLevels[0]?.color || '#d9534f';
    };

    // Map backend's 5-threshold structure to dynamic score levels
    // This must match the mapping logic in SettingsModal.tsx mapThresholdsToBackend()
    const getThresholdsForDisplay = (kr: KeyResult): { name: string; value: number; color: string }[] => {
        const backendThresholds = [
            kr.thresholds.below,      // index 0: always maps to level index 0
            kr.thresholds.meets,      // index 1: maps to level index min(1, numLevels-1)
            kr.thresholds.good,       // index 2: maps to level index min(2, numLevels-1)
            kr.thresholds.veryGood,   // index 3: maps to level index min(3, numLevels-1)
            kr.thresholds.exceptional // index 4: maps to level index numLevels-1
        ];

        if (scoreLevels.length === 0) {
            // Fallback defaults
            return [
                { name: t.below, value: backendThresholds[0], color: '#dc3545' },
                { name: t.meets, value: backendThresholds[1], color: '#ffc107' },
                { name: t.good, value: backendThresholds[2], color: '#5cb85c' },
                { name: t.veryGood, value: backendThresholds[3], color: '#28a745' },
                { name: t.exceptional, value: backendThresholds[4], color: '#1e7b34' }
            ];
        }

        const sortedLevels = [...scoreLevels].sort((a, b) => a.scoreValue - b.scoreValue);
        const numLevels = sortedLevels.length;
        const result: { name: string; value: number; color: string }[] = [];

        // Map using same index logic as mapThresholdsToBackend:
        // Level 0 → below (backend index 0)
        // Level 1 → meets (backend index 1) if numLevels > 1
        // Level 2 → good (backend index 2) if numLevels > 2
        // Level 3 → veryGood (backend index 3) if numLevels > 3
        // Level 4+ → exceptional (backend index 4)

        if (numLevels >= 5) {
            // 5 or more levels: direct mapping
            sortedLevels.forEach((level, i) => {
                result.push({ name: level.name, value: backendThresholds[Math.min(i, 4)], color: level.color });
            });
        } else if (numLevels === 4) {
            // 4 levels: [0, 1, 2, 3] maps to backend [0, 1, 2, 3]
            result.push({ name: sortedLevels[0].name, value: backendThresholds[0], color: sortedLevels[0].color });
            result.push({ name: sortedLevels[1].name, value: backendThresholds[1], color: sortedLevels[1].color });
            result.push({ name: sortedLevels[2].name, value: backendThresholds[2], color: sortedLevels[2].color });
            result.push({ name: sortedLevels[3].name, value: backendThresholds[3], color: sortedLevels[3].color });
        } else if (numLevels === 3) {
            // 3 levels: [0, 1, 2] maps to backend [0, 1, 2]
            result.push({ name: sortedLevels[0].name, value: backendThresholds[0], color: sortedLevels[0].color });
            result.push({ name: sortedLevels[1].name, value: backendThresholds[1], color: sortedLevels[1].color });
            result.push({ name: sortedLevels[2].name, value: backendThresholds[2], color: sortedLevels[2].color });
        } else if (numLevels === 2) {
            // 2 levels: [0, 1] maps to backend [0, 1]
            result.push({ name: sortedLevels[0].name, value: backendThresholds[0], color: sortedLevels[0].color });
            result.push({ name: sortedLevels[1].name, value: backendThresholds[1], color: sortedLevels[1].color });
        } else {
            // 1 level or edge case
            sortedLevels.forEach((level) => {
                result.push({ name: level.name, value: backendThresholds[0], color: level.color });
            });
        }

        return result;
    };

    const getMetricTypeLabel = (metricType: string): string => {
        switch (metricType) {
            case 'HIGHER_BETTER': return t.higherIsBetter;
            case 'LOWER_BETTER': return t.lowerIsBetter;
            default: return t.qualitative;
        }
    };

    const handleFileSelect = (krId: string, file: File | null) => {
        if (!file) return;
        setPendingFiles(prev => ({ ...prev, [krId]: file }));
        setAttachmentErrors(prev => {
            const next = { ...prev };
            delete next[krId];
            return next;
        });
    };

    const getAttachmentDownloadUrl = (url: string) => {
        const base = process.env.REACT_APP_API_URL || '/api';
        const apiBase = base.replace(/\/api\/?$/, '');
        return `${apiBase}${url}`;
    };

    const handleStartEditObjective = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditName(objective.name);
        setEditWeight(String(objective.weight));
        setIsEditingObjective(true);
    };

    const handleSaveObjective = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const w = parseInt(editWeight, 10);
        if (!editName.trim() || isNaN(w) || w < 0 || w > 100) return;
        setSavingObjective(true);
        try {
            await objectiveApi.update(objective.id, { name: editName.trim(), weight: w });
            setIsEditingObjective(false);
            onUpdate();
        } catch (err) {
            console.error('Failed to update objective:', err);
        } finally {
            setSavingObjective(false);
        }
    };

    const handleCancelEditObjective = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditingObjective(false);
    };

    return (
        <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
            {/* Objective Header - Compact */}
            <div
                className="bg-gradient-to-r from-primary to-primary-dark px-3 py-2 cursor-pointer"
                onClick={() => !isEditingObjective && setExpanded(!expanded)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        {isEditingObjective ? (
                            <div className="flex items-center gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                                <span className="text-white/70 text-sm font-bold">{index != null ? `${index}.` : ''}</span>
                                <input
                                    className="text-sm font-bold text-slate-800 bg-white rounded px-2 py-0.5 flex-1 min-w-0 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    autoFocus
                                    onKeyDown={e => { if (e.key === 'Escape') handleCancelEditObjective(e as any); }}
                                />
                                <input
                                    className="text-sm font-bold text-slate-800 bg-white rounded px-2 py-0.5 w-16 text-center focus:outline-none focus:ring-2 focus:ring-amber-400"
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={editWeight}
                                    onChange={e => setEditWeight(e.target.value)}
                                />
                                <span className="text-white/80 text-xs">%</span>
                                <button
                                    onClick={handleSaveObjective}
                                    disabled={savingObjective}
                                    className="bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-1 rounded font-semibold disabled:opacity-50 flex items-center gap-1"
                                >
                                    {savingObjective ? (
                                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                    {t.save}
                                </button>
                                <button
                                    onClick={handleCancelEditObjective}
                                    className="bg-white/20 hover:bg-white/30 text-white text-xs px-2 py-1 rounded font-semibold"
                                >
                                    {t.cancel}
                                </button>
                            </div>
                        ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                            {index != null && (
                                <span className="text-white/70 text-sm font-bold">{index}.</span>
                            )}
                            <h3 className="text-sm font-bold text-white">{objective.name}</h3>
                            {objective.employeeName && (
                                <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    {objective.employeeName}
                                </span>
                            )}
                            <span className="bg-white/30 backdrop-blur-sm text-white text-xs px-1.5 py-0.5 rounded-full font-semibold">
                                {objective.weight}%
                            </span>
                            {(() => {
                                const total = objective.keyResults.reduce((s, kr) => s + (kr.weight ?? 0), 0);
                                if (total > 100) return <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">{t.krWeightsWarning}: {total}%</span>;
                                if (total > 0 && total < 100) return <span className="bg-amber-400 text-amber-900 text-xs px-1.5 py-0.5 rounded-full font-bold">{t.krWeightsWarning}: {total}%</span>;
                                return null;
                            })()}
                        </div>
                        )}
                        <p className="text-red-100 text-xs">
                            {objective.keyResults.length} KR{objective.keyResults.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {objective.score && (
                            <div className="bg-white/20 rounded px-2 py-1 backdrop-blur-sm">
                                <div className="text-sm font-bold text-white">
                                    {objective.score.score.toFixed(2)}
                                </div>
                            </div>
                        )}
                        {canEdit && !isEditingObjective && (
                            <button
                                onClick={handleStartEditObjective}
                                className="bg-white/20 hover:bg-white/30 text-white p-1 rounded transition-colors"
                                title="Редактировать Objective"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                        )}
                        <span className="text-white text-sm">{expanded ? '▲' : '▼'}</span>
                    </div>
                </div>
            </div>

            {/* Results Breakdown */}
            {expanded && (
                <div className="p-2">
                    {/* Score Gauge and Summary - Compact inline */}
                    <div className="flex items-center gap-3 mb-2 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-2">
                        <Speedometer score={objective.score || { score: 0, level: 'не_соответствует', color: '#d9534f', percentage: 0 }} size="sm" compact={true} />
                        <div className="flex-1 flex items-center gap-4">
                            <div>
                                <div className="text-xs text-slate-500">{t.scoreLevel}</div>
                                <div
                                    className="text-sm font-bold"
                                    style={{ color: getScoreLevelColor(objective.score?.score || 0) }}
                                >
                                    {getScoreLevelLabel(objective.score?.score || 0)}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500">{t.averageScore}</div>
                                <div
                                    className="text-sm font-bold"
                                    style={{ color: objective.score?.color || '#666' }}
                                >
                                    {objective.score?.score.toFixed(2) || '0.00'} / 1.00
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRefresh();
                            }}
                            className="px-2 py-1 bg-primary hover:bg-primary-dark text-white text-xs font-semibold rounded transition-colors flex items-center gap-1"
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {t.refreshScores}
                        </button>
                    </div>

                    {/* Results Breakdown Table - Compact */}
                    <div className="bg-white rounded border border-slate-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-slate-100 to-slate-50 px-2 py-1 border-b border-slate-200">
                            <h4 className="text-xs font-bold text-slate-800">{t.resultsBreakdown}</h4>
                        </div>

                        {/* Table - Compact */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-gradient-to-r from-primary to-primary-dark text-white">
                                        <th className="px-2 py-1 text-left font-bold">KR</th>
                                        <th className="px-2 py-1 text-center font-bold">{t.weight}</th>
                                        <th className="px-2 py-1 text-left font-bold">{t.keyResult}</th>
                                        <th className="px-2 py-1 text-center font-bold">{t.actual}</th>
                                        {(scoreLevels.length > 0 ? [...scoreLevels].sort((a, b) => a.scoreValue - b.scoreValue) : [
                                            { name: t.below, scoreValue: 0.0, color: '#d9534f' },
                                            { name: t.meets, scoreValue: 0.31, color: '#f0ad4e' },
                                            { name: t.good, scoreValue: 0.51, color: '#5cb85c' },
                                            { name: t.veryGood, scoreValue: 0.86, color: '#28a745' },
                                            { name: t.exceptional, scoreValue: 0.98, color: '#1e7b34' }
                                        ]).map((level) => (
                                            <th
                                                key={level.name}
                                                className="px-1 py-1 text-center font-bold text-xs"
                                                style={{ backgroundColor: level.color }}
                                            >
                                                {level.name}<br />{level.scoreValue.toFixed(2)}
                                            </th>
                                        ))}
                                        <th className="px-2 py-1 text-center font-bold">{t.score}</th>
                                        {objective.keyResults.some(kr => kr.progress != null) && (
                                            <th className="px-2 py-1 text-center font-bold min-w-[120px]">{t.progress}</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {objective.keyResults.map((kr, index) => (
                                        <tr
                                            key={kr.id}
                                            className={`border-b border-slate-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-50 transition-colors ${kr.active === false ? 'opacity-50' : ''}`}
                                        >
                                            <td className="px-2 py-1.5 font-bold text-slate-700">
                                                KR{index + 1}
                                            </td>
                                            <td className="px-2 py-1.5 text-center">
                                                <span className="inline-block bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold text-xs">
                                                    {kr.weight}%
                                                </span>
                                            </td>
                                            <td className="px-2 py-1.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="font-semibold text-slate-800 text-xs">{kr.name}</div>
                                                    {canEdit && (
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                try {
                                                                    await keyResultApi.toggleActive(kr.id, kr.active === false);
                                                                    onUpdate();
                                                                } catch (err) {
                                                                    console.error('Failed to toggle KR active', err);
                                                                }
                                                            }}
                                                            className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors ${
                                                                kr.active === false
                                                                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                            }`}
                                                            title={kr.active === false ? 'Activate KR' : 'Deactivate KR'}
                                                        >
                                                            {kr.active === false ? 'Inactive' : 'Active'}
                                                        </button>
                                                    )}
                                                    {!canEdit && kr.active === false && (
                                                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-red-100 text-red-600">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-400">
                                                    {getMetricTypeLabel(kr.metricType)}
                                                </div>
                                            </td>
                                            <td className="px-2 py-1.5 text-center">
                                                {(() => {
                                                    const hasFile = !!pendingFiles[kr.id] || !!kr.attachmentUrl;
                                                    const lockedByAttachment = attachmentRequired && !hasFile;
                                                    const hasAccess = canEdit || canEditProg;
                                                    const inputDisabled = !hasAccess || savingIds.has(kr.id) || lockedByAttachment;
                                                    const lockTitle = lockedByAttachment
                                                        ? t.attachFileFirst
                                                        : !hasAccess ? t.noEditPermission : '';
                                                    return (
                                                        <>
                                                            {/* Attachment section — shown BEFORE input so user uploads first */}
                                                            <div className="mb-1">
                                                                <input
                                                                    type="file"
                                                                    ref={el => { fileInputRefs.current[kr.id] = el; }}
                                                                    onChange={(e) => handleFileSelect(kr.id, e.target.files?.[0] || null)}
                                                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt"
                                                                    className="hidden"
                                                                />
                                                                {hasAccess && (
                                                                    <button
                                                                        onClick={() => fileInputRefs.current[kr.id]?.click()}
                                                                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded transition-colors ${lockedByAttachment
                                                                                ? 'bg-red-50 text-red-600 border border-red-300 hover:bg-red-100'
                                                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                                            }`}
                                                                        title={attachmentRequired ? t.attachmentRequired : t.attachFile}
                                                                    >
                                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                                        </svg>
                                                                        {lockedByAttachment ? t.fileRequired : t.file}
                                                                    </button>
                                                                )}
                                                                {pendingFiles[kr.id] && (
                                                                    <div className="flex items-center gap-1 mt-0.5 text-xs text-green-700 bg-green-50 rounded px-1.5 py-0.5">
                                                                        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                                                                        </svg>
                                                                        <span className="truncate max-w-[100px]">{pendingFiles[kr.id].name}</span>
                                                                        <button
                                                                            onClick={() => setPendingFiles(prev => { const n = { ...prev }; delete n[kr.id]; return n; })}
                                                                            className="text-red-500 hover:text-red-700 flex-shrink-0"
                                                                        >
                                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                            </svg>
                                                                        </button>
                                                                    </div>
                                                                )}
                                                                {/* Always show existing attachment link (visible to admin and all users) */}
                                                                {!pendingFiles[kr.id] && kr.attachmentUrl && (
                                                                    <a
                                                                        href={getAttachmentDownloadUrl(kr.attachmentUrl)}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1 mt-0.5 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 rounded px-1.5 py-0.5"
                                                                        title={kr.attachmentFileName || 'Download'}
                                                                    >
                                                                        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                                                        </svg>
                                                                        <span className="truncate max-w-[100px]">{kr.attachmentFileName || t.file}</span>
                                                                    </a>
                                                                )}
                                                                {attachmentErrors[kr.id] && (
                                                                    <div className="text-xs text-red-600 mt-0.5">{attachmentErrors[kr.id]}</div>
                                                                )}
                                                            </div>
                                                            {/* Actual value input — locked until file is attached when required */}
                                                            {kr.metricType === 'QUALITATIVE' ? (
                                                                <select
                                                                    value={localValues[kr.id] ?? kr.actualValue ?? 'E'}
                                                                    onChange={(e) => handleActualValueChange(kr, e.target.value)}
                                                                    onFocus={() => handleFocus(kr.id)}
                                                                    onBlur={() => handleBlur(kr)}
                                                                    onKeyDown={(e) => handleEnter(kr, e)}
                                                                    disabled={inputDisabled}
                                                                    className="border-2 border-gray-300 rounded-md px-2 py-1 font-bold text-center focus:ring-2 focus:ring-primary focus:border-primary text-xs disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                                                                    title={lockTitle}
                                                                >
                                                                    <option value="A">A</option>
                                                                    <option value="B">B</option>
                                                                    <option value="C">C</option>
                                                                    <option value="D">D</option>
                                                                    <option value="E">E</option>
                                                                </select>
                                                            ) : (
                                                                <div className="relative">
                                                                    <input
                                                                        type="number"
                                                                        value={localValues[kr.id] ?? kr.actualValue ?? ''}
                                                                        onChange={(e) => handleActualValueChange(kr, e.target.value)}
                                                                        onFocus={() => handleFocus(kr.id)}
                                                                        onBlur={() => handleBlur(kr)}
                                                                        onKeyDown={(e) => handleEnter(kr, e)}
                                                                        disabled={inputDisabled}
                                                                        className="border-2 border-gray-300 rounded-md px-2 py-1 w-20 font-bold text-center focus:ring-2 focus:ring-primary focus:border-primary text-xs disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                                                                        placeholder="0"
                                                                        title={lockTitle}
                                                                    />
                                                                    {savingIds.has(kr.id) && (
                                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                                                        </div>
                                                                    )}
                                                                    {kr.unit && (
                                                                        <div className="text-xs text-slate-500 mt-0.5">{kr.unit}</div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </td>
                                            {getThresholdsForDisplay(kr).map((threshold, thresholdIndex) => (
                                                <td
                                                    key={threshold.name}
                                                    className="px-1 py-1.5 text-center font-semibold text-xs"
                                                    style={{ backgroundColor: `${threshold.color}20` }}
                                                >
                                                    {thresholdIndex === 0
                                                        ? (kr.metricType === 'LOWER_BETTER' ? '>' : '<')
                                                        : '≥'
                                                    }{threshold.value}
                                                </td>
                                            ))}
                                            <td className="px-2 py-1.5 text-center">
                                                {kr.score && (
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <div
                                                            className="inline-block px-2 py-1 rounded-full text-white font-bold shadow text-xs"
                                                            style={{ backgroundColor: kr.score.color }}
                                                        >
                                                            {kr.score.score.toFixed(2)}
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            × {kr.weight}% = <span className="font-bold text-slate-700">{(kr.score.score * kr.weight / 100).toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            {kr.progress != null && (
                                                <td className="px-2 py-1.5">
                                                    <div className="flex flex-col gap-1">
                                                        {/* Progress bar */}
                                                        <div className="relative w-full h-5 bg-slate-200 rounded-sm overflow-hidden">
                                                            {(() => {
                                                                const pVal = Number(localProgress[kr.id] ?? kr.progress) || 0;
                                                                return (<>
                                                                    <div
                                                                        className="h-full rounded-sm transition-all duration-300"
                                                                        style={{
                                                                            width: `${pVal}%`,
                                                                            backgroundColor: pVal >= 75 ? '#22c55e'
                                                                                : pVal >= 50 ? '#3b82f6'
                                                                                    : pVal >= 25 ? '#f59e0b'
                                                                                        : '#ef4444',
                                                                        }}
                                                                    />
                                                                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-800">
                                                                        {pVal}%
                                                                    </span>
                                                                </>);
                                                            })()}
                                                        </div>
                                                        {/* Editable input for ADMIN/DEPARTMENT_LEADER */}
                                                        {canEditProg && (
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    max={100}
                                                                    value={localProgress[kr.id] ?? kr.progress}
                                                                    onChange={(e) => handleProgressChange(kr.id, e.target.value)}
                                                                    onBlur={() => handleProgressBlur(kr.id, kr.progress ?? 0)}
                                                                    disabled={savingProgressIds.has(kr.id)}
                                                                    className="border border-slate-300 rounded px-1.5 py-0.5 w-full text-xs text-center focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
                                                                />
                                                                {savingProgressIds.has(kr.id) && (
                                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                                        <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}

                                    {/* Weighted Calculation Row */}
                                    <tr className="bg-gradient-to-r from-gray-100 to-gray-200 border-t-2 border-primary">
                                        <td colSpan={4 + (scoreLevels.length > 0 ? scoreLevels.length : 5) + (objective.keyResults.some(kr => kr.progress != null) ? 1 : 0)} className="px-2 py-1.5 text-xs">
                                            <div className="flex flex-wrap items-center justify-end gap-1">
                                                <span className="font-bold text-slate-700">OKR =</span>
                                                {objective.keyResults.map((kr, idx) => (
                                                    <span key={kr.id} className="text-slate-600">
                                                        {idx > 0 && <span className="mx-1">+</span>}
                                                        <span className="font-medium">
                                                            ({kr.score?.score.toFixed(2) || '0'} × {kr.weight}%)
                                                        </span>
                                                    </span>
                                                ))}
                                                <span className="mx-1">=</span>
                                                <span className="font-bold text-slate-700">
                                                    {objective.keyResults.reduce((sum, kr) => sum + (kr.score?.score || 0) * kr.weight / 100, 0).toFixed(2)}
                                                </span>
                                                {(() => {
                                                    const totalWeight = objective.keyResults.reduce((sum, kr) => sum + kr.weight, 0);
                                                    return totalWeight !== 100 ? (
                                                        <span className="text-slate-500 ml-1">
                                                            / {totalWeight}% = <span className="font-bold">{(objective.keyResults.reduce((sum, kr) => sum + (kr.score?.score || 0) * kr.weight, 0) / totalWeight).toFixed(2)}</span>
                                                        </span>
                                                    ) : null;
                                                })()}
                                            </div>
                                        </td>
                                        <td className="px-2 py-1.5 text-center">
                                            <div
                                                className="inline-block px-2 py-1 rounded text-white font-bold text-xs shadow"
                                                style={{ backgroundColor: objective.score?.color || '#666' }}
                                            >
                                                {objective.score?.score.toFixed(2) || '0.00'}
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DepartmentCard;
