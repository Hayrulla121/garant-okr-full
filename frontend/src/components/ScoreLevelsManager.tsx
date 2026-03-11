import React, { useState, useEffect } from 'react';
import { ScoreLevel } from '../types/okr';
import { scoreLevelApi } from '../services/api';
import { useLanguage } from '../i18n';
import { useScoreLevels } from '../contexts/ScoreLevelContext';

interface ScoreLevelsManagerProps {
  onUpdate?: () => void;
}

const COLOR_PALETTE = [
  '#dc3545', '#e74c3c', '#c0392b',
  '#f39c12', '#f1c40f', '#e67e22',
  '#27ae60', '#2ecc71', '#1abc9c',
  '#3498db', '#2980b9', '#9b59b6',
  '#1e7b34', '#28a745', '#5cb85c',
  '#6c757d', '#95a5a6', '#34495e',
];

const ScoreLevelsManager: React.FC<ScoreLevelsManagerProps> = ({ onUpdate }) => {
  const { t } = useLanguage();
  const { scoreLevels: contextScoreLevels, refreshScoreLevels } = useScoreLevels();
  const [levels, setLevels] = useState<ScoreLevel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [editingScoreIndex, setEditingScoreIndex] = useState<number | null>(null);
  const [tempScoreValue, setTempScoreValue] = useState<string>('');
  const [showColorPicker, setShowColorPicker] = useState<number | null>(null);

  // Initialize local levels from context
  useEffect(() => {
    if (contextScoreLevels.length > 0 && levels.length === 0) {
      setLevels([...contextScoreLevels]);
    }
  }, [contextScoreLevels]);

  const handleLevelChange = (index: number, field: keyof ScoreLevel, value: any) => {
    const updatedLevels = [...levels];
    updatedLevels[index] = { ...updatedLevels[index], [field]: value };
    setLevels(updatedLevels);
    setHasChanges(true);
  };

  const startEditingScore = (index: number, currentValue: number) => {
    setEditingScoreIndex(index);
    setTempScoreValue(currentValue.toString());
  };

  const finishEditingScore = (index: number) => {
    const parsed = parseFloat(tempScoreValue);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 10) {
      handleLevelChange(index, 'scoreValue', parsed);
    }
    setEditingScoreIndex(null);
    setTempScoreValue('');
  };

  const handleAddLevel = () => {
    const newLevel: ScoreLevel = {
      name: t.newLevel,
      scoreValue: 4.0,
      color: '#6c757d',
      displayOrder: levels.length,
    };
    setLevels([...levels, newLevel]);
    setHasChanges(true);
  };

  const handleRemoveLevel = (index: number) => {
    if (levels.length <= 2) {
      alert(t.mustHaveAtLeast2Levels);
      return;
    }
    const updatedLevels = levels.filter((_, i) => i !== index);
    updatedLevels.forEach((level, i) => {
      level.displayOrder = i;
    });
    setLevels(updatedLevels);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const sortedLevels = [...levels].sort((a, b) => a.scoreValue - b.scoreValue);
      sortedLevels.forEach((level, i) => {
        level.displayOrder = i;
      });

      await scoreLevelApi.updateAll(sortedLevels);
      setLevels(sortedLevels);
      setHasChanges(false);
      // Refresh the global context
      await refreshScoreLevels();
      if (onUpdate) onUpdate();
      alert(t.scoreLevelsUpdated);
    } catch (err) {
      setError(t.failedToUpdateScoreLevels);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm(t.resetConfirmation)) {
      return;
    }

    setLoading(true);
    try {
      await scoreLevelApi.resetToDefaults();
      // Fetch fresh levels after reset
      const response = await scoreLevelApi.getAll();
      const sorted = response.data.sort((a, b) => a.scoreValue - b.scoreValue);
      setLevels(sorted);
      // Refresh the global context
      await refreshScoreLevels();
      setHasChanges(false);
      if (onUpdate) onUpdate();
      alert(t.scoreLevelsReset);
    } catch (err) {
      setError(t.failedToResetScoreLevels);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-800 mb-2">{t.scoreLevelConfiguration}</h3>
        <p className="text-sm text-slate-600">
          {t.configureGlobalScoreLevels}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="space-y-3 mb-6">
        {levels.map((level, index) => (
          <div key={level.id || `level-${index}`} className="bg-white p-4 rounded-lg border-2 border-slate-200 shadow-sm">
            <div className="grid grid-cols-12 gap-3 items-center">
              <div className="col-span-3">
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t.levelName}</label>
                <input
                  type="text"
                  value={level.name}
                  onChange={(e) => handleLevelChange(index, 'name', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t.scoreValue}</label>
                {editingScoreIndex === index ? (
                  <input
                    type="text"
                    autoFocus
                    value={tempScoreValue}
                    onChange={(e) => setTempScoreValue(e.target.value)}
                    onBlur={() => finishEditingScore(index)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') finishEditingScore(index);
                      if (e.key === 'Escape') {
                        setEditingScoreIndex(null);
                        setTempScoreValue('');
                      }
                    }}
                    className="w-full px-3 py-2 border-2 border-primary rounded-lg text-sm focus:ring-2 focus:ring-primary"
                  />
                ) : (
                  <div
                    onClick={() => startEditingScore(index, level.scoreValue)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm cursor-text hover:border-primary transition-colors"
                  >
                    {level.scoreValue.toFixed(2)}
                  </div>
                )}
              </div>

              <div className="col-span-3 relative">
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t.colorClickToPick}</label>
                <button
                  onClick={() => setShowColorPicker(showColorPicker === index ? null : index)}
                  className="w-full h-10 rounded-lg border-2 border-slate-300 cursor-pointer hover:border-primary transition-colors shadow-sm flex items-center justify-between px-3"
                  style={{ backgroundColor: level.color }}
                >
                  <span className="text-white font-mono text-sm drop-shadow-md">{level.color}</span>
                  <svg className="w-4 h-4 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showColorPicker === index && (
                  <div className="absolute top-full left-0 mt-1 p-3 bg-white rounded-xl shadow-2xl border border-slate-200 z-20 w-64">
                    <p className="text-xs font-semibold text-slate-500 mb-2">{t.chooseAColor}</p>
                    <div className="grid grid-cols-6 gap-2 mb-3">
                      {COLOR_PALETTE.map((color) => (
                        <button
                          key={color}
                          onClick={() => {
                            handleLevelChange(index, 'color', color);
                            setShowColorPicker(null);
                          }}
                          className={`w-8 h-8 rounded-lg border-2 hover:scale-110 transition-transform shadow-sm ${
                            level.color === color ? 'border-slate-800 ring-2 ring-primary scale-110' : 'border-white'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                    <div className="border-t border-slate-200 pt-2">
                      <p className="text-xs font-semibold text-slate-500 mb-1">{t.customColor}</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={level.color}
                          onChange={(e) => {
                            handleLevelChange(index, 'color', e.target.value);
                          }}
                          className="w-10 h-10 rounded cursor-pointer border-0"
                        />
                        <input
                          type="text"
                          value={level.color}
                          onChange={(e) => handleLevelChange(index, 'color', e.target.value)}
                          className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm font-mono"
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => setShowColorPicker(null)}
                      className="mt-2 w-full py-1 text-xs text-slate-500 hover:text-slate-700"
                    >
                      {t.close}
                    </button>
                  </div>
                )}
              </div>

              <div className="col-span-3">
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t.preview}</label>
                <div
                  className="w-full px-4 py-2 rounded-lg text-white font-bold text-center text-sm"
                  style={{ backgroundColor: level.color }}
                >
                  {level.name} - {level.scoreValue.toFixed(2)}
                </div>
              </div>

              <div className="col-span-1 flex justify-end">
                <button
                  onClick={() => handleRemoveLevel(index)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                  title={t.removeLevel}
                  disabled={levels.length <= 2}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleAddLevel}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark font-semibold text-sm transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t.addLevel}
        </button>

        <button
          onClick={handleSave}
          disabled={!hasChanges || loading}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t.saving : t.saveChanges}
        </button>

        <button
          onClick={handleReset}
          disabled={loading}
          className="px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 font-semibold text-sm transition-colors disabled:opacity-50"
        >
          {t.resetToDefaults}
        </button>

        {hasChanges && (
          <span className="text-sm text-primary font-semibold">
            {t.unsavedChanges}
          </span>
        )}
      </div>
    </div>
  );
};

export default ScoreLevelsManager;
