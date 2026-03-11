import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Objective, KeyResult } from '../types/okr';
import { keyResultApi, platformSettingsApi } from '../services/api';
import Speedometer from './Speedometer';
import { useScoreLevels } from '../contexts/ScoreLevelContext';

interface ObjectiveCardProps {
    objective: Objective;
    onUpdate: () => void;
}

const ObjectiveCard: React.FC<ObjectiveCardProps> = ({ objective, onUpdate }) => {
    const { scoreLevels } = useScoreLevels();
    const [expanded, setExpanded] = useState(false);
    const defaultScore = { score: 0, level: 'не_соответствует', color: '#d9534f', percentage: 0 };

    // Local state to track input values for each key result
    const [localValues, setLocalValues] = useState<Record<string, string>>({});

    // Track which input currently has focus
    const focusedIdRef = useRef<string | null>(null);

    // Track if we're currently saving
    const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

    // Debounce timers
    const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

    // Track last saved values to avoid duplicate saves
    const lastSavedValues = useRef<Record<string, string>>({});

    // Attachment state
    const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});
    const [attachmentRequired, setAttachmentRequired] = useState(false);
    const [attachmentErrors, setAttachmentErrors] = useState<Record<string, string>>({});
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    // Sync local values with props when objective changes
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
        platformSettingsApi.getAll().then(res => {
            const setting = res.data.find(s => s.settingKey === 'REQUIRE_ATTACHMENT_FOR_ACTUAL_VALUE');
            setAttachmentRequired(setting?.settingValue === 'true');
        }).catch(() => {});
    }, []);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer));
        };
    }, []);

    const saveValue = useCallback(async (krId: string, _krData: KeyResult, value: string, skipRefresh = false) => {
        // Skip if we're already saving this value (and no new file pending)
        if (lastSavedValues.current[krId] === value && !pendingFiles[krId] && !skipRefresh) {
            onUpdate();
            return;
        }

        const file = pendingFiles[krId];
        if (attachmentRequired && !file) {
            const kr = objective.keyResults.find(k => k.id === krId);
            if (!kr?.attachmentUrl) {
                setAttachmentErrors(prev => ({ ...prev, [krId]: 'Необходимо прикрепить файл-основание' }));
                return;
            }
        }
        setAttachmentErrors(prev => { const n = { ...prev }; delete n[krId]; return n; });

        setSavingIds(prev => new Set(prev).add(krId));
        try {
            await keyResultApi.updateActualValue(krId, value, file);
            lastSavedValues.current[krId] = value;
            if (file) {
                setPendingFiles(prev => { const n = { ...prev }; delete n[krId]; return n; });
            }
            if (!skipRefresh) {
                if (focusedIdRef.current === krId) {
                    focusedIdRef.current = null;
                }
                onUpdate();
            }
        } catch (error: any) {
            console.error('Failed to update key result:', error);
            const msg = error.response?.data?.message || error.response?.data || '';
            if (typeof msg === 'string' && msg.includes('Attachment is required')) {
                setAttachmentErrors(prev => ({ ...prev, [krId]: 'Необходимо прикрепить файл-основание' }));
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
            saveValue(kr.id, kr, value, true);
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
        saveValue(kr.id, kr, value, false);
    };

    const getMetricTypeLabel = (type: string) => {
        switch (type) {
            case 'HIGHER_BETTER': return '↑ Higher is better';
            case 'LOWER_BETTER': return '↓ Lower is better';
            case 'QUALITATIVE': return 'A/B/C/D/E Grade';
            default: return type;
        }
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
                { name: 'Below', value: backendThresholds[0], color: '#dc3545' },
                { name: 'Meets', value: backendThresholds[1], color: '#ffc107' },
                { name: 'Good', value: backendThresholds[2], color: '#5cb85c' },
                { name: 'Very Good', value: backendThresholds[3], color: '#28a745' },
                { name: 'Exceptional', value: backendThresholds[4], color: '#1e7b34' }
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
            // (exceptional also has index 3's value, but we read from veryGood)
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

    const handleFileSelect = (krId: string, file: File | null) => {
        if (!file) return;
        setPendingFiles(prev => ({ ...prev, [krId]: file }));
        setAttachmentErrors(prev => { const n = { ...prev }; delete n[krId]; return n; });
    };

    const getAttachmentDownloadUrl = (url: string) => {
        const base = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
        const apiBase = base.replace(/\/api\/?$/, '');
        return `${apiBase}${url}`;
    };

    return (
        <div className="border-2 border-slate-200 rounded-xl bg-gradient-to-br from-white to-slate-50 shadow-sm hover:shadow-md transition-shadow">
            <div
                className="flex items-center justify-between cursor-pointer p-5"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-slate-800 text-lg">{objective.name}</h3>
                        <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs px-3 py-1 rounded-full font-semibold">
                          {objective.weight}%
                        </span>
                    </div>
                    <p className="text-sm text-slate-500">
                        {objective.keyResults.length} Key Result{objective.keyResults.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <Speedometer score={objective.score || defaultScore} size="sm" showLabel={false} />
                    <span className="text-slate-400 text-xl">{expanded ? '▲' : '▼'}</span>
                </div>
            </div>

            {expanded && (
                <div className="px-5 pb-5 space-y-3 border-t border-slate-200 pt-4">
                    {objective.keyResults.map((kr) => (
                        <div
                            key={kr.id}
                            className="bg-white p-5 rounded-xl border-2 border-slate-100 shadow-sm hover:border-amber-200 transition-colors"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="font-bold text-slate-800">{kr.name}</span>
                                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                            {getMetricTypeLabel(kr.metricType)}
                                        </span>
                                    </div>
                                    {kr.description && (
                                        <p className="text-sm text-slate-600 mt-2">{kr.description}</p>
                                    )}

                                    {/* Threshold display */}
                                    <div className="flex flex-wrap gap-2 mt-3 text-xs">
                                        {getThresholdsForDisplay(kr).map((threshold) => (
                                            <span
                                                key={threshold.name}
                                                className="px-3 py-1.5 rounded-lg font-semibold"
                                                style={{
                                                    backgroundColor: `${threshold.color}20`,
                                                    color: threshold.color,
                                                    border: `1px solid ${threshold.color}40`
                                                }}
                                            >
                                                {threshold.name}: {threshold.value}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 ml-4">
                                    {/* Attachment — shown first so user uploads before editing */}
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="file"
                                            ref={el => { fileInputRefs.current[kr.id] = el; }}
                                            onChange={(e) => handleFileSelect(kr.id, e.target.files?.[0] || null)}
                                            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt"
                                            className="hidden"
                                        />
                                        <button
                                            onClick={() => fileInputRefs.current[kr.id]?.click()}
                                            className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                                                attachmentRequired && !kr.attachmentUrl && !pendingFiles[kr.id]
                                                    ? 'bg-red-50 text-red-600 border border-red-300 hover:bg-red-100'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                            title={attachmentRequired ? 'Файл-основание обязателен' : 'Прикрепить файл-основание'}
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                            </svg>
                                            {attachmentRequired && !kr.attachmentUrl && !pendingFiles[kr.id] ? 'Файл *' : 'Файл'}
                                        </button>
                                        {pendingFiles[kr.id] && (
                                            <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 rounded px-2 py-1">
                                                <span className="truncate max-w-[80px]">{pendingFiles[kr.id].name}</span>
                                                <button
                                                    onClick={() => setPendingFiles(prev => { const n = { ...prev }; delete n[kr.id]; return n; })}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </span>
                                        )}
                                        {!pendingFiles[kr.id] && kr.attachmentUrl && (
                                            <a
                                                href={getAttachmentDownloadUrl(kr.attachmentUrl)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 rounded px-2 py-1"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                                </svg>
                                                <span className="truncate max-w-[80px]">{kr.attachmentFileName || 'Файл'}</span>
                                            </a>
                                        )}
                                    </div>

                                    {/* Actual value input — locked until file is attached when required */}
                                    {(() => {
                                        const hasFile = !!pendingFiles[kr.id] || !!kr.attachmentUrl;
                                        const lockedByAttachment = attachmentRequired && !hasFile;
                                        const inputDisabled = savingIds.has(kr.id) || lockedByAttachment;
                                        return (
                                            <div className="flex items-center gap-2">
                                                <label className="text-sm font-semibold text-slate-600">Actual:</label>
                                                {kr.metricType === 'QUALITATIVE' ? (
                                                    <select
                                                        value={localValues[kr.id] ?? kr.actualValue ?? 'E'}
                                                        onChange={(e) => handleActualValueChange(kr, e.target.value)}
                                                        onFocus={() => handleFocus(kr.id)}
                                                        onBlur={() => handleBlur(kr)}
                                                        disabled={inputDisabled}
                                                        className="border-2 border-slate-300 rounded-lg px-3 py-2 w-20 font-semibold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50"
                                                        title={lockedByAttachment ? 'Сначала прикрепите файл-основание' : ''}
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
                                                            disabled={inputDisabled}
                                                            className="border-2 border-slate-300 rounded-lg px-3 py-2 w-28 font-semibold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50"
                                                            placeholder="0"
                                                            title={lockedByAttachment ? 'Сначала прикрепите файл-основание' : ''}
                                                        />
                                                        {savingIds.has(kr.id) && (
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {kr.unit && <span className="text-sm font-medium text-slate-500">{kr.unit}</span>}
                                            </div>
                                        );
                                    })()}

                                    {/* Score badge */}
                                    {kr.score && (
                                        <div
                                            className="px-4 py-2 rounded-full text-white text-sm font-bold shadow-md"
                                            style={{ backgroundColor: kr.score.color }}
                                        >
                                            {kr.score.score.toFixed(2)}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {attachmentErrors[kr.id] && (
                                <div className="mt-2 text-xs text-red-600 bg-red-50 rounded px-3 py-1.5">
                                    {attachmentErrors[kr.id]}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ObjectiveCard;