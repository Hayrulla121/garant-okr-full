import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Department } from '../types/okr';
import { DepartmentScoreResult } from '../types/evaluation';
import { departmentScoresApi } from '../services/api';
import MultiSpeedometerDisplay from './MultiSpeedometerDisplay';
import EvaluationPanel from './evaluations/EvaluationPanel';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types/auth';

interface Props {
    department: Department;
    onUpdate?: () => void;
    refreshTrigger?: number; // Optional prop to force refresh
}

const DepartmentDetailView: React.FC<Props> = ({ department, onUpdate, refreshTrigger }) => {
    const { user } = useAuth();
    const [scores, setScores] = useState<DepartmentScoreResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Create a stable hash of KR actual values to detect real data changes
    const krDataHash = useMemo(() => {
        const allObjectives = [
            ...department.objectives,
            ...(department.leaderObjectives || []),
        ];
        return allObjectives
            .flatMap(obj => obj.keyResults)
            .map(kr => `${kr.id}:${kr.actualValue}`)
            .join(',');
    }, [department.objectives, department.leaderObjectives]);

    // Track the last fetched state to prevent duplicate requests
    const lastFetchRef = React.useRef<string>('');
    // Track if we've done initial load
    const hasLoadedRef = React.useRef<boolean>(false);

    const fetchScores = useCallback(async () => {
        const fetchKey = `${department.id}-${krDataHash}-${refreshTrigger}`;
        // Skip if we already fetched with this exact state
        if (lastFetchRef.current === fetchKey) {
            return;
        }
        lastFetchRef.current = fetchKey;

        // Only show full loading spinner on initial load, use subtle indicator for refreshes
        if (!hasLoadedRef.current) {
            setLoading(true);
        } else {
            setIsRefreshing(true);
        }
        try {
            const response = await departmentScoresApi.getScores(department.id);
            setScores(response.data);
            hasLoadedRef.current = true;
        } catch (err) {
            console.error('Failed to fetch department scores:', err);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [department.id, krDataHash, refreshTrigger]);

    // Single useEffect that refetches when department id, data hash, or refreshTrigger changes
    useEffect(() => {
        fetchScores();
    }, [fetchScores]);

    const handleEvaluationSaved = () => {
        fetchScores();
        if (onUpdate) {
            onUpdate();
        }
    };

    const canEvaluate = user && [Role.DIRECTOR, Role.HR, Role.BUSINESS_BLOCK, Role.ADMIN, Role.DEPARTMENT_LEADER].includes(user.role);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary mx-auto"></div>
                    <p className="mt-4 text-slate-600">Loading department scores...</p>
                </div>
            </div>
        );
    }

    if (!scores) {
        return (
            <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200 text-center">
                <p className="text-slate-600">Failed to load department scores</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Multi-Speedometer Display */}
            <div className={`bg-white rounded-lg shadow p-3 border border-slate-200 ${isRefreshing ? 'opacity-70' : ''} transition-opacity`}>
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold text-gray-800">
                        {department.name} - Performance Scores
                    </h2>
                    {isRefreshing && (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <span>Updating...</span>
                        </div>
                    )}
                </div>
                <MultiSpeedometerDisplay scores={scores} />
            </div>

            {/* Evaluation Panel - Only show to users who can evaluate */}
            {canEvaluate && (
                <div className="bg-white rounded-lg shadow p-3 border border-slate-200">
                    <EvaluationPanel
                        targetType="DEPARTMENT"
                        targetId={department.id}
                        onEvaluationSaved={handleEvaluationSaved}
                    />
                </div>
            )}

            {/* Department Info - Inline compact */}
            <div className="bg-white rounded-lg shadow p-3 border border-slate-200">
                <div className="flex items-center gap-6 text-sm">
                    <h3 className="text-sm font-bold text-gray-800">Department Info:</h3>
                    <div>
                        <span className="text-gray-500">Objectives:</span>
                        <span className="ml-1 font-semibold text-gray-800">{department.objectives.length}</span>
                    </div>
                    <div>
                        <span className="text-gray-500">Key Results:</span>
                        <span className="ml-1 font-semibold text-gray-800">
                            {department.objectives.reduce((sum, obj) => sum + obj.keyResults.length, 0)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DepartmentDetailView;
