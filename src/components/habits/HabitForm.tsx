// src/components/habits/HabitForm.tsx

'use client';

import { useState, useEffect } from 'react';
import { Habit, HabitCategory, HabitInputType, ScoringConfig } from '@/types';
import { Plus, Trash, Info } from 'lucide-react';

interface HabitFormProps {
  initialHabit?: Habit | null;
  onSubmit: (habitData: any) => Promise<void>;
  onCancel: () => void;
}

export default function HabitForm({ initialHabit, onSubmit, onCancel }: HabitFormProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<HabitCategory>('health');
  const [inputType, setInputType] = useState<HabitInputType>('boolean');
  const [unit, setUnit] = useState('');
  const [weeklyTarget, setWeeklyTarget] = useState('');
  const [displayOrder, setDisplayOrder] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Scoring configuration state
  const [booleanPoints, setBooleanPoints] = useState('1');
  const [ruleType, setRuleType] = useState<ScoringConfig['type']>('boolean');
  
  // Rule specific states
  const [divisor, setDivisor] = useState('10');
  const [multiplier, setMultiplier] = useState('1');
  const [perUnit, setPerUnit] = useState('100');
  const [direction, setDirection] = useState<'positive' | 'negative'>('positive');
  const [fixedPoints, setFixedPoints] = useState('1');
  
  // Threshold rules state
  const [thresholds, setThresholds] = useState<{ min: string; max: string; points: string }[]>([
    { min: '0', max: '0', points: '0' },
    { min: '0.01', max: '3', points: '0.5' },
    { min: '3.01', max: '', points: '1' }
  ]);

  useEffect(() => {
    if (initialHabit) {
      setName(initialHabit.name);
      setCategory(initialHabit.category);
      setInputType(initialHabit.input_type);
      setUnit(initialHabit.unit || '');
      setWeeklyTarget(initialHabit.weekly_target?.toString() || '');
      setDisplayOrder(initialHabit.display_order.toString());
      setRuleType(initialHabit.scoring_config.type);

      const config = initialHabit.scoring_config;
      if (config.type === 'boolean') {
        setBooleanPoints(config.yes_points.toString());
      } else if (config.type === 'divide_by') {
        setDivisor(config.divisor.toString());
      } else if (config.type === 'multiply_by') {
        setMultiplier(config.multiplier.toString());
      } else if (config.type === 'add_subtract') {
        setPerUnit(config.per_unit.toString());
        setMultiplier(Math.abs(config.multiplier).toString());
        setDirection(config.multiplier >= 0 ? 'positive' : 'negative');
      } else if (config.type === 'fixed') {
        setFixedPoints(config.fixed_points.toString());
      } else if (config.type === 'threshold') {
        setThresholds(config.rules.map(r => ({
          min: r.min?.toString() || '0',
          max: r.max?.toString() || '',
          points: r.points.toString()
        })));
      }
    } else {
      // Default configurations
      if (inputType === 'boolean') {
        setRuleType('boolean');
      } else {
        setRuleType('divide_by');
      }
    }
  }, [initialHabit, inputType]);

  const addThreshold = () => {
    setThresholds([...thresholds, { min: '', max: '', points: '1' }]);
  };

  const removeThreshold = (index: number) => {
    setThresholds(thresholds.filter((_, i) => i !== index));
  };

  const updateThreshold = (index: number, field: 'min' | 'max' | 'points', value: string) => {
    setThresholds(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!name.trim()) {
      setError('Habit name is required.');
      setLoading(false);
      return;
    }

    try {
      let scoring_config: ScoringConfig;

      if (inputType === 'boolean') {
        scoring_config = {
          type: 'boolean',
          yes_points: parseFloat(booleanPoints) || 1
        };
      } else {
        if (ruleType === 'boolean') {
          setError('Invalid rule type for Number habit.');
          setLoading(false);
          return;
        }

        switch (ruleType) {
          case 'divide_by':
            scoring_config = {
              type: 'divide_by',
              divisor: parseFloat(divisor) || 1
            };
            break;
          case 'multiply_by':
            scoring_config = {
              type: 'multiply_by',
              multiplier: parseFloat(multiplier) || 1
            };
            break;
          case 'add_subtract':
            const mult = parseFloat(multiplier) || 1;
            scoring_config = {
              type: 'add_subtract',
              per_unit: parseFloat(perUnit) || 100,
              multiplier: direction === 'positive' ? mult : -mult,
              direction
            };
            break;
          case 'fixed':
            scoring_config = {
              type: 'fixed',
              fixed_points: parseFloat(fixedPoints) || 1
            };
            break;
          case 'threshold':
            const rules = thresholds.map(t => ({
              min: t.min !== '' ? parseFloat(t.min) : 0,
              max: t.max !== '' ? parseFloat(t.max) : null,
              points: parseFloat(t.points) || 0
            }));
            scoring_config = {
              type: 'threshold',
              rules
            };
            break;
          default:
            throw new Error('Invalid scoring rule type');
        }
      }

      await onSubmit({
        name: name.trim(),
        category,
        input_type: inputType,
        unit: inputType === 'number' ? (unit.trim() || null) : null,
        weekly_target: inputType === 'number' ? (parseFloat(weeklyTarget) || null) : null,
        display_order: parseInt(displayOrder) || 0,
        is_active: initialHabit ? initialHabit.is_active : true,
        is_system: initialHabit ? initialHabit.is_system : false,
        scoring_config
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving the habit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="habit-form animate-scale-in">
      <h3>{initialHabit ? 'Edit Habit' : 'Create New Habit'}</h3>
      
      {error && <div className="error-alert">{error}</div>}

      <div className="form-grid">
        <div className="form-group span-2">
          <label htmlFor="habit-name">Habit Name</label>
          <input
            id="habit-name"
            type="text"
            placeholder="e.g. Study Coding, Running..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={initialHabit?.is_system} // Block system name edit
            required
          />
          {initialHabit?.is_system && (
            <p className="field-hint">
              <Info size={12} style={{ display: 'inline', marginRight: '4px' }} />
              System habit name cannot be changed.
            </p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="habit-category">Category</label>
          <select
            id="habit-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as HabitCategory)}
          >
            <option value="health">🏥 Health</option>
            <option value="learning">🎓 Learning</option>
            <option value="productivity">⚡ Productivity</option>
            <option value="finance">💰 Finance</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="habit-input-type">Input Type</label>
          <select
            id="habit-input-type"
            value={inputType}
            onChange={(e) => setInputType(e.target.value as HabitInputType)}
            disabled={initialHabit?.is_system} // Block system input type edit
          >
            <option value="boolean">Yes / No (Boolean)</option>
            <option value="number">Numeric Entry</option>
          </select>
        </div>

        {inputType === 'number' && (
          <>
            <div className="form-group">
              <label htmlFor="habit-unit">Unit (Optional)</label>
              <input
                id="habit-unit"
                type="text"
                placeholder="e.g. hours, pages, rupees"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="habit-target">Weekly Target</label>
              <input
                id="habit-target"
                type="number"
                step="any"
                placeholder="e.g. 40, 70"
                value={weeklyTarget}
                onChange={(e) => setWeeklyTarget(e.target.value)}
              />
            </div>
          </>
        )}

        <div className="form-group">
          <label htmlFor="display-order">Display Order</label>
          <input
            id="display-order"
            type="number"
            placeholder="e.g. 1"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(e.target.value)}
          />
        </div>
      </div>

      <div className="scoring-rules-section">
        <h4>Scoring Rule</h4>
        
        {inputType === 'boolean' ? (
          <div className="rule-box">
            <div className="form-group">
              <label htmlFor="boolean-points">Points on Completion (YES)</label>
              <input
                id="boolean-points"
                type="number"
                step="any"
                value={booleanPoints}
                onChange={(e) => setBooleanPoints(e.target.value)}
                required
              />
            </div>
            <p className="rule-desc">When logged as YES, you earn {booleanPoints || 0} pt. No = 0 pts.</p>
          </div>
        ) : (
          <div className="rule-box">
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label htmlFor="rule-type">Calculation Method</label>
              <select
                id="rule-type"
                value={ruleType}
                onChange={(e) => setRuleType(e.target.value as ScoringConfig['type'])}
              >
                <option value="divide_by">➗ Divide Value (e.g. Reading: pages ÷ 10)</option>
                <option value="threshold">📶 Threshold Tiers (e.g. Study: &gt;3 hrs = 1, ≤3 = 0.5)</option>
                <option value="add_subtract">⚖️ Positive/Negative per Unit (e.g. Finance: earned, spent)</option>
                <option value="multiply_by">✖️ Multiply Value (e.g. value × multiplier)</option>
                <option value="fixed">📌 Fixed Points (Logged non-zero value = static points)</option>
              </select>
            </div>

            {/* Render rule sub-forms */}
            {ruleType === 'divide_by' && (
              <div className="form-group animate-fade-in">
                <label htmlFor="rule-divisor">Divisor</label>
                <input
                  id="rule-divisor"
                  type="number"
                  step="any"
                  value={divisor}
                  onChange={(e) => setDivisor(e.target.value)}
                  required
                />
                <p className="rule-desc">Score = logged value ÷ {divisor || 1}. Example: Log 35 pages → 3.5 pts.</p>
              </div>
            )}

            {ruleType === 'multiply_by' && (
              <div className="form-group animate-fade-in">
                <label htmlFor="rule-multiplier">Multiplier</label>
                <input
                  id="rule-multiplier"
                  type="number"
                  step="any"
                  value={multiplier}
                  onChange={(e) => setMultiplier(e.target.value)}
                  required
                />
                <p className="rule-desc">Score = logged value × {multiplier || 1}.</p>
              </div>
            )}

            {ruleType === 'fixed' && (
              <div className="form-group animate-fade-in">
                <label htmlFor="rule-fixed-points">Fixed Points Awarded</label>
                <input
                  id="rule-fixed-points"
                  type="number"
                  step="any"
                  value={fixedPoints}
                  onChange={(e) => setFixedPoints(e.target.value)}
                  required
                />
                <p className="rule-desc">Score = {fixedPoints || 0} pts if you log any value other than 0. Otherwise 0 pts.</p>
              </div>
            )}

            {ruleType === 'add_subtract' && (
              <div className="rule-subgrid animate-fade-in">
                <div className="form-group">
                  <label htmlFor="rule-per-unit">Per Unit Value</label>
                  <input
                    id="rule-per-unit"
                    type="number"
                    step="any"
                    value={perUnit}
                    onChange={(e) => setPerUnit(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="rule-dir">Point Direction</label>
                  <select
                    id="rule-dir"
                    value={direction}
                    onChange={(e) => setDirection(e.target.value as 'positive' | 'negative')}
                  >
                    <option value="positive">➕ Positive Impact (Earned)</option>
                    <option value="negative">➖ Negative Impact (Spent)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="rule-mult">Points Per Unit</label>
                  <input
                    id="rule-mult"
                    type="number"
                    step="any"
                    value={multiplier}
                    onChange={(e) => setMultiplier(e.target.value)}
                    required
                  />
                </div>
                <div className="span-2">
                  <p className="rule-desc">
                    Score = {direction === 'negative' ? 'minus ' : ''}(value ÷ {perUnit || 1}) × {multiplier || 1}. 
                    Example: Log {perUnit || 100} units → {direction === 'negative' ? '-' : '+'}{multiplier || 1} points.
                  </p>
                </div>
              </div>
            )}

            {ruleType === 'threshold' && (
              <div className="thresholds-builder animate-fade-in">
                <div className="threshold-header">
                  <span>Min Range</span>
                  <span>Max Range (blank = no limit)</span>
                  <span>Points Earned</span>
                  <span>Action</span>
                </div>
                <div className="threshold-rows">
                  {thresholds.map((t, index) => (
                    <div key={index} className="threshold-row">
                      <input
                        type="number"
                        step="any"
                        placeholder="0"
                        value={t.min}
                        onChange={(e) => updateThreshold(index, 'min', e.target.value)}
                        required
                      />
                      <input
                        type="number"
                        step="any"
                        placeholder="Unlimited"
                        value={t.max}
                        onChange={(e) => updateThreshold(index, 'max', e.target.value)}
                      />
                      <input
                        type="number"
                        step="any"
                        placeholder="Points"
                        value={t.points}
                        onChange={(e) => updateThreshold(index, 'points', e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => removeThreshold(index)}
                        disabled={thresholds.length <= 1}
                        className="btn-icon-delete"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addThreshold} className="btn-add-threshold">
                  <Plus size={14} /> Add Tier
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saving...' : 'Save Habit'}
        </button>
      </div>

      <style jsx>{`
        .habit-form {
          background-color: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          max-width: 600px;
          width: 100%;
        }

        .habit-form h3 {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          font-family: 'Outfit', sans-serif;
          border-bottom: 1px solid var(--border);
          padding-bottom: 12px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .span-2 {
          grid-column: span 2;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .form-group input, .form-group select {
          padding: 10px 12px;
          border: 1px solid var(--border);
          background-color: var(--bg-inset);
          color: var(--text-primary);
          border-radius: var(--radius-md);
          outline: none;
          transition: border-color 0.2s ease;
        }

        .form-group input:focus, .form-group select:focus {
          border-color: var(--border-focus);
        }

        .form-group select option {
          background-color: var(--bg-elevated);
          color: var(--text-primary);
        }

        .field-hint {
          font-size: 11px;
          color: var(--text-tertiary);
          margin-top: 2px;
        }

        .scoring-rules-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .scoring-rules-section h4 {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
          font-family: 'Outfit', sans-serif;
        }

        .rule-box {
          border: 1px solid var(--border);
          background-color: var(--bg-inset);
          border-radius: var(--radius-md);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .rule-desc {
          font-size: 12px;
          color: var(--text-secondary);
          font-weight: 500;
          background-color: var(--primary-light);
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          border-left: 3px solid var(--primary);
        }

        .rule-subgrid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
        }

        .thresholds-builder {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .threshold-header {
          display: grid;
          grid-template-columns: 1fr 1.2fr 1fr 40px;
          gap: 8px;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-tertiary);
        }

        .threshold-row {
          display: grid;
          grid-template-columns: 1fr 1.2fr 1fr 40px;
          gap: 8px;
          align-items: center;
        }

        .threshold-row input {
          padding: 8px;
          border: 1px solid var(--border);
          background-color: var(--bg-inset);
          color: var(--text-primary);
          border-radius: var(--radius-sm);
          outline: none;
        }

        .threshold-row input:focus {
          border-color: var(--border-focus);
        }

        .btn-icon-delete {
          background-color: transparent;
          border: none;
          color: var(--text-tertiary);
          cursor: pointer;
          height: 34px;
          width: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-sm);
          transition: all 0.2s ease;
        }

        .btn-icon-delete:hover {
          color: var(--danger);
          background-color: var(--danger-light);
        }

        .btn-add-threshold {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 8px;
          background-color: transparent;
          border: 1px dashed var(--border);
          color: var(--text-secondary);
          border-radius: var(--radius-sm);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-add-threshold:hover {
          color: var(--primary);
          border-color: var(--primary);
          background-color: var(--primary-light);
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          border-top: 1px solid var(--border);
          padding-top: 16px;
        }

        .btn-primary {
          background-color: var(--primary);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }

        .btn-primary:hover {
          background-color: var(--primary-hover);
        }

        .btn-secondary {
          background-color: transparent;
          border: 1px solid var(--border);
          color: var(--text-secondary);
          padding: 10px 20px;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          background-color: var(--bg-inset);
          color: var(--text-primary);
        }

        .error-alert {
          background-color: var(--danger-light);
          color: var(--danger);
          padding: 10px 12px;
          border-radius: var(--radius-md);
          font-size: 13px;
          font-weight: 500;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        @media (max-width: 576px) {
          .form-actions {
            flex-direction: column-reverse;
          }
          .btn-primary, .btn-secondary {
            width: 100%;
            justify-content: center;
          }
          .rule-subgrid {
            grid-template-columns: 1fr 1fr;
          }
          .threshold-header {
            grid-template-columns: 1fr 1fr;
          }
          .threshold-header span:nth-child(3) {
            display: none;
          }
          .threshold-row {
            grid-template-columns: 1fr 1fr;
          }
          .threshold-row input:nth-child(3) {
            grid-column: 1 / -1;
          }
        }
      `}</style>
    </form>
  );
}
