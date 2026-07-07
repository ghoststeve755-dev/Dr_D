// src/app/journal/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useJournal } from '@/hooks/useJournal';
import { useHabits } from '@/hooks/useHabits';
import JournalForm from '@/components/journal/JournalForm';
import { DailyJournal } from '@/types';
import { formatDateString } from '@/lib/dates';
import { CheckCircle2, History, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function JournalPage() {
  const [selectedDate, setSelectedDate] = useState('');
  const { habits, loading: habitsLoading } = useHabits();
  const { fetchJournalEntry, submitJournalEntry, fetchJournalHistory, loading: journalLoading } = useJournal();
  
  const [initialValues, setInitialValues] = useState<{ [habitId: string]: string }>({});
  const [initialNotes, setInitialNotes] = useState('');
  const [history, setHistory] = useState<DailyJournal[]>([]);
  const [successMsg, setSuccessMsg] = useState('');

  // Set today's date initially in local time
  useEffect(() => {
    setSelectedDate(formatDateString(new Date()));
  }, []);

  // Fetch journal entry when selectedDate changes
  useEffect(() => {
    if (!selectedDate) return;
    
    async function loadEntry() {
      const data = await fetchJournalEntry(selectedDate);
      if (data) {
        setInitialValues(data.values);
        setInitialNotes(data.journal?.notes || '');
      } else {
        setInitialValues({});
        setInitialNotes('');
      }
    }

    loadEntry();
  }, [selectedDate, fetchJournalEntry]);

  // Fetch history list
  const loadHistory = async () => {
    const list = await fetchJournalHistory(10);
    setHistory(list);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleJournalSubmit = async (values: { [habitId: string]: string }, notes: string) => {
    setSuccessMsg('');
    try {
      const activeHabits = habits.filter((h) => h.is_active);
      await submitJournalEntry(selectedDate, values, notes, activeHabits);
      setSuccessMsg('Journal entry saved successfully!');
      loadHistory(); // Refresh history
      
      // Auto clear success message after 4s
      setTimeout(() => {
        setSuccessMsg('');
      }, 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleHistoryDateClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loading = habitsLoading || journalLoading;

  return (
    <div className="journal-page-container animate-fade-in">
      <div className="journal-left-layout">
        <div className="page-header">
          <h3>Daily Discipline Journal</h3>
          <p>Log your values for today or pick a previous date to backdate your entry.</p>
        </div>

        {successMsg && (
          <div className="success-toast animate-scale-in">
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {habits.length === 0 && !habitsLoading ? (
          <div className="no-habits-warning card-glass">
            <h4>No active habits configured</h4>
            <p>Please configure some habits in the Habit Manager first before logging.</p>
            <Link href="/habits" className="btn-navigate">
              Go to Habit Manager <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <JournalForm
            date={selectedDate}
            habits={habits}
            initialValues={initialValues}
            initialNotes={initialNotes}
            onSubmit={handleJournalSubmit}
            onDateChange={setSelectedDate}
          />
        )}
      </div>

      <div className="journal-right-layout">
        <div className="history-card card-glass">
          <div className="history-header">
            <History size={18} className="history-icon" />
            <h4>Recent Logs</h4>
          </div>
          
          <div className="history-list">
            {history.length === 0 ? (
              <p className="empty-history-text">No entries logged yet.</p>
            ) : (
              history.map((entry) => (
                <div 
                  key={entry.id} 
                  onClick={() => handleHistoryDateClick(entry.date)}
                  className={`history-item ${entry.date === selectedDate ? 'active' : ''}`}
                >
                  <div className="item-meta">
                    <span className="item-date">{entry.date}</span>
                    <span className="item-day">{entry.day_of_week}</span>
                  </div>
                  <div className="item-score-badge">
                    <span className="score-pct">{entry.daily_pct_score}%</span>
                    <span className="score-raw">{parseFloat(entry.daily_raw_score.toString()).toFixed(1)} pts</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .journal-page-container {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 32px;
          align-items: start;
        }

        .journal-left-layout {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .page-header h3 {
          font-size: 18px;
          font-weight: 700;
          color: var(--primary);
          font-family: 'Outfit', sans-serif;
        }

        .page-header p {
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .success-toast {
          background-color: var(--success-light);
          color: var(--success);
          border: 1px solid rgba(16, 185, 129, 0.2);
          padding: 12px 16px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
        }

        .no-habits-warning {
          padding: 30px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .no-habits-warning h4 {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .no-habits-warning p {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .btn-navigate {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background-color: var(--primary);
          color: white;
          border-radius: var(--radius-md);
          font-weight: 600;
          font-size: 13px;
          margin-top: 8px;
        }

        .btn-navigate:hover {
          background-color: var(--primary-hover);
        }

        .journal-right-layout {
          position: sticky;
          top: calc(var(--header-height) + 32px);
        }

        .history-card {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .history-header {
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 12px;
        }

        .history-icon {
          color: var(--text-secondary);
        }

        .history-card h4 {
          font-size: 15px;
          font-weight: 700;
          color: var(--primary);
          font-family: 'Outfit', sans-serif;
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 500px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .empty-history-text {
          font-size: 12px;
          color: var(--text-tertiary);
          text-align: center;
          padding: 20px 0;
        }

        .history-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          cursor: pointer;
          background-color: var(--bg-surface);
          transition: all 0.2s ease;
        }

        .history-item:hover {
          border-color: var(--primary);
          background-color: var(--bg-elevated);
        }

        .history-item.active {
          border-color: var(--primary);
          background-color: var(--primary-light);
        }

        .item-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .item-date {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .item-day {
          font-size: 11px;
          color: var(--text-secondary);
        }

        .item-score-badge {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }

        .score-pct {
          font-size: 13px;
          font-weight: 700;
          color: var(--primary);
        }

        .score-raw {
          font-size: 10px;
          color: var(--text-tertiary);
        }

        @media (max-width: 992px) {
          .journal-page-container {
            grid-template-columns: 1fr;
          }

          .journal-right-layout {
            position: relative;
            top: 0;
          }
        }

        @media (max-width: 576px) {
          .journal-page-container {
            gap: 16px;
          }

          .history-list {
            max-height: 300px;
          }
        }

        @media (max-width: 480px) {
          .history-item {
            padding: 8px 10px;
          }
          .item-date {
            font-size: 12px;
          }
          .item-day {
            font-size: 10px;
          }
          .score-pct {
            font-size: 12px;
          }
          .no-habits-warning {
            padding: 20px 16px;
          }
        }
      `}</style>
    </div>
  );
}
