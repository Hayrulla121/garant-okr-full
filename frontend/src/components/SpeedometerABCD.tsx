import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

interface Props {
    value?: 'A' | 'B' | 'C' | 'D';
    title: string;
    subtitle?: string;
    size?: 'sm' | 'md' | 'lg';
}

const SpeedometerABCD: React.FC<Props> = ({ value, title, subtitle, size = 'md' }) => {
    const { t } = useLanguage();

    // A = Best (Outstanding, 0.98), D = Lowest (Needs Improvement, 0.31)
    const getColorForGrade = (grade: string) => {
        switch (grade) {
            case 'A': return { bg: '#22c55e', text: '#ffffff' }; // green - Outstanding (Best)
            case 'B': return { bg: '#3b82f6', text: '#ffffff' }; // blue - Exceeds
            case 'C': return { bg: '#eab308', text: '#ffffff' }; // yellow - Meets
            case 'D': return { bg: '#f97316', text: '#ffffff' }; // orange - Needs Improvement (Lowest)
            default: return { bg: '#d1d5db', text: '#6b7280' }; // gray
        }
    };

    const getSizeClasses = () => {
        switch (size) {
            case 'sm': return { container: 'w-32 h-32', letter: 'text-5xl', title: 'text-xs', subtitle: 'text-xs' };
            case 'lg': return { container: 'w-56 h-56', letter: 'text-8xl', title: 'text-lg', subtitle: 'text-sm' };
            default: return { container: 'w-40 h-40', letter: 'text-6xl', title: 'text-sm', subtitle: 'text-xs' };
        }
    };

    // A = Best (0.98), D = Lowest (0.31)
    const getDescriptionForGrade = (grade: string) => {
        switch (grade) {
            case 'A': return t.gradeALabel;      // 0.98 - Best
            case 'B': return t.gradeBLabel;      // 0.86
            case 'C': return t.gradeCLabel;      // 0.51
            case 'D': return t.gradeDLabel;      // 0.31 - Lowest
            default: return t.notEvaluated;
        }
    };

    const color = getColorForGrade(value || '');
    const sizeClasses = getSizeClasses();

    return (
        <div className="flex flex-col items-center">
            <h3 className={`font-bold text-gray-700 mb-2 text-center ${sizeClasses.title}`}>
                {title}
            </h3>
            {subtitle && (
                <p className={`text-gray-500 mb-2 text-center ${sizeClasses.subtitle}`}>
                    {subtitle}
                </p>
            )}

            <div
                className={`${sizeClasses.container} rounded-full flex items-center justify-center shadow-lg relative`}
                style={{ backgroundColor: color.bg }}
            >
                {/* Decorative rings */}
                <div className="absolute inset-0 rounded-full border-4 border-white opacity-20"></div>
                <div className="absolute inset-4 rounded-full border-4 border-white opacity-30"></div>

                {/* Letter grade */}
                <div className="relative z-10 flex flex-col items-center">
                    <div
                        className={`font-bold ${sizeClasses.letter}`}
                        style={{ color: color.text }}
                    >
                        {value || '—'}
                    </div>
                    <div
                        className="text-xs font-semibold mt-1"
                        style={{ color: color.text }}
                    >
                        {getDescriptionForGrade(value || '')}
                    </div>
                </div>

                {/* Glow effect */}
                {value && (
                    <div
                        className="absolute inset-0 rounded-full opacity-50 blur-xl"
                        style={{ backgroundColor: color.bg }}
                    ></div>
                )}
            </div>

            {/* Legend - A (Best) to D (Lowest) */}
            <div className="mt-3 text-center">
                <div className="grid grid-cols-4 gap-1 text-xs">
                    {['A', 'B', 'C', 'D'].map((grade) => {
                        const gradeColor = getColorForGrade(grade);
                        return (
                            <div
                                key={grade}
                                className={`px-2 py-1 rounded font-semibold ${value === grade ? 'ring-2 ring-offset-2' : 'opacity-50'}`}
                                style={{
                                    backgroundColor: gradeColor.bg,
                                    color: gradeColor.text,
                                    ...(value === grade ? { '--tw-ring-color': gradeColor.bg } as any : {})
                                }}
                            >
                                {grade}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default SpeedometerABCD;
