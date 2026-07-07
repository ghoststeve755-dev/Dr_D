// src/components/weekly/WeeklyForm.tsx

'use client';

import { useState, useEffect } from 'react';
import { useWeekly } from '@/hooks/useWeekly';
import { useHabits } from '@/hooks/useHabits';
import { Habit } from '@/types';
import { getISOWeekAndYear } from '@/lib/dates';
import { Save, AlertCircle, Sparkles, AlertTriangle, Lightbulb, Compass, FileText, Check } from 'lucide-react';

interface WeeklyFormProps {
  year: number;
  week: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function WeeklyForm({ year, week, onSuccess, onCancel }: WeeklyFormProps) {
  const { habits } = useHabits();
  const { aggregateWeeklyStats, submitWeeklyReview, loading } = useWeekly();

  const [stats, setStats] = useState<any>(null);
  const [achievement, setAchievement] = useState('');
  const [challenge, setChallenge] = useState('');
  const [learning, setLearning] = useState('');
  const [nextFocus, setNextFocus] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Load aggregated weekly stats
  useEffect(() => {
    if (habits.length === 0) return;
    
    async function loadStats() {
      const active = habits.filter(h => h.is_active);
      const weeklyData = await aggregateWeeklyStats(week, year, active);
      if (weeklyData) {
        setStats(weeklyData);
      }
    }
    loadStats();
  }, [week, year, habits, aggregateWeeklyStats]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!stats) {
      setError('Weekly metrics are not loaded yet.');
      return;
    }

    try {
      await submitWeeklyReview({
        year,
        week_number: week,
        achievement: achievement.trim() || null,
        challenge: challenge.trim() || null,
        learning: learning.trim() || null,
        next_focus: nextFocus.trim() || null,
        notes: notes.trim() || null,
        weekly_raw_score: stats.weeklyRawScore,
        weekly_max_score: stats.weeklyMaxScore,
        weekly_pct_score: stats.weeklyPctScore,
        habit_summary: stats.habitSummary
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save weekly review.');
    }
  };

  if (!stats) {
    return (
      <div className="stats-loading">
        <div className="spinner"></div>
        <p>Analyzing weekly progress...</p>
        <style jsx>{`
          .stats-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px;
            gap: 12px;
            color: var(--text-secondary);
          }
          .spinner {
            width: 28px;
            height: 28px;
            border: 2px solid var(--border);
            border-top: 2px solid var(--primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  const netSavings = stats.moneyEarned - stats.moneySpent;

  return (
    <form onSubmit={handleSubmit} className="weekly-review-form card-glass">
      <h3>Weekly Reflection — Week {week}, {year}</h3>
      
      {error && <div className="error-alert">{error}</div>}

      {/* Aggregated Stats Preview Card */}
      <div className="weekly-metrics-card">
        <div className="metric-score-display">
          <span className="lbl">Weekly Discipline Score</span>
          <div className="score-badge">
            <span className="pct">{stats.weeklyPctScore}%</span>
            <span className="raw">({stats.weeklyRawScore.toFixed(1)} / {stats.weeklyMaxScore.toFixed(1)} max pts)</span>
          </div>
        </div>

        <div className="metric-financial-summary">
          <div className="fin-box">
            <span className="lbl">Money Earned</span>
            <span className="val success">₹{stats.moneyEarned.toLocaleString()}</span>
          </div>
          <div className="fin-box">
            <span className="lbl">Money Spent</span>
            <span className="val danger">₹{stats.moneySpent.toLocaleString()}</span>
          </div>
          <div className="fin-box">
            <span className="lbl">Net Savings</span>
            <span className={`val ${netSavings >= 0 ? 'success' : 'danger'}`}>
              ₹{netSavings.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="metrics-logs-list">
          <h5>Habit Log Summaries</h5>
          <div className="metrics-grid">
            {Object.entries(stats.habitSummary).map(([id, info]: any) => {
              const isBool = info.inputType === 'boolean';
              return (
                <div key={id} className="summary-item">
                  <span className="item-name">{info.name}</span>
                  <span className="item-val">
                    {isBool ? `${info.totalValue} days` : `${info.totalValue.toFixed(0)} ${info.unit}`}
                    <span className="item-pts"> (+{info.totalScore.toFixed(1)} pts)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reflection Prompts */}
      <div className="reflection-section">
        <div className="form-group">
          <label htmlFor="ref-achievement">
            <Sparkles size={16} className="icon-ach" /> Biggest Achievement
          </label>
          <textarea
            id="ref-achievement"
            placeholder="What was your greatest victory this week?"
            value={achievement}
            onChange={(e) => setAchievement(e.target.value)}
            required
            rows={2}
          />
        </div>

        <div className="form-group">
          <label htmlFor="ref-challenge">
            <AlertTriangle size={16} className="icon-cha" /> Biggest Challenge
          </label>
          <textarea
            id="ref-challenge"
            placeholder="What struggles did you face and how did they affect you?"
            value={challenge}
            onChange={(e) => setChallenge(e.target.value)}
            required
            rows={2}
          />
        </div>

        <div className="form-group">
          <label htmlFor="ref-learning">
            <Lightbulb size={16} className="icon-lea" /> Lessons Learned
          </label>
          <textarea
            id="ref-learning"
            placeholder="What wisdom or adjustments did you gain from this week?"
            value={learning}
            onChange={(e) => setLearning(e.target.value)}
            required
            rows={2}
          />
        </div>

        <div className="form-group">
          <label htmlFor="ref-focus">
            <Compass size={16} className="icon-foc" /> Focus for Next Week
          </label>
          <textarea
            id="ref-focus"
            placeholder="What is your primary focus / goal for the coming week?"
            value={nextFocus}
            onChange={(e) => setNextFocus(e.target.value)}
            required
            rows={2}
          />
        </div>

        <div className="form-group">
          <label htmlFor="ref-notes">
            <FileText size={16} className="icon-not" /> Optional Reflection Notes
          </label>
          <textarea
            id="ref-notes"
            placeholder="Any other observations or thoughts..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          <Save size={14} /> {loading ? 'Saving...' : 'Submit Review'}
        </button>
      </div>

      <style jsx>{`
        .weekly-review-form {
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          background-color: var(--bg-surface);
          width: 100%;
        }

        .weekly-review-form h3 {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          font-family: 'Outfit', sans-serif;
          border-bottom: 1px solid var(--border);
          padding-bottom: 12px;
        }

        .weekly-metrics-card {
          background-color: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .metric-score-display {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border);
          padding-bottom: 14px;
        }

        .metric-score-display .lbl {
          font-weight: 700;
          font-size: 14px;
        }

        .score-badge {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .score-badge .pct {
          font-size: 18px;
          font-weight: 800;
          color: var(--primary);
          font-family: 'Outfit', sans-serif;
        }

        .score-badge .raw {
          font-size: 11px;
          color: var(--text-secondary);
          font-weight: 600;
        }

        .metric-financial-summary {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
          text-align: center;
          border-bottom: 1px solid var(--border);
          padding-bottom: 14px;
        }

        .fin-box {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .fin-box .lbl {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .fin-box .val {
          font-size: 16px;
          font-weight: 800;
          font-family: 'Outfit', sans-serif;
        }

        .val.success { color: var(--success); }
        .val.danger { color: var(--danger); }

        .metrics-logs-list h5 {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 24px;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          border-bottom: 1px dashed var(--border);
          padding-bottom: 2px;
        }

        .summary-item .item-name {
          color: var(--text-secondary);
          font-weight: 500;
        }

        .summary-item .item-val {
          font-weight: 700;
          color: var(--text-primary);
        }

        .summary-item .item-pts {
          color: var(--text-tertiary);
          font-weight: 500;
        }

        .reflection-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
          font-family: 'Outfit', sans-serif;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .icon-ach { color: #f59e0b; }
        .icon-cha { color: #ef4444; }
        .icon-lea { color: #10b981; }
        .icon-foc { color: #3b82f6; }
        .icon-not { color: #6b7280; }

        .form-group textarea {
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background-color: var(--bg-elevated);
          outline: none;
          resize: vertical;
          font-size: 13px;
          line-height: 1.5;
        }

        .form-group textarea:focus {
          border-color: var(--border-focus);
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          border-top: 1px solid var(--border);
          padding-top: 16px;
        }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: var(--primary);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
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

        @media (max-width: 768px) {
          .metric-financial-summary {
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .metrics-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 576px) {
          .metric-financial-summary {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .metrics-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </form>
  );
}
