import React from 'react';
import { ScoreResult } from '../types/okr';
import { useLanguage } from '../i18n';
import { useScoreLevels } from '../contexts/ScoreLevelContext';

interface SpeedometerProps {
    score: ScoreResult;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    glow?: boolean;
    compact?: boolean;
}

const Speedometer: React.FC<SpeedometerProps> = ({
    score,
    size = 'md',
    showLabel = true,
    glow = false,
    compact = false
}) => {
    const { t } = useLanguage();
    const { scoreLevels } = useScoreLevels();

    const sizes = {
        sm: { width: 220, height: 150, radius: 65, strokeWidth: 16, fontSize: 20, titleSize: 'text-sm', labelFontSize: 10 },
        md: { width: 280, height: 190, radius: 85, strokeWidth: 20, fontSize: 26, titleSize: 'text-base', labelFontSize: 12 },
        lg: { width: 340, height: 230, radius: 105, strokeWidth: 24, fontSize: 32, titleSize: 'text-lg', labelFontSize: 14 },
    };

    const { width, height, radius, strokeWidth, fontSize, titleSize, labelFontSize } = sizes[size];

    const centerX = width / 2;
    const centerY = height - 20;

    const minScore = scoreLevels.length > 0 ? scoreLevels[0].scoreValue : 0.0;
    const maxScore = scoreLevels.length > 0 ? scoreLevels[scoreLevels.length - 1].scoreValue : 1.0;
    const scoreRange = maxScore - minScore;

    const normalizedScore = Math.max(minScore, Math.min(maxScore, score.score));
    const percentage = ((normalizedScore - minScore) / scoreRange) * 100;
    const angle = 180 - (percentage / 100) * 180;

    const createArcPath = (startAngle: number, endAngle: number, r: number) => {
        const start = (180 - startAngle) * (Math.PI / 180);
        const end = (180 - endAngle) * (Math.PI / 180);

        const x1 = centerX + r * Math.cos(start);
        const y1 = centerY - r * Math.sin(start);
        const x2 = centerX + r * Math.cos(end);
        const y2 = centerY - r * Math.sin(end);

        const largeArc = (startAngle - endAngle) > 180 ? 1 : 0;

        return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
    };

    const scoreRanges = scoreLevels.length > 1 ? scoreLevels.slice(0, -1).map((level, index) => {
        const nextLevel = scoreLevels[index + 1];
        const startPct = ((level.scoreValue - minScore) / scoreRange) * 100;
        const endPct = ((nextLevel.scoreValue - minScore) / scoreRange) * 100;
        return {
            start: startPct,
            end: endPct,
            color: level.color,
        };
    }) : [
        { start: 0, end: 62.5, color: '#dc3545' },
        { start: 62.5, end: 75, color: '#ffc107' },
        { start: 75, end: 100, color: '#28a745' },
    ];

    const needleAngle = (angle * Math.PI) / 180;
    const needleLength = radius - 10;
    const needleX = centerX + needleLength * Math.cos(needleAngle);
    const needleY = centerY - needleLength * Math.sin(needleAngle);

    const minorTicks = scoreLevels.length > 0
        ? scoreLevels.map(level => level.scoreValue)
        : [0.0, 0.25, 0.5, 0.75, 1.0];

    const labels = scoreLevels.length > 0
        ? scoreLevels.map(level => ({
            value: level.scoreValue,
            label: level.scoreValue.toFixed(2)
        }))
        : [
            { value: 0.0, label: '0.0' },
            { value: 0.25, label: '0.25' },
            { value: 0.5, label: '0.5' },
            { value: 0.75, label: '0.75' },
            { value: 1.0, label: '1.0' }
        ];

    const getLevelDisplayName = () => {
        if (scoreLevels.length === 0) {
            // Fallback to translated level names
            switch (score.level) {
                case 'исключительно': return t.exceptional;
                case 'превышает_ожидания': return t.veryGood;
                case 'на_уровне_ожиданий': return t.good;
                case 'ниже_ожиданий': return t.meets;
                default: return t.below;
            }
        }
        for (let i = scoreLevels.length - 1; i >= 0; i--) {
            if (score.score >= scoreLevels[i].scoreValue) {
                return scoreLevels[i].name;
            }
        }
        return scoreLevels[0]?.name || score.level;
    };

    const glowStyle = glow ? {
        filter: `drop-shadow(0 0 20px ${score.color}) drop-shadow(0 0 40px ${score.color}40)`,
    } : {};

    return (
        <div className={`flex flex-col items-center w-full ${compact ? 'gap-1' : ''}`}>
            {!compact && (
                <div className="flex items-center gap-2 mb-3">
                    <div className="rounded-full bg-red-100 flex items-center justify-center w-6 h-6">
                        <svg className="text-red-600 w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <span className={`font-bold text-slate-800 ${titleSize}`}>
                        {t.rating}
                    </span>
                </div>
            )}

            <div className="relative" style={glowStyle}>
                <svg width={width} height={height} className="overflow-visible">
                    {scoreRanges.map((range, index) => (
                        <path
                            key={index}
                            d={createArcPath(range.start * 1.8, range.end * 1.8, radius)}
                            fill="none"
                            stroke={range.color}
                            strokeWidth={strokeWidth}
                            strokeLinecap="butt"
                        />
                    ))}

                    {minorTicks.map((value) => {
                        const tickPct = ((value - minScore) / scoreRange) * 100;
                        const tickAngle = (180 - (tickPct / 100) * 180) * (Math.PI / 180);
                        const tickInner = radius - strokeWidth - 8;
                        const tickOuter = radius - strokeWidth + 2;

                        return (
                            <line
                                key={value}
                                x1={centerX + tickInner * Math.cos(tickAngle)}
                                y1={centerY - tickInner * Math.sin(tickAngle)}
                                x2={centerX + tickOuter * Math.cos(tickAngle)}
                                y2={centerY - tickOuter * Math.sin(tickAngle)}
                                stroke="#999"
                                strokeWidth={1.5}
                            />
                        );
                    })}

                    {labels.map((tick) => {
                        const tickPct = ((tick.value - minScore) / scoreRange) * 100;
                        const tickAngle = (180 - (tickPct / 100) * 180) * (Math.PI / 180);
                        const labelRadius = radius + 18;

                        return (
                            <text
                                key={tick.value}
                                x={centerX + labelRadius * Math.cos(tickAngle)}
                                y={centerY - labelRadius * Math.sin(tickAngle) + 5}
                                textAnchor="middle"
                                fontSize={labelFontSize}
                                fontWeight="700"
                                fill="#1e293b"
                            >
                                {tick.label}
                            </text>
                        );
                    })}

                    {/* Red triangle needle */}
                    <polygon
                        points={(() => {
                            // Calculate triangle points for the needle
                            const baseWidth = size === 'lg' ? 12 : size === 'md' ? 10 : 8;
                            const tipLength = needleLength;

                            // Perpendicular angle for base width
                            const perpAngle = needleAngle + Math.PI / 2;

                            // Tip of the needle (pointing outward)
                            const tipX = centerX + tipLength * Math.cos(needleAngle);
                            const tipY = centerY - tipLength * Math.sin(needleAngle);

                            // Base points (at center, spread perpendicular to needle direction)
                            const base1X = centerX + (baseWidth / 2) * Math.cos(perpAngle);
                            const base1Y = centerY - (baseWidth / 2) * Math.sin(perpAngle);
                            const base2X = centerX - (baseWidth / 2) * Math.cos(perpAngle);
                            const base2Y = centerY + (baseWidth / 2) * Math.sin(perpAngle);

                            return `${tipX},${tipY} ${base1X},${base1Y} ${base2X},${base2Y}`;
                        })()}
                        fill="#dc2626"
                        stroke="#991b1b"
                        strokeWidth={1}
                    />

                    <circle
                        cx={centerX}
                        cy={centerY}
                        r={size === 'lg' ? 8 : size === 'md' ? 6 : 5}
                        fill="#dc2626"
                        stroke="#991b1b"
                        strokeWidth={2}
                    />

                    <text
                        x={centerX}
                        y={centerY + (size === 'lg' ? 50 : size === 'md' ? 40 : 32)}
                        textAnchor="middle"
                        fontSize={fontSize}
                        fontWeight="bold"
                        fill="#0f172a"
                    >
                        {score.score.toFixed(2)}
                    </text>
                </svg>
            </div>

            {showLabel && (
                <div
                    className={`${compact ? 'mt-4 py-2 px-3' : 'mt-8 py-4 px-5'} w-full rounded-lg font-bold text-white shadow-lg`}
                    style={{
                        backgroundColor: score.color,
                        boxShadow: glow ? `0 4px 20px ${score.color}60` : undefined
                    }}
                >
                    <div className={`text-center font-bold tracking-wide ${compact ? 'text-sm' : 'text-base'}`}>
                        {getLevelDisplayName()}
                    </div>
                    <div className={`text-center mt-1 opacity-95 font-semibold ${compact ? 'text-xs' : 'text-sm mt-1.5'}`}>
                        {score.score.toFixed(2)} ({percentage.toFixed(1)}%)
                    </div>
                </div>
            )}
        </div>
    );
};

export default Speedometer;
