// src/components/journal/JournalForm.tsx

'use client';

import { useState, useEffect } from 'react';
import { Habit, ScoringConfig } from '@/types';
import { calculateDailyJournalScore } from '@/lib/scoring';
import { Calendar, Save, CheckCircle2, AlertCircle } from 'lucide-react';

interface JournalFormProps {
  date: string;
  habits: Habit[];
  initialValues: { [habitId: string]: string };
  initialNotes: string;
  onSubmit: (values: { [habitId: string]: string }, notes: string) => Promise<void>;
  onDateChange?: (date: string) => void;
}

export default function JournalForm({
  date,
  habits,
  initialValues,
  initialNotes,
  onSubmit,
  onDateChange,
}: JournalFormProps) {
  const [values, setValues] = useState<{ [habitId: string]: string }>({});
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize values when initialValues or habits change
  useEffect(() => {
    const defaultValues: { [habitId: string]: string } = {};
    habits.forEach((h) => {
      defaultValues[h.id] = initialValues[h.id] !== undefined ? initialValues[h.id] : (h.input_type === 'boolean' ? '0' : '0');
    });
    setValues(defaultValues);
    setNotes(initialNotes || '');
  }, [initialValues, habits, initialNotes]);

  // Check if it is a late entry
  const todayStr = new Date().toISOString().split('T')[0];
  const isLateEntry = date !== todayStr;

  // Live score calculation
  const activeHabits = habits.filter(h => h.is_active);
  const { rawScore, maxScore, pctScore } = calculateDailyJournalScore(activeHabits, values);

  const handleToggleChange = (habitId: string, checked: boolean) => {
    setValues(prev => ({
      ...prev,
      [habitId]: checked ? '1' : '0',
    }));
  };

  const handleNumberChange = (habitId: string, val: string) => {
    setValues(prev => ({
      ...prev,
      [habitId]: val,
    }));
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(values, notes);
    } catch (err: any) {
      setError(err.message || 'Failed to submit journal');
    } finally {
      setSubmitting(false);
    }
  };

  // Generate readable description for scoring configuration hints
  const getRuleHint = (habit: Habit) => {
    const isFinancial = habit.name.toLowerCase().includes('money earned') || 
                        habit.name.toLowerCase().includes('money spent');
    if (isFinancial) {
      return "Doesn't affect discipline score";
    }

    const config = habit.scoring_config;
    const unit = habit.unit || 'units';
    switch (config.type) {
      case 'boolean':
        return `Yes = +${config.yes_points} pt | No = 0 pts`;
      case 'divide_by':
        return `Points = ${unit} ÷ ${config.divisor}`;
      case 'multiply_by':
        return `Points = ${unit} × ${config.multiplier}`;
      case 'fixed':
        return `+${config.fixed_points} pt if logged > 0`;
      case 'add_subtract':
        return `Every ${config.per_unit} ${unit} = ${config.multiplier >= 0 ? '+' : ''}${config.multiplier} pts`;
      case 'threshold':
        return config.rules
          .map((r: any) => {
            const min = r.min === 0 ? '0' : r.min;
            const max = r.max === null ? '∞' : r.max;
            return `${min}-${max} = ${r.points} pt`;
          })
          .join(' | ');
      default:
        return '';
    }
  };

  return (
    <form onSubmit={handleSubmitForm} className="journal-form-container card-glass">
      <div className="form-header">
        <div className="header-left">
          <div className="date-picker-wrapper">
            <Calendar className="date-icon" size={18} />
            <input
              type="date"
              value={date}
              max={todayStr}
              onChange={(e) => onDateChange && onDateChange(e.target.value)}
              className="date-input"
            />
          </div>
          {isLateEntry && (
            <span className="late-badge">
              <AlertCircle size={12} /> Late Entry
            </span>
          )}
        </div>

        <div className="score-badge-circle">
          <div className="score-percentage">{pctScore}%</div>
          <div className="score-raw">
            {rawScore.toFixed(1)}/{maxScore.toFixed(1)} pts
          </div>
        </div>
      </div>

      {error && <div className="error-alert">{error}</div>}

      <div className="habits-section">
        <h3>Today&apos;s Habits</h3>
        <div className="habits-grid">
          {activeHabits.map((habit) => {
            const isBoolean = habit.input_type === 'boolean';
            const value = values[habit.id] || '0';
            
            return (
              <div key={habit.id} className="habit-input-row">
                <div className="habit-meta">
                  <span className="habit-name">{habit.name}</span>
                  <span className="scoring-hint">{getRuleHint(habit)}</span>
                </div>

                <div className="habit-control">
                  {isBoolean ? (
                    <div className="boolean-buttons">
                      <button
                        type="button"
                        onClick={() => handleToggleChange(habit.id, false)}
                        className={`bool-btn no ${value !== '1' ? 'active' : ''}`}
                      >
                        No
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleChange(habit.id, true)}
                        className={`bool-btn yes ${value === '1' ? 'active' : ''}`}
                      >
                        Yes
                      </button>
                    </div>
                  ) : (
                    <div className="numeric-input-wrapper">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={value}
                        onChange={(e) => handleNumberChange(habit.id, e.target.value)}
                        required
                        className="numeric-input"
                      />
                      {habit.unit && <span className="unit-label">{habit.unit}</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="notes-section">
        <label htmlFor="daily-notes">Daily Journal / Reflection</label>
        <textarea
          id="daily-notes"
          placeholder="Write down today's achievements, struggles, thoughts or reflections..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
        />
      </div>

      <div className="form-footer">
        <button type="submit" disabled={submitting} className="btn-submit">
          <Save size={16} />
          <span>{submitting ? 'Saving Logs...' : 'Submit Journal'}</span>
        </button>
      </div>

      <style jsx>{`
        .journal-form-container {
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .form-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border);
          padding-bottom: 20px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .date-picker-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          background-color: var(--bg-inset);
          border: 1px solid var(--border);
          padding: 8px 14px;
          border-radius: var(--radius-md);
        }

        .date-icon {
          color: var(--text-secondary);
        }

        .date-input {
          background: transparent;
          border: none;
          outline: none;
          font-weight: 600;
          color: var(--text-primary);
        }

        .late-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          background-color: var(--accent-light);
          color: var(--accent);
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          text-transform: uppercase;
        }

        .score-badge-circle {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary-light), rgba(99, 102, 241, 0.05));
          border: 2px solid var(--primary);
        }

        .score-percentage {
          font-size: 20px;
          font-weight: 800;
          color: var(--primary);
          font-family: 'Outfit', sans-serif;
          line-height: 1.1;
        }

        .score-raw {
          font-size: 9px;
          font-weight: 600;
          color: var(--text-secondary);
          margin-top: 2px;
        }

        .habits-section h3 {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          font-family: 'Outfit', sans-serif;
          margin-bottom: 16px;
        }

        .habits-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .habit-input-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background-color: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          gap: 16px;
        }

        .habit-meta {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .habit-name {
          font-weight: 600;
          font-size: 14px;
          color: var(--text-primary);
        }

        .scoring-hint {
          font-size: 11px;
          color: var(--text-tertiary);
          font-weight: 500;
        }

        .boolean-buttons {
          display: flex;
          background-color: var(--bg-inset);
          padding: 3px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
        }

        .bool-btn {
          padding: 6px 16px;
          font-size: 12px;
          font-weight: 600;
          border: none;
          background: transparent;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.2s;
        }

        .bool-btn.no.active {
          background-color: var(--danger-light);
          color: var(--danger);
        }

        .bool-btn.yes.active {
          background-color: var(--success);
          color: white;
        }

        .numeric-input-wrapper {
          display: flex;
          align-items: center;
          border: 1px solid var(--border);
          background-color: var(--bg-surface);
          border-radius: var(--radius-sm);
          overflow: hidden;
        }

        .numeric-input {
          width: 80px;
          padding: 6px 10px;
          border: none;
          background: transparent;
          outline: none;
          text-align: center;
          font-weight: 600;
        }

        .unit-label {
          background-color: var(--bg-inset);
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary);
          border-left: 1px solid var(--border);
        }

        .notes-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .notes-section label {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
          font-family: 'Outfit', sans-serif;
        }

        .notes-section textarea {
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          outline: none;
          background-color: var(--bg-elevated);
          resize: vertical;
          line-height: 1.5;
        }

        .notes-section textarea:focus {
          border-color: var(--border-focus);
        }

        .form-footer {
          display: flex;
          justify-content: flex-end;
          border-top: 1px solid var(--border);
          padding-top: 16px;
        }

        .btn-submit {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background-color: var(--primary);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 10px rgba(99, 102, 241, 0.2);
        }

        .btn-submit:hover {
          background-color: var(--primary-hover);
          transform: translateY(-1px);
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
          .habit-input-row {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .habit-control {
            display: flex;
            justify-content: flex-end;
          }
          
          .numeric-input-wrapper {
            width: 100%;
          }
          
          .numeric-input {
            width: 100%;
          }
        }
      `}</style>
    </form>
  );
}
