import React, { useMemo } from 'react';
import { useWatermark } from '../contexts/WatermarkContext';
import { useAuth } from '../contexts/AuthContext';
import { SERVER_BASE } from '../services/api';

const Watermark: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const { settings } = useWatermark();
    const { enabled, type, text, imageUrl, opacity } = settings;

    const textPattern = useMemo(() => {
        if (type !== 'TEXT' || !text) return '';
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150">
            <text x="150" y="75"
                dominant-baseline="middle"
                text-anchor="middle"
                transform="rotate(-30, 150, 75)"
                fill="rgba(0,0,0,${opacity})"
                font-size="22"
                font-family="Arial, sans-serif"
                font-weight="bold"
                letter-spacing="2">
                ${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
            </text>
        </svg>`;
        return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
    }, [type, text, opacity]);

    if (!isAuthenticated || !enabled) return null;

    if (type === 'TEXT') {
        return (
            <div
                aria-hidden="true"
                style={{
                    position: 'fixed',
                    inset: 0,
                    pointerEvents: 'none',
                    zIndex: 9999,
                    backgroundImage: textPattern,
                    backgroundRepeat: 'repeat',
                }}
            />
        );
    }

    if (type === 'IMAGE' && imageUrl) {
        return (
            <div
                aria-hidden="true"
                style={{
                    position: 'fixed',
                    inset: 0,
                    pointerEvents: 'none',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <img
                    src={`${SERVER_BASE}${imageUrl}`}
                    alt=""
                    style={{
                        opacity,
                        maxWidth: '45%',
                        maxHeight: '45%',
                        objectFit: 'contain',
                    }}
                />
            </div>
        );
    }

    return null;
};

export default Watermark;
