import React from 'react';
import { Department } from '../types/okr';
import { Role } from '../types/auth';
import DepartmentCard from './DepartmentCard';
import DepartmentDetailView from './DepartmentDetailView';
import Speedometer from './Speedometer';
import { useLanguage } from '../i18n';
import { useAuth } from '../contexts/AuthContext';

interface DepartmentModalProps {
    department: Department;
    onClose: () => void;
    onUpdate: () => void;
}

const DepartmentModal: React.FC<DepartmentModalProps> = ({ department, onClose, onUpdate }) => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const scrollPositionRef = React.useRef<number>(0);

    // Preserve scroll position across updates
    const handleUpdate = React.useCallback(() => {
        // Save current scroll position before update
        if (scrollContainerRef.current) {
            scrollPositionRef.current = scrollContainerRef.current.scrollTop;
        }
        onUpdate();
    }, [onUpdate]);

    // Restore scroll position after re-render
    React.useEffect(() => {
        if (scrollContainerRef.current && scrollPositionRef.current > 0) {
            scrollContainerRef.current.scrollTop = scrollPositionRef.current;
        }
    }, [department]);

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
                return;
            }
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={handleBackdropClick}
        >
            <div
                className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header - Compact */}
                <div className="bg-gradient-to-r from-primary to-primary-dark text-white px-4 py-2 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold">{department.name}</h2>
                        <p className="text-red-100 text-xs">{t.performanceDetails}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Modal Content - Scrollable */}
                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3">
                    {/* Department Detail View with Multi-Speedometer and Evaluation Panel */}
                    <DepartmentDetailView
                        department={department}
                        onUpdate={handleUpdate}
                    />

                    {/* Leader Objectives Section */}
                    {department.leaderObjectives && department.leaderObjectives.length > 0 && (
                        <div className="mt-3 mb-2">
                            <div className="bg-gradient-to-r from-red-100 to-gray-100 rounded-xl p-4 mb-3 shadow-md flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-gray-700 text-xs font-semibold uppercase tracking-wide">{t.leaderPersonalGoals}</p>
                                        <h3 className="text-slate-800 font-bold text-base">{department.leaderName}</h3>
                                    </div>
                                </div>
                                {department.leaderScore && (
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="text-primary text-xs">{t.leaderScore}</p>
                                            <p className="text-slate-800 text-2xl font-bold">{department.leaderScore.score.toFixed(2)}</p>
                                        </div>
                                        <Speedometer score={department.leaderScore} size="sm" compact={true} />
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                {department.leaderObjectives.map((objective) => (
                                    <DepartmentCard
                                        key={objective.id}
                                        department={department}
                                        objective={objective}
                                        onUpdate={handleUpdate}
                                        canEditOverride={
                                            user?.role === Role.ADMIN ||
                                            user?.role === Role.DIRECTOR ||
                                            user?.id === department.leaderId
                                        }
                                    />
                                ))}
                            </div>
                            <div className="relative my-4 text-center">
                                <div className="h-0.5 bg-gradient-to-r from-red-400 via-yellow-400 via-green-400 via-gray-400 to-red-400 rounded-full" />
                                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-50 px-4 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                                    {t.departmentGoals}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Objectives Breakdown */}
                    <div className="mt-3 space-y-2">
                        {department.objectives.length === 0 ? (
                            <div className="bg-white rounded-lg shadow p-6 border border-slate-200 text-center">
                                <svg className="w-8 h-8 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <h3 className="text-sm font-semibold text-slate-600 mb-1">{t.noObjectivesYet}</h3>
                                <p className="text-slate-400 text-xs">{t.addObjectivesFromSettings}</p>
                            </div>
                        ) : (
                            department.objectives.map((objective) => (
                                <DepartmentCard
                                    key={objective.id}
                                    department={department}
                                    objective={objective}
                                    onUpdate={handleUpdate}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DepartmentModal;
