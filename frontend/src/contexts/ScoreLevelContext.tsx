import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ScoreLevel } from '../types/okr';
import { scoreLevelApi } from '../services/api';

interface ScoreLevelContextType {
    scoreLevels: ScoreLevel[];
    loading: boolean;
    error: string | null;
    refreshScoreLevels: () => Promise<void>;
}

const ScoreLevelContext = createContext<ScoreLevelContextType | undefined>(undefined);

const DEFAULT_SCORE_LEVELS: ScoreLevel[] = [
    { name: 'Не соответствует', scoreValue: 0.0, color: '#d9534f', displayOrder: 0 },
    { name: 'Ниже ожиданий', scoreValue: 0.31, color: '#f0ad4e', displayOrder: 1 },
    { name: 'На уровне ожиданий', scoreValue: 0.51, color: '#5cb85c', displayOrder: 2 },
    { name: 'Превышает ожидания', scoreValue: 0.86, color: '#28a745', displayOrder: 3 },
    { name: 'Исключительно', scoreValue: 0.98, color: '#1e7b34', displayOrder: 4 },
];

export const ScoreLevelProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [scoreLevels, setScoreLevels] = useState<ScoreLevel[]>(DEFAULT_SCORE_LEVELS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasFetched, setHasFetched] = useState(false);

    const fetchScoreLevels = useCallback(async () => {
        // Prevent duplicate fetches
        if (hasFetched && scoreLevels.length > 0) {
            return;
        }

        try {
            setLoading(true);
            const response = await scoreLevelApi.getAll();
            const sorted = response.data.sort((a, b) => a.scoreValue - b.scoreValue);
            setScoreLevels(sorted.length > 0 ? sorted : DEFAULT_SCORE_LEVELS);
            setError(null);
            setHasFetched(true);
        } catch (err) {
            console.error('Failed to fetch score levels:', err);
            setError('Failed to load score levels');
            setScoreLevels(DEFAULT_SCORE_LEVELS);
        } finally {
            setLoading(false);
        }
    }, [hasFetched, scoreLevels.length]);

    const refreshScoreLevels = useCallback(async () => {
        setHasFetched(false);
        try {
            setLoading(true);
            const response = await scoreLevelApi.getAll();
            const sorted = response.data.sort((a, b) => a.scoreValue - b.scoreValue);
            setScoreLevels(sorted.length > 0 ? sorted : DEFAULT_SCORE_LEVELS);
            setError(null);
            setHasFetched(true);
        } catch (err) {
            console.error('Failed to refresh score levels:', err);
            setError('Failed to refresh score levels');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchScoreLevels();
    }, []);

    return (
        <ScoreLevelContext.Provider value={{ scoreLevels, loading, error, refreshScoreLevels }}>
            {children}
        </ScoreLevelContext.Provider>
    );
};

export const useScoreLevels = (): ScoreLevelContextType => {
    const context = useContext(ScoreLevelContext);
    if (context === undefined) {
        throw new Error('useScoreLevels must be used within a ScoreLevelProvider');
    }
    return context;
};

export default ScoreLevelContext;
