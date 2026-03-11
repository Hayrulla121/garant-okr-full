import React, { useState } from 'react';
import { evaluationApi } from '../../services/api';
import { EvaluatorType } from '../../types/evaluation';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
    targetType: 'DEPARTMENT' | 'EMPLOYEE';
    targetId: string;
    currentRating?: 'A' | 'B' | 'C' | 'D';
    currentComment?: string;
    evaluationId?: string;
    submittedAt?: string;
    updatedAt?: string;
    onSave: () => void;
    disabled?: boolean;
}

const HrEvaluationInput: React.FC<Props> = ({
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
    const [selectedLetter, setSelectedLetter] = useState<'A' | 'B' | 'C' | 'D' | null>(currentRating || null);
    const [comment, setComment] = useState<string>(currentComment || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // A = Best (0.98), D = Lowest (0.31)
    const letterGrades = [
        { letter: 'A' as const, label: t.gradeALabel, color: 'bg-green-500', hoverColor: 'hover:bg-green-600', description: t.gradeADescription, score: '0.98' },
        { letter: 'B' as const, label: t.gradeBLabel, color: 'bg-blue-500', hoverColor: 'hover:bg-blue-600', description: t.gradeBDescription, score: '0.86' },
        { letter: 'C' as const, label: t.gradeCLabel, color: 'bg-yellow-500', hoverColor: 'hover:bg-yellow-600', description: t.gradeCDescription, score: '0.51' },
        { letter: 'D' as const, label: t.gradeDLabel, color: 'bg-orange-500', hoverColor: 'hover:bg-orange-600', description: t.gradeDDescription, score: '0.31' },
    ];

    const handleSave = async (mode: 'new' | 'correct') => {
        if (!selectedLetter) {
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
                evaluatorType: EvaluatorType.HR,
                letterRating: selectedLetter,
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
            setError(err.response?.data?.message || t.failedToSaveEvaluation);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg border-2 border-blue-200 p-4">
            <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                <h3 className="text-lg font-bold text-blue-700">{t.hrEvaluation}</h3>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.performanceGrade}
                </label>
                <div className="grid grid-cols-2 gap-2">
                    {letterGrades.map(({ letter, label, color, hoverColor, description, score }) => (
                        <button
                            key={letter}
                            type="button"
                            disabled={disabled || loading}
                            onClick={() => setSelectedLetter(letter)}
                            className={`p-3 rounded-lg border-2 transition-all ${
                                selectedLetter === letter
                                    ? `${color} text-white border-transparent shadow-lg scale-105`
                                    : `bg-white border-gray-300 ${hoverColor} hover:text-white hover:border-transparent`
                            } ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            <div className="text-2xl font-bold mb-1">{letter}</div>
                            <div className="text-xs font-semibold">{label}</div>
                            <div className="text-xs mt-1 opacity-90">{description}</div>
                            <div className="text-xs mt-1 font-medium opacity-75">{t.score}: {score}</div>
                        </button>
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
                        disabled={disabled || loading || !selectedLetter}
                        title={t.newEvaluationTooltip}
                        className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {loading ? t.saving : t.newEvaluation}
                    </button>
                    <button
                        onClick={() => handleSave('correct')}
                        disabled={disabled || loading || !selectedLetter}
                        title={t.correctEvaluationTooltip}
                        className="flex-1 py-2 px-4 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {loading ? t.saving : t.correctEvaluation}
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => handleSave('new')}
                    disabled={disabled || loading || !selectedLetter}
                    className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
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

export default HrEvaluationInput;
