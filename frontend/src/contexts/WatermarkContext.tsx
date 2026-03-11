import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { platformSettingsApi } from '../services/api';
import { useAuth } from './AuthContext';

export interface WatermarkSettings {
    enabled: boolean;
    type: 'TEXT' | 'IMAGE';
    text: string;
    imageUrl: string;
    opacity: number;
}

interface WatermarkContextType {
    settings: WatermarkSettings;
    refreshSettings: () => Promise<void>;
    updateSetting: (key: string, value: string, description?: string) => Promise<void>;
    uploadImage: (file: File) => Promise<string>;
}

const DEFAULT_SETTINGS: WatermarkSettings = {
    enabled: false,
    type: 'TEXT',
    text: 'CONFIDENTIAL',
    imageUrl: '',
    opacity: 0.15,
};

const WatermarkContext = createContext<WatermarkContextType | undefined>(undefined);

export const useWatermark = () => {
    const context = useContext(WatermarkContext);
    if (!context) throw new Error('useWatermark must be used within WatermarkProvider');
    return context;
};

const parseSettings = (raw: { settingKey: string; settingValue: string }[]): WatermarkSettings => {
    const get = (key: string, fallback: string) =>
        raw.find(s => s.settingKey === key)?.settingValue ?? fallback;
    return {
        enabled: get('WATERMARK_ENABLED', 'false') === 'true',
        type: get('WATERMARK_TYPE', 'TEXT') as 'TEXT' | 'IMAGE',
        text: get('WATERMARK_TEXT', 'CONFIDENTIAL'),
        imageUrl: get('WATERMARK_IMAGE_URL', ''),
        opacity: parseFloat(get('WATERMARK_OPACITY', '0.15')),
    };
};

export const WatermarkProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const [settings, setSettings] = useState<WatermarkSettings>(DEFAULT_SETTINGS);

    const refreshSettings = useCallback(async () => {
        try {
            const response = await platformSettingsApi.getAll();
            setSettings(parseSettings(response.data));
        } catch (e) {
            console.error('Failed to load watermark settings', e);
        }
    }, []);

    useEffect(() => {
        if (authLoading) return;
        if (isAuthenticated) {
            refreshSettings();
        } else {
            setSettings(DEFAULT_SETTINGS);
        }
    }, [isAuthenticated, authLoading, refreshSettings]);

    const updateSetting = async (key: string, value: string, description?: string) => {
        await platformSettingsApi.update(key, value, description);
        await refreshSettings();
    };

    const uploadImage = async (file: File): Promise<string> => {
        const response = await platformSettingsApi.uploadWatermarkImage(file);
        await refreshSettings();
        return response.data.settingValue;
    };

    return (
        <WatermarkContext.Provider value={{ settings, refreshSettings, updateSetting, uploadImage }}>
            {children}
        </WatermarkContext.Provider>
    );
};
