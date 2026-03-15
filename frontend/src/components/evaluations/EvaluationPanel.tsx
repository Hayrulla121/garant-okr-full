import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../types/auth';
import { Evaluation, EvaluatorType } from '../../types/evaluation';
import { evaluationApi } from '../../services/api';
import DirectorEvaluationInput from './DirectorEvaluationInput';
import HrEvaluationInput from './HrEvaluationInput';
import BusinessBlockEvaluationInput from './BusinessBlockEvaluationInput';
import { useLanguage } from '../../i18n';

interface Props {
    targetType: 'DEPARTMENT' | 'EMPLOYEE';
    targetId: string;
    onEvaluationSaved?: () => void;
}

const EvaluationPanel: React.FC<Props> = ({ targetType, targetId, onEvaluationSaved }) => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [loading, setLoading] = useState(true);

    // Track last fetch to prevent duplicate requests
    const lastFetchRef = React.useRef<string>('');

    const fetchEvaluations = async () => {
        const fetchKey = `${targetType}-${targetId}`;
        if (lastFetchRef.current === fetchKey && evaluations.length > 0) {
            setLoading(false);
            return;
        }
        lastFetchRef.current = fetchKey;

        try {
            const response = await evaluationApi.getForTarget(targetType, targetId);
            setEvaluations(response.data);
        } catch (err) {
            console.error('Failed to fetch evaluations:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvaluations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targetType, targetId]);

    const handleEvaluationSaved = () => {
        // Reset fetch key so re-fetch always happens after save
        lastFetchRef.current = '';
        fetchEvaluations();
        if (onEvaluationSaved) {
            onEvaluationSaved();
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">{t.loadingEvaluations}</p>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    // Find the LATEST evaluation from current user BY EVALUATOR TYPE
    // Sort by createdAt descending so .find() returns the most recent
    const sortedEvals = [...evaluations].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const directorEvaluation = sortedEvals.find(
        e => e.evaluatorId === user.id && String(e.evaluatorType) === String(EvaluatorType.DIRECTOR)
    );
    const hrEvaluation = sortedEvals.find(
        e => e.evaluatorId === user.id && String(e.evaluatorType) === String(EvaluatorType.HR)
    );
    const businessBlockEvaluation = sortedEvals.find(
        e => e.evaluatorId === user.id && String(e.evaluatorType) === String(EvaluatorType.BUSINESS_BLOCK)
    );


    // Determine if user can evaluate based on role
    const canEvaluateAsDirector = user.role === Role.DIRECTOR || user.role === Role.ADMIN || user.role === Role.DEPARTMENT_LEADER;
    const canEvaluateAsHR = user.role === Role.HR || user.role === Role.ADMIN;
    const canEvaluateAsBusinessBlock = user.role === Role.BUSINESS_BLOCK || user.role === Role.ADMIN;

    // Business Block can only evaluate departments
    const canEvaluateAsBusinessBlockForTarget = canEvaluateAsBusinessBlock && targetType === 'DEPARTMENT';

    const hasPermission = canEvaluateAsDirector || canEvaluateAsHR || canEvaluateAsBusinessBlockForTarget;

    // Check if user has already submitted evaluations for each type they can do
    const hasSubmittedDirector = directorEvaluation && directorEvaluation.status !== 'DRAFT';
    const hasSubmittedHR = hrEvaluation && hrEvaluation.status !== 'DRAFT';
    const hasSubmittedBusinessBlock = businessBlockEvaluation && businessBlockEvaluation.status !== 'DRAFT';

    // Check if all available evaluation types are already submitted
    const allEvaluationsSubmitted =
        (!canEvaluateAsDirector || hasSubmittedDirector) &&
        (!canEvaluateAsHR || hasSubmittedHR) &&
        (!canEvaluateAsBusinessBlockForTarget || hasSubmittedBusinessBlock);

    if (!hasPermission) {
        return (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="text-sm text-gray-600">
                    {t.noPermissionToEvaluate} {targetType.toLowerCase()}.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                    {t.onlyEvaluatorsCanProvide}
                </p>
            </div>
        );
    }

    // Note: We no longer early return here - evaluations can be edited after submission

    // Convert numeric rating back to stars for Director (find closest score level)
    const convertNumericToStars = (numericRating: number | undefined): number | undefined => {
        if (numericRating === undefined) return undefined;
        const levelValues = [0.0, 0.31, 0.51, 0.86, 0.98];
        let best = 0;
        for (let i = 1; i < levelValues.length; i++) {
            if (Math.abs(numericRating - levelValues[i]) < Math.abs(numericRating - levelValues[best])) {
                best = i;
            }
        }
        return best + 1;
    };

    return (
        <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">
                {allEvaluationsSubmitted ? t.yourEvaluations : t.provideYourEvaluation}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {canEvaluateAsDirector && (
                    <DirectorEvaluationInput
                        targetType={targetType}
                        targetId={targetId}
                        currentRating={convertNumericToStars(directorEvaluation?.numericRating)}
                        currentComment={directorEvaluation?.comment}
                        evaluationId={directorEvaluation?.id}
                        submittedAt={directorEvaluation?.submittedAt}
                        updatedAt={directorEvaluation?.updatedAt}
                        onSave={handleEvaluationSaved}
                        titleOverride={user.role === Role.DEPARTMENT_LEADER ? t.leaderEvaluation : undefined}
                    />
                )}

                {canEvaluateAsHR && (
                    <HrEvaluationInput
                        targetType={targetType}
                        targetId={targetId}
                        currentRating={hrEvaluation?.letterRating as 'A' | 'B' | 'C' | 'D' | undefined}
                        currentComment={hrEvaluation?.comment}
                        evaluationId={hrEvaluation?.id}
                        submittedAt={hrEvaluation?.submittedAt}
                        updatedAt={hrEvaluation?.updatedAt}
                        onSave={handleEvaluationSaved}
                    />
                )}

                {canEvaluateAsBusinessBlockForTarget && (
                    <BusinessBlockEvaluationInput
                        targetType={targetType}
                        targetId={targetId}
                        currentRating={businessBlockEvaluation?.numericRating}
                        currentComment={businessBlockEvaluation?.comment}
                        evaluationId={businessBlockEvaluation?.id}
                        submittedAt={businessBlockEvaluation?.submittedAt}
                        updatedAt={businessBlockEvaluation?.updatedAt}
                        onSave={handleEvaluationSaved}
                    />
                )}
            </div>
        </div>
    );
};

export default EvaluationPanel;
