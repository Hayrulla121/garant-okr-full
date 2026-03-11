import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';
import { Objective, ScoreResult } from '../types/okr';

interface ObjectiveScoreChartProps {
    objectives: Objective[];
    departmentScore: ScoreResult;
    height?: number;
}

const ObjectiveScoreChart: React.FC<ObjectiveScoreChartProps> = ({
    objectives,
    departmentScore,
    height = 150
}) => {
    const sortedObjectives = [...objectives]
        .filter(o => o.score)
        .sort((a, b) => (a.score?.score || 0) - (b.score?.score || 0));

    const data = sortedObjectives.map((obj) => ({
        name: obj.name.length > 12 ? obj.name.substring(0, 12) + '...' : obj.name,
        fullName: obj.name,
        score: obj.score?.score || 0,
        color: obj.score?.color || '#666',
        weight: obj.weight
    }));

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            return (
                <div className="bg-white border border-slate-200 px-3 py-2 rounded-lg shadow-lg text-xs">
                    <p className="font-bold text-slate-700">{d.fullName}</p>
                    <p className="mt-1">
                        Score: <span className="font-bold" style={{ color: d.color }}>{d.score.toFixed(2)}</span>
                    </p>
                    <p className="text-slate-500">Weight: {d.weight}%</p>
                </div>
            );
        }
        return null;
    };

    if (objectives.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                No objectives available
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={35}
                />
                <YAxis
                    domain={[0, 1]}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    ticks={[0, 0.25, 0.5, 0.75, 1.0]}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                    y={departmentScore.score}
                    stroke={departmentScore.color}
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    label={{
                        value: `Avg: ${departmentScore.score.toFixed(2)}`,
                        position: 'right',
                        fontSize: 9,
                        fill: departmentScore.color,
                        fontWeight: 'bold'
                    }}
                />
                <Line
                    type="linear"
                    dataKey="score"
                    stroke="currentColor"
                    strokeWidth={2}
                    dot={(props: any) => {
                        const { cx, cy, payload } = props;
                        return (
                            <circle
                                cx={cx}
                                cy={cy}
                                r={5}
                                fill={payload.color}
                                stroke="#fff"
                                strokeWidth={2}
                            />
                        );
                    }}
                    activeDot={{ r: 7, stroke: '#fff', strokeWidth: 2 }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
};

export default ObjectiveScoreChart;
