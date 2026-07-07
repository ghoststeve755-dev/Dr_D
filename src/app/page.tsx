// src/app/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { calculateStreak } from '@/lib/streak';
import { getISOWeekAndYear, formatDateString, getDatesInISOWeek } from '@/lib/dates';
import DonutChart from '@/components/ui/DonutChart';
import { 
  Flame, 
  Calendar, 
  BookOpen, 
  Award, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ArrowRight,
  TrendingUp as SavingsIcon
} from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('Doctor D');
  
  // Scoring & logs
  const [todayJournal, setTodayJournal] = useState<any>(null);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [habits, setHabits] = useState<any[]>([]);
  const [weeklyLogs, setWeeklyLogs] = useState<any[]>([]);
  const [weeklyReviewPending, setWeeklyReviewPending] = useState(false);
  const [monthlyReviewPending, setMonthlyReviewPending] = useState(false);
  const [weeklyStats, setWeeklyStats] = useState({ raw: 0, max: 0, pct: 0 });
  const [monthlyStats, setMonthlyStats] = useState({ pct: 0 });
  const [datesOfCurrentWeek, setDatesOfCurrentWeek] = useState<string[]>([]);
  const [habitGridData, setHabitGridData] = useState<{ [date: string]: { [habitId: string]: any } }>({});

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const todayDate = new Date();
        const todayStr = formatDateString(todayDate);
        const { week, year } = getISOWeekAndYear(todayDate);
        const weekDates = getDatesInISOWeek(week, year);
        setDatesOfCurrentWeek(weekDates);
        const monthNum = todayDate.getMonth() + 1;
        const yearNum = todayDate.getFullYear();

        // Fetch all required data in parallel to eliminate database query round-trip latency
        const [
          profileResult,
          habitsResult,
          todayJournalResult,
          journalDatesResult,
          currentWeekJournalsResult,
          currentMonthJournalsResult,
          existingReviewResult,
          existingReportResult,
        ] = await Promise.all([
          supabase.from('users').select('*').eq('id', user.id).single(),
          supabase.from('habits').select('*').eq('user_id', user.id).eq('is_active', true).order('display_order', { ascending: true }),
          supabase.from('daily_journals').select('*, habit_logs(*)').eq('user_id', user.id).eq('date', todayStr).maybeSingle(),
          supabase.from('daily_journals').select('date').eq('user_id', user.id),
          supabase.from('daily_journals').select('*, habit_logs(*)').eq('user_id', user.id).eq('year', year).eq('week_number', week),
          supabase.from('daily_journals').select('daily_pct_score').eq('user_id', user.id).eq('year', yearNum).eq('month', monthNum),
          supabase.from('weekly_reviews').select('id').eq('user_id', user.id).eq('year', year).eq('week_number', week).maybeSingle(),
          supabase.from('monthly_reports').select('id').eq('user_id', user.id).eq('year', yearNum).eq('month', monthNum).maybeSingle(),
        ]);

        // Process profile
        const profile = profileResult.data;
        if (profile) {
          setUsername(profile.name || 'Doctor D');
        }

        // Process active habits
        const habitsList = habitsResult.data || [];
        setHabits(habitsList);

        // Process today's entry
        const todayEntry = todayJournalResult.data;
        setTodayJournal(todayEntry);

        // Process streak
        const journalDates = journalDatesResult.data;
        if (journalDates) {
          const dates = journalDates.map(d => d.date);
          setStreak(calculateStreak(dates));
        }

        // Process weekly progress
        const currentWeekJournals = currentWeekJournalsResult.data;
        let weekRaw = 0;
        let weekMax = 0;
        currentWeekJournals?.forEach((journal) => {
          weekRaw += parseFloat(journal.daily_raw_score?.toString() || '0');
          weekMax += parseFloat(journal.daily_max_score?.toString() || '0');
        });
        
        setWeeklyStats({
          raw: weekRaw,
          max: weekMax,
          pct: weekMax > 0 ? Math.round((weekRaw / weekMax) * 100) : 0
        });

        // Map weekly logs for grid view
        const grid: typeof habitGridData = {};
        weekDates.forEach((d) => {
          grid[d] = {};
        });
        currentWeekJournals?.forEach((journal) => {
          journal.habit_logs?.forEach((log: any) => {
            grid[journal.date][log.habit_id] = log;
          });
        });
        setHabitGridData(grid);

        // Process monthly progress
        const currentMonthJournals = currentMonthJournalsResult.data;
        if (currentMonthJournals && currentMonthJournals.length > 0) {
          const sum = currentMonthJournals.reduce((acc, curr) => acc + parseFloat(curr.daily_pct_score?.toString() || '0'), 0);
          setMonthlyStats({
            pct: Math.round(sum / currentMonthJournals.length)
          });
        }

        // Check if Weekly Review is pending
        // Trigger on Sunday if today's journal is submitted
        const isSunday = todayDate.getDay() === 0;
        const todayLogged = todayEntry !== null;
        if (isSunday && todayLogged) {
          const existingReview = existingReviewResult.data;
          if (!existingReview) {
            setWeeklyReviewPending(true);
          }
        }

        // Check if Monthly Review is pending (last 3 days of the month)
        const totalDays = new Date(yearNum, monthNum, 0).getDate();
        const currentDay = todayDate.getDate();
        const isLastThreeDays = currentDay >= totalDays - 2;
        if (isLastThreeDays) {
          const existingReport = existingReportResult.data;
          if (!existingReport) {
            setMonthlyReviewPending(true);
          }
        }

      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [router]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading Dashboard...</p>
        <style jsx>{`
          .dashboard-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 100px 0;
            color: var(--text-secondary);
            gap: 12px;
          }
          .spinner {
            width: 32px;
            height: 32px;
            border: 3px solid var(--border);
            border-top: 3px solid var(--primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const todayScore = todayJournal ? parseFloat(todayJournal.daily_pct_score?.toString() || '0') : 0;
  const todayRaw = todayJournal ? parseFloat(todayJournal.daily_raw_score?.toString() || '0') : 0;
  const todayMax = todayJournal ? parseFloat(todayJournal.daily_max_score?.toString() || '0') : 0;

  return (
    <div className="dashboard-container animate-fade-in">
      {/* Alert banners for reviews */}
      {weeklyReviewPending && (
        <div className="alert-banner weekly animate-scale-in">
          <AlertCircle size={20} className="banner-icon" />
          <div className="banner-text">
            <h4>Weekly Reflection Ready!</h4>
            <p>It&apos;s Sunday. You have logged today&apos;s journal. Take 5 minutes to submit your Weekly Review.</p>
          </div>
          <Link href="/weekly" className="btn-banner">
            Reflect Now <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {monthlyReviewPending && (
        <div className="alert-banner monthly animate-scale-in">
          <AlertCircle size={20} className="banner-icon" />
          <div className="banner-text">
            <h4>Monthly Report Pending!</h4>
            <p>The month is ending. Generate your Monthly Report to view long term trends.</p>
          </div>
          <Link href="/monthly" className="btn-banner">
            Generate Report <ArrowRight size={14} />
          </Link>
        </div>
      )}

      <div className="welcome-banner">
        <h3>Welcome back, <span className="gradient-text">{username}</span>!</h3>
        <p>Your habits dictate your future. Stay disciplined, stay consistent.</p>
      </div>

      <div className="dashboard-grid">
        {/* Daily Score Ring */}
        <div className="dashboard-card score-ring-card card-glass">
          <h4>Today&apos;s Score</h4>
          <div className="donut-center">
            <DonutChart 
              percentage={todayScore} 
              label={todayJournal ? `${todayScore}%` : '—'} 
              subLabel={todayJournal ? `${todayRaw.toFixed(1)}/${todayMax.toFixed(1)} pts` : 'No Entry'}
            />
          </div>
          <div className="card-footer">
            {todayJournal ? (
              <span className="logged-status success">✓ Logs Submitted</span>
            ) : (
              <Link href="/journal" className="btn-primary-action">
                Log Today&apos;s Entry
              </Link>
            )}
          </div>
        </div>

        {/* Streak Metrics */}
        <div className="dashboard-card streak-card card-glass">
          <h4>Your Consistency</h4>
          <div className="streak-stats">
            <div className="streak-badge-big">
              <Flame size={48} className="flame-icon" />
              <div className="streak-num">
                <h2>{streak.current}</h2>
                <p>Day Streak</p>
              </div>
            </div>
            <div className="divider"></div>
            <div className="streak-metric-rows">
              <div className="metric-row">
                <span className="lbl">Longest Streak</span>
                <span className="val">{streak.longest} days</span>
              </div>
              <div className="metric-row">
                <span className="lbl">Week Progress</span>
                <span className="val">{weeklyStats.pct}%</span>
              </div>
              <div className="metric-row">
                <span className="lbl">Month Consistency</span>
                <span className="val">{monthlyStats.pct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Targets Status */}
        <div className="dashboard-card progress-card card-glass">
          <h4>Current Week Overview</h4>
          <div className="progress-bars-container">
            <div className="weekly-score-bar">
              <div className="bar-labels">
                <span className="lbl">Weekly Discipline Score</span>
                <span className="val">{weeklyStats.pct}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${weeklyStats.pct}%` }}></div>
              </div>
            </div>
            
            <div className="numeric-targets-list">
              <h5>Target Habits Logged</h5>
              {habits.filter(h => h.input_type === 'number').map((habit) => {
                // Calculate total logged so far in this week
                let loggedSum = 0;
                datesOfCurrentWeek.forEach((d) => {
                  const log = habitGridData[d]?.[habit.id];
                  if (log) {
                    loggedSum += parseFloat(log.raw_value || '0');
                  }
                });
                
                const target = habit.weekly_target || 0;
                const pct = target > 0 ? Math.min(100, Math.round((loggedSum / target) * 100)) : 0;
                
                return (
                  <div key={habit.id} className="target-progress-row">
                    <div className="bar-labels">
                      <span className="lbl">{habit.name}</span>
                      <span className="val">{loggedSum.toFixed(0)}/{target.toFixed(0)} {habit.unit}</span>
                    </div>
                    <div className="progress-track sm">
                      <div className="progress-fill success" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 7-Day Habit Grid */}
      <div className="dashboard-card grid-card card-glass">
        <div className="card-header-with-action">
          <h4>7-Day Discipline Grid</h4>
          <Link href="/journal" className="link-action">
            View History <ChevronRight size={16} />
          </Link>
        </div>

        <div className="grid-scroller">
          <table className="habit-grid-table">
            <thead>
              <tr>
                <th>Habit</th>
                {datesOfCurrentWeek.map((dateStr) => {
                  const d = new Date(dateStr);
                  const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                  const isToday = dateStr === formatDateString(new Date());
                  return (
                    <th key={dateStr} className={isToday ? 'today-header' : ''}>
                      <span className="day-name">{daysShort[d.getDay()]}</span>
                      <span className="day-num">{d.getDate()}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {habits.map((habit) => (
                <tr key={habit.id}>
                  <td className="habit-name-cell">
                    {habit.name}
                    {habit.unit && <span className="grid-unit"> ({habit.unit})</span>}
                  </td>
                  {datesOfCurrentWeek.map((dateStr) => {
                    const log = habitGridData[dateStr]?.[habit.id];
                    const hasLog = log !== undefined;
                    const val = log?.raw_value;
                    const score = parseFloat(log?.computed_score?.toString() || '0');

                    let cellContent = '—';
                    let cellClass = 'empty';

                    if (hasLog) {
                      if (habit.input_type === 'boolean') {
                        cellContent = val === '1' ? '✓' : '✗';
                        cellClass = val === '1' ? 'completed' : 'missed';
                      } else {
                        cellContent = parseFloat(val).toFixed(0);
                        cellClass = score > 0 ? 'completed-number' : 'missed-number';
                      }
                    }

                    return (
                      <td key={dateStr} className={`grid-cell ${cellClass}`}>
                        {cellContent}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .dashboard-container {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .alert-banner {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 24px;
          border-radius: var(--radius-md);
          box-shadow: var(--card-shadow);
        }

        .alert-banner.weekly {
          background-color: var(--primary-light);
          border: 1px solid rgba(99, 102, 241, 0.2);
          color: var(--text-primary);
        }

        .alert-banner.monthly {
          background-color: var(--accent-light);
          border: 1px solid rgba(245, 158, 11, 0.2);
          color: var(--text-primary);
        }

        .banner-icon {
          color: var(--primary);
          flex-shrink: 0;
        }

        .alert-banner.monthly .banner-icon {
          color: var(--accent);
        }

        .banner-text {
          flex: 1;
        }

        .banner-text h4 {
          font-size: 15px;
          font-weight: 700;
          font-family: 'Outfit', sans-serif;
        }

        .banner-text p {
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 2px;
        }

        .btn-banner {
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: var(--bg-surface);
          border: 1px solid var(--border);
          padding: 8px 16px;
          font-size: 12px;
          font-weight: 700;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-banner:hover {
          background-color: var(--bg-elevated);
          border-color: var(--primary);
        }

        .welcome-banner h3 {
          font-size: 22px;
          font-weight: 800;
          color: var(--text-primary);
          font-family: 'Outfit', sans-serif;
        }
        
        .gradient-text {
          background: linear-gradient(to right, var(--primary), #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          color: var(--primary); /* Fallback */
        }

        .welcome-banner p {
          font-size: 14px;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr 1.5fr;
          gap: 24px;
        }

        .dashboard-card {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .dashboard-card h4 {
          font-size: 15px;
          font-weight: 700;
          color: var(--primary);
          font-family: 'Outfit', sans-serif;
          border-bottom: 1px solid var(--border);
          padding-bottom: 12px;
        }

        .donut-center {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 1;
          padding: 10px 0;
        }

        .card-footer {
          display: flex;
          justify-content: center;
        }

        .logged-status {
          font-size: 12px;
          font-weight: 700;
          padding: 6px 16px;
          border-radius: var(--radius-full);
        }

        .logged-status.success {
          background-color: var(--success-light);
          color: var(--success);
        }

        .btn-primary-action {
          background-color: var(--primary);
          color: white;
          padding: 10px 20px;
          border-radius: var(--radius-md);
          font-size: 13px;
          font-weight: 700;
          box-shadow: 0 4px 10px rgba(99, 102, 241, 0.2);
          transition: all 0.2s;
        }

        .btn-primary-action:hover {
          background-color: var(--primary-hover);
          transform: translateY(-1px);
        }

        .streak-stats {
          display: flex;
          align-items: center;
          gap: 20px;
          flex: 1;
        }

        .streak-badge-big {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .flame-icon {
          color: var(--primary);
          filter: drop-shadow(0 4px 10px rgba(99, 102, 241, 0.4));
          animation: pulseSubtle 2s infinite ease-in-out;
        }

        .streak-num h2 {
          font-size: 40px;
          font-weight: 800;
          font-family: 'Outfit', sans-serif;
          color: var(--text-primary);
          line-height: 1;
        }

        .streak-num p {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .divider {
          width: 1px;
          height: 80px;
          background-color: var(--border);
        }

        .streak-metric-rows {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .metric-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
        }

        .metric-row .lbl {
          color: var(--text-secondary);
        }

        .metric-row .val {
          font-weight: 700;
          color: var(--text-primary);
        }

        .progress-bars-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          flex: 1;
        }

        .bar-labels {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 6px;
        }

        .bar-labels .lbl {
          color: var(--text-secondary);
        }

        .bar-labels .val {
          color: var(--text-primary);
        }

        .progress-track {
          width: 100%;
          height: 10px;
          background-color: var(--bg-inset);
          border-radius: var(--radius-full);
          overflow: hidden;
        }

        .progress-track.sm {
          height: 6px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--primary), var(--primary-hover));
          border-radius: var(--radius-full);
          transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .progress-fill.success {
          background: linear-gradient(90deg, var(--success), var(--success-hover));
        }

        .numeric-targets-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          border-top: 1px dashed var(--border);
          padding-top: 14px;
        }

        .numeric-targets-list h5 {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .card-header-with-action {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border);
          padding-bottom: 12px;
        }

        .card-header-with-action h4 {
          border-bottom: none;
          padding-bottom: 0;
        }

        .link-action {
          display: flex;
          align-items: center;
          gap: 2px;
          font-size: 12px;
          font-weight: 700;
          color: var(--primary);
        }

        .link-action:hover {
          text-decoration: underline;
        }

        .grid-scroller {
          overflow-x: auto;
          margin: 0 -24px;
          padding: 0 24px;
        }

        .habit-grid-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .habit-grid-table th, .habit-grid-table td {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
        }

        .habit-grid-table th {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-align: center;
        }

        .habit-grid-table th:first-child {
          text-align: left;
          width: 250px;
        }

        .habit-grid-table th.today-header {
          background-color: var(--primary-light);
          color: var(--primary);
          border-radius: var(--radius-sm);
        }

        .day-name {
          display: block;
          font-size: 10px;
        }

        .day-num {
          display: block;
          font-size: 14px;
          font-weight: 800;
          font-family: 'Outfit', sans-serif;
          margin-top: 2px;
        }

        .habit-name-cell {
          font-weight: 600;
          font-size: 13px;
          color: var(--text-primary);
        }

        .grid-unit {
          font-size: 11px;
          color: var(--text-tertiary);
          font-weight: 400;
        }

        .grid-cell {
          text-align: center;
          font-weight: 700;
          font-size: 13px;
        }

        .grid-cell.empty {
          color: var(--text-tertiary);
        }

        .grid-cell.completed {
          color: var(--success);
          font-size: 18px;
        }

        .grid-cell.missed {
          color: var(--danger);
          font-size: 16px;
        }

        .grid-cell.completed-number {
          color: var(--success);
          background-color: rgba(16, 185, 129, 0.05);
          border-radius: var(--radius-sm);
        }

        .grid-cell.missed-number {
          color: var(--text-tertiary);
        }

        @media (max-width: 1100px) {
          .dashboard-grid {
            grid-template-columns: 1fr 1fr;
          }
          .progress-card {
            grid-column: span 2;
          }
        }

        @media (max-width: 768px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
          .progress-card {
            grid-column: span 1;
          }
          .streak-stats {
            flex-direction: row;
            align-items: center;
            flex-wrap: wrap;
            gap: 12px;
          }
          .streak-badge-big {
            gap: 8px;
          }
          .streak-num h2 {
            font-size: 30px;
          }
          .divider {
            display: none;
          }
          .streak-metric-rows {
            width: 100%;
          }
          .alert-banner {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }
          .btn-banner {
            justify-content: center;
          }
          .grid-scroller {
            margin: 0 -16px;
            padding: 0 16px;
          }
        }

        @media (max-width: 480px) {
          .welcome-banner h3 {
            font-size: 18px;
          }
          .welcome-banner p {
            font-size: 12px;
          }
          .dashboard-card {
            padding: 16px;
          }
          .streak-stats {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          .divider {
            display: block;
            width: 100%;
            height: 1px;
          }
          .streak-num h2 {
            font-size: 36px;
          }
          .streak-metric-rows {
            width: 100%;
          }
          .habit-grid-table th:first-child {
            width: 110px;
            font-size: 10px;
          }
          .habit-grid-table th, .habit-grid-table td {
            padding: 8px 6px;
          }
          .habit-name-cell {
            font-size: 11px;
          }
          .grid-cell {
            font-size: 11px;
          }
          .grid-cell.completed {
            font-size: 14px;
          }
          .grid-cell.missed {
            font-size: 13px;
          }
          .dashboard-card h4 {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}
