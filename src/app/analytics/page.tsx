// src/app/analytics/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useHabits } from '@/hooks/useHabits';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { BarChart3, TrendingUp, DollarSign, Award, Flame } from 'lucide-react';

export default function AnalyticsPage() {
  const { habits, loading: habitsLoading } = useHabits();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  
  const [journals, setJournals] = useState<any[]>([]);
  const [habitLogs, setHabitLogs] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [financialData, setFinancialData] = useState<any[]>([]);
  const [completionData, setCompletionData] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<{ [date: string]: number }>({});

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch all journals sorted ascending
        const { data: journalList } = await supabase
          .from('daily_journals')
          .select('*, habit_logs(*)')
          .eq('user_id', user.id)
          .order('date', { ascending: true });

        if (journalList) {
          setJournals(journalList);

          // Populate heatmap map
          const heatmap: { [date: string]: number } = {};
          journalList.forEach(j => {
            heatmap[j.date] = parseFloat(j.daily_pct_score?.toString() || '0');
          });
          setHeatmapData(heatmap);
        }
      } catch (err) {
        console.error('Error fetching analytics data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  // Recalculate metrics on filter or journals change
  useEffect(() => {
    if (journals.length === 0) return;

    const today = new Date();
    let cutoffDate = new Date();
    
    if (filter === '7d') cutoffDate.setDate(today.getDate() - 7);
    else if (filter === '30d') cutoffDate.setDate(today.getDate() - 30);
    else if (filter === '90d') cutoffDate.setDate(today.getDate() - 90);
    else cutoffDate = new Date(0); // All time

    // Filter journals
    const filteredJournals = journals.filter(j => new Date(j.date) >= cutoffDate);

    // 1. Overall Score Trend Data
    const scoreTrend = filteredJournals.map(j => {
      const dataPoint: any = {
        date: j.date.substring(5), // MM-DD
        score: parseFloat(j.daily_pct_score?.toString() || '0')
      };
      
      // Add individual numeric habit values for correlations
      j.habit_logs?.forEach((log: any) => {
        const habit = habits.find(h => h.id === log.habit_id);
        if (habit && habit.input_type === 'number') {
          dataPoint[habit.name] = parseFloat(log.raw_value) || 0;
        }
      });
      return dataPoint;
    });
    setAnalyticsData(scoreTrend);

    // 2. Financial Data (Earned vs Spent)
    const finances = filteredJournals.map(j => {
      let earned = 0;
      let spent = 0;
      
      j.habit_logs?.forEach((log: any) => {
        const habit = habits.find(h => h.id === log.habit_id);
        if (habit) {
          if (habit.name.includes('Money Earned')) {
            earned = parseFloat(log.raw_value) || 0;
          } else if (habit.name.includes('Money Spent')) {
            spent = parseFloat(log.raw_value) || 0;
          }
        }
      });

      return {
        date: j.date.substring(5),
        Earned: earned,
        Spent: spent
      };
    });
    setFinancialData(finances);

    // 3. Habit Completion Rates (Boolean completion %)
    const counts: { [id: string]: { name: string; completed: number; total: number } } = {};
    
    habits.forEach(h => {
      counts[h.id] = { name: h.name, completed: 0, total: 0 };
    });

    filteredJournals.forEach(j => {
      j.habit_logs?.forEach((log: any) => {
        if (counts[log.habit_id]) {
          counts[log.habit_id].total += 1;
          const habit = habits.find(h => h.id === log.habit_id);
          if (habit) {
            if (habit.input_type === 'boolean') {
              if (log.raw_value === '1' || log.raw_value === 'true') {
                counts[log.habit_id].completed += 1;
              }
            } else {
              // Numeric habit is "completed" if it earned positive score
              if (parseFloat(log.computed_score) > 0) {
                counts[log.habit_id].completed += 1;
              }
            }
          }
        }
      });
    });

    const completionRateList = Object.values(counts)
      .filter(c => c.total > 0)
      .map(c => {
        const habit = habits.find(h => h.name === c.name);
        return {
          name: c.name,
          Rate: Math.round((c.completed / c.total) * 100),
          category: habit?.category || 'productivity',
          total: c.total,
          completed: c.completed
        };
      });
    setCompletionData(completionRateList);

  }, [journals, filter, habits]);

  // Render Calendar Heatmap (Last 90 days grid)
  const renderHeatmap = () => {
    const cells = [];
    const today = new Date();
    
    // Generate dates for the past 90 days
    for (let i = 90; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const score = heatmapData[dateStr] ?? -1; // -1 means no log
      
      let intensity = 'empty';
      if (score >= 0) {
        if (score === 0) intensity = 'zero';
        else if (score < 40) intensity = 'low';
        else if (score < 75) intensity = 'medium';
        else intensity = 'high';
      }

      cells.push(
        <div 
          key={dateStr} 
          className={`heatmap-cell ${intensity}`}
          title={`${dateStr}: ${score >= 0 ? `${score}%` : 'No Entry'}`}
        />
      );
    }
    return cells;
  };

  if (loading || habitsLoading) {
    return (
      <div className="analytics-loading">
        <div className="spinner"></div>
        <p>Analyzing discipline trends...</p>
        <style jsx>{`
          .analytics-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 80px;
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
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="analytics-container animate-fade-in">
      <div className="analytics-header">
        <div className="header-info">
          <h3>Visual Analytics & Trends</h3>
          <p>Analyze your habit completion rates, financial trends and discipline scoring over time.</p>
        </div>
        
        <div className="filter-pill-box">
          {(['7d', '30d', '90d', 'all'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              className={`filter-btn ${filter === opt ? 'active' : ''}`}
            >
              {opt === 'all' ? 'All Time' : `${opt.toUpperCase()}`}
            </button>
          ))}
        </div>
      </div>

      {/* GitHub-style Heatmap */}
      <div className="analytics-card card-glass heatmap-card">
        <h4>Discipline Heatmap (Last 90 Days)</h4>
        <div className="heatmap-grid-container">
          <div className="heatmap-grid">{renderHeatmap()}</div>
          <div className="heatmap-legend">
            <span>Less</span>
            <div className="heatmap-cell empty" />
            <div className="heatmap-cell zero" />
            <div className="heatmap-cell low" />
            <div className="heatmap-cell medium" />
            <div className="heatmap-cell high" />
            <span>More</span>
          </div>
        </div>
      </div>

      <div className="analytics-charts-grid">
        {/* Chart 1: Score Trend */}
        <div className="analytics-card card-glass chart-card">
          <h4>Overall Discipline Trend</h4>
          <div className="chart-scroll-wrapper">
            <div className="chart-inner">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={analyticsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="var(--text-secondary)" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-elevated)', 
                      borderColor: 'var(--border)',
                      borderRadius: '8px',
                      boxShadow: 'var(--shadow-md)'
                    }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                    labelStyle={{ color: 'var(--text-secondary)', fontWeight: 600 }}
                  />
                  <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={3} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Chart 2: Financial Trend */}
        <div className="analytics-card card-glass chart-card">
          <h4>Money Earned vs Money Spent</h4>
          <div className="chart-scroll-wrapper">
            <div className="chart-inner">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={financialData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={11} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-elevated)', 
                      borderColor: 'var(--border)',
                      borderRadius: '8px',
                      boxShadow: 'var(--shadow-md)'
                    }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                    labelStyle={{ color: 'var(--text-secondary)', fontWeight: 600 }}
                  />
                  <Legend />
                  <Bar dataKey="Earned" fill="var(--success)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="Spent" fill="var(--danger)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Chart 3: Habit Completion Rates — Circular Progress Cards */}
        <div className="analytics-card card-glass chart-card span-2">
          <h4>Habit Success Rates</h4>
          {completionData.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', padding: '32px 0' }}>
              No habit data found for selected period.
            </p>
          ) : (
            <div className="success-cards-grid">
              {completionData.map((item: any) => {
                const CATEGORY_COLORS: Record<string, { stroke: string; bg: string; badge: string; label: string }> = {
                  health:       { stroke: '#10b981', bg: 'rgba(16,185,129,0.08)', badge: '#10b981', label: 'Health' },
                  learning:     { stroke: '#6366f1', bg: 'rgba(99,102,241,0.08)', badge: '#6366f1', label: 'Learning' },
                  productivity: { stroke: '#f59e0b', bg: 'rgba(245,158,11,0.08)', badge: '#f59e0b', label: 'Productivity' },
                  finance:      { stroke: '#0ea5e9', bg: 'rgba(14,165,233,0.08)', badge: '#0ea5e9', label: 'Finance' },
                };
                const cat = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.productivity;
                const pct = item.Rate;
                const radius = 28;
                const circ = 2 * Math.PI * radius;
                const dash = (pct / 100) * circ;
                return (
                  <div key={item.name} className="success-card" style={{ backgroundColor: cat.bg }}>
                    <div className="success-card-ring">
                      <svg width="72" height="72" viewBox="0 0 72 72">
                        {/* Track */}
                        <circle cx="36" cy="36" r={radius} fill="none" stroke="var(--border)" strokeWidth="5" />
                        {/* Progress */}
                        <circle
                          cx="36" cy="36" r={radius} fill="none"
                          stroke={cat.stroke} strokeWidth="5"
                          strokeDasharray={`${dash} ${circ}`}
                          strokeLinecap="round"
                          transform="rotate(-90 36 36)"
                        />
                        <text x="36" y="40" textAnchor="middle" fontSize="13" fontWeight="800"
                          fill={cat.stroke} fontFamily="'Outfit', sans-serif">
                          {pct}%
                        </text>
                      </svg>
                    </div>
                    <div className="success-card-info">
                      <span className="success-card-name">{item.name}</span>
                      <span className="success-card-badge" style={{ backgroundColor: cat.badge + '22', color: cat.badge }}>
                        {cat.label}
                      </span>
                      <span className="success-card-stats">
                        {item.completed}/{item.total} days
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .analytics-container {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .analytics-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border);
          padding-bottom: 16px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .header-info h3 {
          font-size: 18px;
          font-weight: 700;
          color: var(--primary);
          font-family: 'Outfit', sans-serif;
        }

        .header-info p {
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .filter-pill-box {
          display: flex;
          background-color: var(--bg-inset);
          border: 1px solid var(--border);
          padding: 3px;
          border-radius: var(--radius-md);
        }

        .filter-btn {
          border: none;
          background: transparent;
          padding: 8px 16px;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-secondary);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-btn.active {
          background-color: var(--primary);
          color: white;
        }

        .analytics-card {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .analytics-card h4 {
          font-size: 15px;
          font-weight: 700;
          color: var(--primary);
          font-family: 'Outfit', sans-serif;
          border-bottom: 1px solid var(--border);
          padding-bottom: 12px;
        }

        .heatmap-card {
          display: flex;
          flex-direction: column;
        }

        .heatmap-grid-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
          align-items: center;
          width: 100%;
          overflow-x: auto;
          padding-bottom: 8px;
        }

        .heatmap-grid {
          display: grid;
          grid-template-columns: repeat(30, 1fr);
          gap: 6px;
          width: 100%;
          max-width: 900px;
          min-width: 600px;
        }

        :global(.heatmap-cell) {
          aspect-ratio: 1;
          border-radius: 2px;
        }

        :global(.heatmap-cell.empty) { background-color: var(--bg-inset); }
        :global(.heatmap-cell.zero) { background-color: rgba(99, 102, 241, 0.05); border: 1px solid var(--border); }
        :global(.heatmap-cell.low) { background-color: #c7d2fe; }
        :global(.heatmap-cell.medium) { background-color: #818cf8; }
        :global(.heatmap-cell.high) { background-color: #4f46e5; }

        .heatmap-legend {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--text-secondary);
          font-weight: 600;
        }

        .heatmap-legend :global(.heatmap-cell) {
          width: 12px;
          height: 12px;
        }

        .analytics-charts-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        .span-2 {
          grid-column: span 2;
        }

        .chart-wrapper {
          padding: 10px 0;
        }

        /* Circular Progress Cards Grid */
        .success-cards-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .success-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 20px 16px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .success-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .success-card-ring {
          flex-shrink: 0;
        }

        .success-card-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          text-align: center;
        }

        .success-card-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.3;
        }

        .success-card-badge {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 2px 8px;
          border-radius: var(--radius-full);
        }

        .success-card-stats {
          font-size: 11px;
          color: var(--text-tertiary);
          font-weight: 500;
        }

        /* Chart scroll wrappers — allow horizontal scroll on mobile without overflowing page */
        .chart-scroll-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 4px;
        }

        .chart-inner {
          min-width: 300px;
        }

        @media (max-width: 992px) {
          .analytics-charts-grid {
            grid-template-columns: 1fr;
          }
          .span-2 {
            grid-column: span 1;
          }
          .success-cards-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .analytics-container {
            gap: 20px;
          }
          .analytics-card {
            padding: 16px;
          }
          .analytics-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .filter-pill-box {
            width: 100%;
          }
          .filter-btn {
            flex: 1;
            text-align: center;
          }
          .heatmap-grid {
            min-width: 480px;
          }
        }

        @media (max-width: 480px) {
          .analytics-card {
            padding: 12px;
          }
          .analytics-card h4 {
            font-size: 13px;
            padding-bottom: 8px;
          }
          .success-cards-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          .success-card {
            padding: 12px 8px;
            gap: 8px;
          }
          .success-card-ring svg {
            width: 56px;
            height: 56px;
          }
          .success-card-name {
            font-size: 11px;
          }
          .heatmap-grid {
            min-width: 420px;
          }
        }
      `}</style>
    </div>
  );
}
