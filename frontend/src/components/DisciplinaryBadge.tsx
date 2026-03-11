import React from 'react';
import { DisciplinaryStatus } from '../types/evaluation';
import { useLanguage } from '../i18n';

interface Props {
  status: DisciplinaryStatus | string;
  count?: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  showLabel?: boolean;
}

const styleConfig: Record<string, { color: string; bg: string; border: string }> = {
  NONE: {
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  WATCH: {
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-300',
  },
  WARNING: {
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-400',
  },
  FINE: {
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-400',
  },
  TERMINATION_RISK: {
    color: 'text-red-900',
    bg: 'bg-red-100',
    border: 'border-red-600',
  },
};

const iconMap: Record<string, React.ReactNode> = {
  NONE: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  WATCH: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  WARNING: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  FINE: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  TERMINATION_RISK: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
    </svg>
  ),
};

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

export default function DisciplinaryBadge({
  status,
  count,
  size = 'md',
  showCount = true,
  showLabel = true,
}: Props) {
  const { t } = useLanguage();

  const labelMap: Record<string, string> = {
    NONE: t.goodStanding,
    WATCH: t.underWatch,
    WARNING: t.warningStatus,
    FINE: t.finedStatus,
    TERMINATION_RISK: t.terminationRisk,
  };

  const cfg = styleConfig[status] ?? styleConfig.NONE;
  const label = labelMap[status] ?? labelMap.NONE;
  const icon = iconMap[status] ?? iconMap.NONE;
  const sizeClass = sizeClasses[size];

  if (status === 'NONE' && !showLabel) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border} ${sizeClass}`}
      title={label + (count !== undefined ? ` (${count} ${t.belowExpectationsCount})` : '')}
    >
      <span>{icon}</span>
      {showLabel && <span>{label}</span>}
      {showCount && count !== undefined && count > 0 && (
        <span className="ml-0.5 font-bold">&times;{count}</span>
      )}
    </span>
  );
}
