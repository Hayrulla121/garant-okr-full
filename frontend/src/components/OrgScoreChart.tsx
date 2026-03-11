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
import { Department, ScoreResult } from '../types/okr';

interface OrgScoreChartProps {
    departments: Department[];
    overallScore: ScoreResult;
    height?: number;
}

const OrgScoreChart: React.FC<OrgScoreChartProps> = ({
    departments,
    overallScore,
    height = 180
}) => {
    // Helper to get the best available score (finalScore if available, otherwise OKR score)
    const getDisplayScore = (dept: Department) => dept.finalScore || dept.score;

    // Create data points showing how each department contributes to the org score
    // This creates a visual flow from min to max with the org score highlighted
    const sortedDepts = [...departments]
        .filter(d => getDisplayScore(d))
        .sort((a, b) => (getDisplayScore(a)?.score || 0) - (getDisplayScore(b)?.score || 0));

    const data = sortedDepts.map((dept, index) => {
        const displayScore = getDisplayScore(dept);
        return {
            name: dept.name.length > 10 ? dept.name.substring(0, 10) + '...' : dept.name,
            fullName: dept.name,
            score: displayScore?.score || 0,
            orgScore: overallScore.score,
            color: displayScore?.color || '#666',
            hasEvaluations: !!dept.finalScore
        };
    });

    // Add org average point at the end
    if (data.length > 0) {
        data.push({
            name: 'Org Avg',
            fullName: 'Organization Average',
            score: overallScore.score,
            orgScore: overallScore.score,
            color: overallScore.color,
            hasEvaluations: true
        });
    }

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            return (
                <div className="bg-white border border-slate-200 px-3 py-2 rounded-lg shadow-lg text-xs">
                    <p className="font-bold text-slate-700">{d.fullName}</p>
                    <p className="mt-1">
                        Score: <span className="font-bold" style={{ color: d.color }}>{d.score.toFixed(2)}</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    if (departments.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                No data available
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
                    angle={-20}
                    textAnchor="end"
                    height={40}
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
                    y={overallScore.score}
                    stroke={overallScore.color}
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    label={{
                        value: `Org: ${overallScore.score.toFixed(2)}`,
                        position: 'right',
                        fontSize: 10,
                        fill: overallScore.color,
                        fontWeight: 'bold'
                    }}
                />
                <Line
                    type="linear"
                    dataKey="score"
                    stroke={overallScore.color}
                    strokeWidth={2}
                    dot={{ fill: overallScore.color, strokeWidth: 2, r: 4, stroke: '#fff' }}
                    activeDot={{ r: 6, fill: overallScore.color, stroke: '#fff', strokeWidth: 2 }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
};

export default OrgScoreChart;
