import React, { useState } from 'react';
import { evaluationApi } from '../../services/api';
import { EvaluatorType } from '../../types/evaluation';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
    targetType: 'DEPARTMENT' | 'EMPLOYEE';
    targetId: string;
    currentRating?: number; // 1-5
    currentComment?: string;
    evaluationId?: string;
    submittedAt?: string;
    updatedAt?: string;
    onSave: () => void;
    disabled?: boolean;
}

const BusinessBlockEvaluationInput: React.FC<Props> = ({
    targetType,
    targetId,
    currentRating,
    currentComment,
    evaluationId,
    submittedAt,
    updatedAt,
    onSave,
    disabled = false
}) => {
    const { t } = useLanguage();
    const [stars, setStars] = useState<number>(currentRating || 0);
    const [comment, setComment] = useState<string>(currentComment || '');
    const [hoveredStar, setHoveredStar] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Same star labels as Director evaluation (1-5 scale)
    const starLabels = [
        { stars: 1, label: t.star1Label, score: '0.0' },
        { stars: 2, label: t.star2Label, score: '0.31' },
        { stars: 3, label: t.star3Label, score: '0.51' },
        { stars: 4, label: t.star4Label, score: '0.86' },
        { stars: 5, label: t.star5Label, score: '0.98' },
    ];

    const handleSave = async (mode: 'new' | 'correct') => {
        if (stars === 0) {
            setError(t.pleaseSelectRating);
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const data = {
                targetType,
                targetId,
                evaluatorType: EvaluatorType.BUSINESS_BLOCK,
                numericRating: stars,
                comment: comment.trim() || undefined
            };

            if (mode === 'correct' && evaluationId) {
                // Correct existing evaluation (modifies in-place, no new record)
                await evaluationApi.update(evaluationId, data);
            } else {
                // Create new evaluation record
                await evaluationApi.create(data);
            }

            setSuccess(true);
            setTimeout(() => {
                onSave();
            }, 1000);
        } catch (err: any) {
            const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || t.failedToSaveEvaluation;
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const renderStar = (position: number) => {
        const filled = (hoveredStar || stars) >= position;

        return (
            <button
                key={position}
                type="button"
                disabled={disabled || loading}
                onMouseEnter={() => setHoveredStar(position)}
                onMouseLeave={() => setHoveredStar(0)}
                onClick={() => setStars(position)}
                className={`text-4xl transition-all duration-150 ${
                    disabled || loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110'
                }`}
            >
                {filled ? (
                    <span className="text-gray-400">★</span>
                ) : (
                    <span className="text-gray-300">☆</span>
                )}
            </button>
        );
    };

    return (
        <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                </svg>
                <h3 className="text-lg font-bold text-gray-700">{t.businessBlockEvaluation}</h3>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.starRating}
                </label>
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(renderStar)}
                </div>
                {(hoveredStar > 0 || stars > 0) && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                        <p className="font-semibold text-gray-700">
                            {starLabels[(hoveredStar || stars) - 1].stars} {'★'.repeat((hoveredStar || stars))}: {starLabels[(hoveredStar || stars) - 1].label}
                        </p>
                        <p className="text-xs text-gray-600">
                            {t.score}: {starLabels[(hoveredStar || stars) - 1].score}
                        </p>
                    </div>
                )}
                <div className="mt-2 text-xs text-gray-500">
                    <p className="font-medium mb-1">{t.ratingGuide}</p>
                    {starLabels.map(({ stars: s, label, score }) => (
                        <p key={s} className="ml-2">{s} {'★'.repeat(s)}{'☆'.repeat(5-s)} = {label} ({score})</p>
                    ))}
                </div>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.commentOptional}
                </label>
                <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    disabled={disabled || loading}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
                    placeholder={t.addYourComments}
                />
            </div>

            {error && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                    {t.evaluationSavedSuccessfully}
                </div>
            )}

            {evaluationId ? (
                <div className="flex gap-2">
                    <button
                        onClick={() => handleSave('new')}
                        disabled={disabled || loading || stars === 0}
                        title={t.newEvaluationTooltip}
                        className="flex-1 py-2 px-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {loading ? t.saving : t.newEvaluation}
                    </button>
                    <button
                        onClick={() => handleSave('correct')}
                        disabled={disabled || loading || stars === 0}
                        title={t.correctEvaluationTooltip}
                        className="flex-1 py-2 px-4 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {loading ? t.saving : t.correctEvaluation}
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => handleSave('new')}
                    disabled={disabled || loading || stars === 0}
                    className="w-full py-2 px-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {loading ? t.saving : t.submitEvaluation}
                </button>
            )}

            {submittedAt && (
                <div className="mt-3 pt-2 border-t border-gray-100 text-xs text-gray-400">
                    <span>{t.submitted}: {new Date(submittedAt).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    {updatedAt && updatedAt !== submittedAt && (
                        <span className="ml-2">| {t.lastUpdated}: {new Date(updatedAt).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                </div>
            )}
        </div>
    );
};

export default BusinessBlockEvaluationInput;
