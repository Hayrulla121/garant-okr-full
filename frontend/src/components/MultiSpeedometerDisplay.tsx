import React from 'react';
import Speedometer from './Speedometer';
import SpeedometerABCD from './SpeedometerABCD';
import { DepartmentScoreResult } from '../types/evaluation';
import { ScoreResult } from '../types/okr';
import { useLanguage } from '../i18n/LanguageContext';
import { getImageUrl } from '../utils/imageUrl';

interface Props {
    scores: DepartmentScoreResult;
}

const formatTimestamp = (dateStr?: string): string => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

const MultiSpeedometerDisplay: React.FC<Props> = ({ scores }) => {
    const { t } = useLanguage();
    // Convert numeric scores to ScoreResult format for existing Speedometer component
    const createScoreResult = (score: number | undefined, label: string): ScoreResult => {
        if (score === undefined || score === null) {
            return { score: 0, level: 'не_соответствует', color: '#d1d5db', percentage: 0 };
        }

        let level: ScoreResult['level'];
        let color: string;

        if (score >= 0.98) {
            level = 'исключительно';
            color = '#1e7b34';
        } else if (score >= 0.86) {
            level = 'превышает_ожидания';
            color = '#28a745';
        } else if (score >= 0.51) {
            level = 'на_уровне_ожиданий';
            color = '#5cb85c';
        } else if (score >= 0.31) {
            level = 'ниже_ожиданий';
            color = '#f0ad4e';
        } else {
            level = 'не_соответствует';
            color = '#d9534f';
        }

        const percentage = (score / 1.0) * 100;

        return {
            score,
            level,
            color,
            percentage: Math.max(0, Math.min(100, percentage))
        };
    };

    const autoScore = createScoreResult(scores.automaticOkrScore, 'Automatic OKR');
    const directorScore = createScoreResult(scores.directorEvaluation, 'Director');
    const businessBlockScore = createScoreResult(scores.businessBlockEvaluation, 'Business Block');
    const finalScore = createScoreResult(scores.finalCombinedScore, 'Final');

    return (
        <div className="space-y-3">
            {/* Main weighted scores - OKR larger, others compact */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {/* Automatic OKR Score (40% when all 4 present, 60% when 3) - Larger */}
                <div className="md:col-span-2 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg shadow-lg p-4 border-2 border-gray-300">
                    <div className="flex items-center justify-center mb-2">
                        <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        <span className="text-blue-700 font-bold text-sm">{scores.hasBusinessBlockEvaluation ? '40%' : '60%'} {t.weight}</span>
                    </div>
                    <Speedometer
                        score={autoScore}
                        size="md"
                        compact={true}
                        glow={true}
                    />
                    <p className="text-center mt-2 text-sm text-blue-700 font-semibold">
                        {t.automaticOkrScore}
                    </p>
                </div>

                {/* Director Evaluation (20%) */}
                <div className="bg-white rounded-lg shadow p-3 border border-purple-200">
                    <div className="flex items-center justify-center mb-1">
                        <svg className="w-4 h-4 text-purple-600 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-purple-600 font-bold text-xs">20% {t.weight}</span>
                    </div>
                    {scores.hasDirectorEvaluation ? (
                        <>
                            {scores.directorName && (
                                <div className="flex flex-col items-center justify-center mb-2 mt-1">
                                    {scores.directorAvatar ? (
                                        <img src={getImageUrl(scores.directorAvatar)} alt={scores.directorName} className="w-10 h-10 rounded-full object-cover border-2 border-purple-200 mb-1" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center border-2 border-purple-200 mb-1">
                                            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                    )}
                                    <span className="text-sm font-bold text-gray-800">{scores.directorName}</span>
                                </div>
                            )}
                            <Speedometer
                                score={directorScore}
                                size="sm"
                                compact={true}
                                glow={true}
                            />
                            <p className="text-center mt-1 text-xs text-gray-600 font-medium">
                                {t.directorEvaluation}
                            </p>
                            {scores.directorStars && (
                                <p className="text-center text-xs text-gray-500">
                                    {'★'.repeat(scores.directorStars)}{'☆'.repeat(5 - scores.directorStars)}
                                </p>
                            )}
                            {scores.directorComment && (
                                <div className="mt-1 p-1.5 bg-purple-50 rounded text-xs text-purple-700 italic truncate" title={scores.directorComment}>
                                    "{scores.directorComment}"
                                </div>
                            )}
                            {scores.directorSubmittedAt && (
                                <div className="mt-1.5 pt-1 border-t border-gray-100 text-xs text-gray-400 text-center">
                                    <div>{t.submitted}: {formatTimestamp(scores.directorSubmittedAt)}</div>
                                    {scores.directorUpdatedAt && scores.directorUpdatedAt !== scores.directorSubmittedAt && (
                                        <div>{t.lastUpdated}: {formatTimestamp(scores.directorUpdatedAt)}</div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-24">
                            <svg className="w-8 h-8 text-gray-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <p className="text-xs text-gray-500 font-medium">{t.notEvaluated}</p>
                            <p className="text-xs text-gray-400">{t.awaitingDirectorRating}</p>
                        </div>
                    )}
                </div>

                {/* HR Evaluation (20%) */}
                <div className="bg-white rounded-lg shadow p-3 border border-blue-200">
                    <div className="flex items-center justify-center mb-1">
                        <svg className="w-4 h-4 text-blue-600 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                        </svg>
                        <span className="text-blue-600 font-bold text-xs">20% {t.weight}</span>
                    </div>
                    {scores.hasHrEvaluation ? (
                        <>
                            {scores.hrName && (
                                <div className="flex flex-col items-center justify-center mb-2 mt-1">
                                    {scores.hrAvatar ? (
                                        <img src={getImageUrl(scores.hrAvatar)} alt={scores.hrName} className="w-10 h-10 rounded-full object-cover border-2 border-blue-200 mb-1" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-200 mb-1">
                                            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                    )}
                                    <span className="text-sm font-bold text-gray-800">{scores.hrName}</span>
                                </div>
                            )}
                            <SpeedometerABCD
                                value={scores.hrEvaluationLetter as 'A' | 'B' | 'C' | 'D'}
                                title={t.hrEvaluation}
                                subtitle={t.performanceGrade}
                                size="sm"
                            />
                            {scores.hrComment && (
                                <div className="mt-1 p-1.5 bg-blue-50 rounded text-xs text-blue-700 italic truncate" title={scores.hrComment}>
                                    "{scores.hrComment}"
                                </div>
                            )}
                            {scores.hrSubmittedAt && (
                                <div className="mt-1.5 pt-1 border-t border-gray-100 text-xs text-gray-400 text-center">
                                    <div>{t.submitted}: {formatTimestamp(scores.hrSubmittedAt)}</div>
                                    {scores.hrUpdatedAt && scores.hrUpdatedAt !== scores.hrSubmittedAt && (
                                        <div>{t.lastUpdated}: {formatTimestamp(scores.hrUpdatedAt)}</div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-24">
                            <svg className="w-8 h-8 text-gray-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <p className="text-xs text-gray-500 font-medium">{t.notEvaluated}</p>
                            <p className="text-xs text-gray-400">{t.awaitingHrRating}</p>
                        </div>
                    )}
                </div>

                {/* Business Block Evaluation (20% when included) */}
                <div className="bg-white rounded-lg shadow p-3 border border-gray-200">
                    <div className="flex items-center justify-center mb-1">
                        <svg className="w-4 h-4 text-gray-600 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-600 font-bold text-xs">
                            {scores.hasBusinessBlockEvaluation ? `20% ${t.weight}` : t.businessBlockEvaluation}
                        </span>
                    </div>
                    {scores.hasBusinessBlockEvaluation ? (
                        <>
                            {scores.businessBlockName && (
                                <div className="flex flex-col items-center justify-center mb-2 mt-1">
                                    {scores.businessBlockAvatar ? (
                                        <img src={getImageUrl(scores.businessBlockAvatar)} alt={scores.businessBlockName} className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 mb-1" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200 mb-1">
                                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                    )}
                                    <span className="text-sm font-bold text-gray-800">{scores.businessBlockName}</span>
                                </div>
                            )}
                            <Speedometer
                                score={businessBlockScore}
                                size="sm"
                                compact={true}
                                glow={true}
                            />
                            <p className="text-center mt-1 text-xs text-gray-600 font-medium">
                                {t.businessBlockEvaluation}
                            </p>
                            {scores.businessBlockStars && (
                                <p className="text-center text-xs text-gray-500">
                                    {'★'.repeat(scores.businessBlockStars)}{'☆'.repeat(5 - scores.businessBlockStars)}
                                </p>
                            )}
                            {scores.businessBlockComment && (
                                <div className="mt-1 p-1.5 bg-gray-50 rounded text-xs text-gray-700 italic truncate" title={scores.businessBlockComment}>
                                    "{scores.businessBlockComment}"
                                </div>
                            )}
                            {scores.businessBlockSubmittedAt && (
                                <div className="mt-1.5 pt-1 border-t border-gray-100 text-xs text-gray-400 text-center">
                                    <div>{t.submitted}: {formatTimestamp(scores.businessBlockSubmittedAt)}</div>
                                    {scores.businessBlockUpdatedAt && scores.businessBlockUpdatedAt !== scores.businessBlockSubmittedAt && (
                                        <div>{t.lastUpdated}: {formatTimestamp(scores.businessBlockUpdatedAt)}</div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-24">
                            <svg className="w-8 h-8 text-gray-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <p className="text-xs text-gray-500 font-medium">{t.notEvaluated}</p>
                            <p className="text-xs text-gray-400">{t.awaitingBusinessRating}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Final Combined Score */}
            <div className="grid grid-cols-1 gap-3">

                {/* Final Combined Score - Prominent but compact */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg shadow-lg p-3 border-2 border-primary relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0 bg-primary"></div>
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-center mb-2">
                            <svg className="w-5 h-5 text-primary mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <h2 className="text-lg font-bold bg-primary bg-clip-text text-transparent">
                                {t.finalCombinedScore}
                            </h2>
                        </div>

                        {scores.finalCombinedScore ? (
                            <div className="flex items-center justify-center gap-6">
                                <Speedometer
                                    score={finalScore}
                                    size="md"
                                    compact={true}
                                    glow={true}
                                />
                                <div className="text-left">
                                    <p className="text-xs text-gray-600 font-medium mb-1">
                                        {scores.hasBusinessBlockEvaluation
                                            ? t.weightedFormulaWithBusiness
                                            : t.weightedFormula
                                        }
                                    </p>
                                    <div className="text-xs text-gray-500 space-y-0.5">
                                        <div>OKR: {scores.automaticOkrScore?.toFixed(2) || 'N/A'} × {scores.hasBusinessBlockEvaluation ? '40%' : '60%'}</div>
                                        <div>Director: {scores.directorEvaluation?.toFixed(2) || 'N/A'} × 20%</div>
                                        <div>HR: {scores.hrEvaluationNumeric?.toFixed(2) || 'N/A'} × 20%</div>
                                        {scores.hasBusinessBlockEvaluation && (
                                            <div>Business: {scores.businessBlockEvaluation?.toFixed(2) || 'N/A'} × 20%</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-4 py-4">
                                <svg className="w-12 h-12 text-primary opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                <div>
                                    <p className="text-sm text-gray-700 font-semibold">{t.finalScoreNotAvailable}</p>
                                    <p className="text-xs text-gray-500">{t.requiresAllEvaluations}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MultiSpeedometerDisplay;
