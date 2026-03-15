import React, { useEffect, useState } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import { ScoreSnapshot } from '../types/okr';
import { scoreHistoryApi } from '../services/api';

// Stable color palette for department lines
const LINE_COLORS = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6',
];

const QUARTER_NAMES: Record<number, string> = {
    1: 'Квартал 1', 2: 'Квартал 2', 3: 'Квартал 3', 4: 'Квартал 4',
};

function monthToQuarter(month: number): number {
    return Math.ceil(month / 3);
}

interface OrgScoreChartProps {
    height?: number;
    refreshKey?: number;
}

interface ChartDataPoint {
    label: string;
    [departmentName: string]: number | string | undefined;
}

const OrgScoreChart: React.FC<OrgScoreChartProps> = ({ height = 220, refreshKey }) => {
    const [snapshots, setSnapshots] = useState<ScoreSnapshot[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        scoreHistoryApi.getHistory('DEPARTMENT')
            .then(res => setSnapshots(res.data))
            .catch(err => console.error('Failed to load score history', err))
            .finally(() => setLoading(false));
    }, [refreshKey]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                Loading...
            </div>
        );
    }

    if (snapshots.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                No history data — close a month or load demo data
            </div>
        );
    }

    // Build unique quarters in order
    const quarterSet = new Map<string, { year: number; quarter: number }>();
    for (const s of snapshots) {
        const q = monthToQuarter(s.month);
        const key = `${QUARTER_NAMES[q]} ${s.year}`;
        if (!quarterSet.has(key)) {
            quarterSet.set(key, { year: s.year, quarter: q });
        }
    }
    const quarters = Array.from(quarterSet.entries())
        .sort((a, b) => a[1].year - b[1].year || a[1].quarter - b[1].quarter)
        .map(([label, info]) => ({ label, ...info }));

    // Build unique department names
    const deptNames = Array.from(new Set(snapshots.map(s => s.targetName)));

    // Build chart data: one row per quarter, each dept score averaged across months in that quarter
    const data: ChartDataPoint[] = quarters.map(({ label, quarter, year }) => {
        const point: ChartDataPoint = { label };
        const qMonths = [(quarter - 1) * 3 + 1, (quarter - 1) * 3 + 2, (quarter - 1) * 3 + 3];
        for (const name of deptNames) {
            const qSnaps = snapshots.filter(
                s => qMonths.includes(s.month) && s.year === year && s.targetName === name
            );
            if (qSnaps.length > 0) {
                const avg = qSnaps.reduce((sum, s) => sum + s.score, 0) / qSnaps.length;
                point[name] = Math.round(avg * 100) / 100;
            } else {
                point[name] = 0;
            }
        }
        return point;
    });

    // Calculate overall average per quarter for reference line data
    const avgData = quarters.map(({ quarter, year }) => {
        const qMonths = [(quarter - 1) * 3 + 1, (quarter - 1) * 3 + 2, (quarter - 1) * 3 + 3];
        const qSnaps = snapshots.filter(s => qMonths.includes(s.month) && s.year === year);
        const avg = qSnaps.length > 0
            ? qSnaps.reduce((sum, s) => sum + s.score, 0) / qSnaps.length
            : 0;
        return Math.round(avg * 100) / 100;
    });
    data.forEach((point, i) => {
        point['__avg__'] = avgData[i];
    });

    // Auto-scale Y-axis
    const allScores = snapshots.map(s => s.score);
    const minScore = Math.min(...allScores);
    const maxScore = Math.max(...allScores);
    const padding = Math.max(0.05, (maxScore - minScore) * 0.2);
    const yMin = Math.max(0, Math.floor((minScore - padding) * 20) / 20);
    const yMax = Math.min(1, Math.ceil((maxScore + padding) * 20) / 20);
    const yRange = yMax - yMin;
    const yTicks = Array.from({ length: 5 }, (_, i) => Math.round((yMin + (yRange * i) / 4) * 100) / 100);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white border border-slate-200 px-3 py-2 rounded-lg shadow-lg text-xs max-w-xs">
                    <p className="font-bold text-slate-700 mb-1">{label}</p>
                    {payload
                        .filter((p: any) => p.dataKey !== '__avg__')
                        .map((p: any, i: number) => (
                            <p key={i} className="flex justify-between gap-3">
                                <span style={{ color: p.color }}>{p.dataKey}</span>
                                <span className="font-bold">{p.value?.toFixed(2)}</span>
                            </p>
                        ))}
                    {payload.find((p: any) => p.dataKey === '__avg__') && (
                        <p className="flex justify-between gap-3 mt-1 pt-1 border-t border-slate-100">
                            <span className="text-slate-500">Avg</span>
                            <span className="font-bold text-slate-500">
                                {payload.find((p: any) => p.dataKey === '__avg__')?.value?.toFixed(2)}
                            </span>
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                    domain={[yMin, yMax]}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    ticks={yTicks}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
                    iconType="line"
                    iconSize={12}
                />
                {deptNames.map((name, i) => (
                    <Line
                        key={name}
                        type="monotone"
                        dataKey={name}
                        stroke={LINE_COLORS[i % LINE_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                    />
                ))}
                <Line
                    type="monotone"
                    dataKey="__avg__"
                    name="Org Average"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                />
            </LineChart>
        </ResponsiveContainer>
    );
};

export default OrgScoreChart;
