// src/app/monthly/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useMonthly } from '@/hooks/useMonthly';
import { useHabits } from '@/hooks/useHabits';
import { MonthlyReport } from '@/types';
import { ChevronDown, ChevronUp, Calendar, Plus, Sparkles, FileSpreadsheet, Activity } from 'lucide-react';
import { generateDetailedComparison, generateReadableSummaryText } from '@/lib/summaryGenerator';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function MonthlyReportsPage() {
  const { habits } = useHabits();
  const { fetchMonthlyReports, aggregateMonthlyStats, submitMonthlyReport, loading, error } = useMonthly();
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  
  // Selection state for new reports
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStats, setGenStats] = useState<any>(null);

  const loadReports = async () => {
    const list = await fetchMonthlyReports();
    setReports(list);
  };

  useEffect(() => {
    loadReports();
    const today = new Date();
    setSelectedMonth(today.getMonth() + 1); // 1-indexed
    setSelectedYear(today.getFullYear());
  }, [fetchMonthlyReports]);

  const toggleExpand = (id: string) => {
    setExpandedReportId(prev => prev === id ? null : id);
  };

  const handleAggregateClick = async () => {
    const active = habits.filter(h => h.is_active);
    const data = await aggregateMonthlyStats(selectedMonth, selectedYear, active);
    if (data) {
      setGenStats(data);
      setIsGenerating(true);
    }
  };

  const handleSaveReport = async () => {
    if (!genStats) return;
    try {
      await submitMonthlyReport({
        year: selectedYear,
        month: selectedMonth,
        monthly_pct_score: genStats.monthlyPctScore,
        habit_summary: genStats.habitSummary,
        is_auto_generated: false
      });
      setIsGenerating(false);
      setGenStats(null);
      loadReports(); // Refresh
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="monthly-page-container animate-fade-in">
      <div className="page-header">
        <div className="header-info">
          <h3>Monthly Reports & Summaries</h3>
          <p>Monthly stats are automatically generated on the last day of the month based on your daily journals. You can also manually compile them here.</p>
        </div>

        <div className="header-actions">
          <div className="month-selector-bar">
            <span className="lbl">Month</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="month-select"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>{name}</option>
              ))}
            </select>
            <span className="lbl">Year</span>
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value) || 2026)}
              className="year-input"
            />
            <button onClick={handleAggregateClick} className="btn-primary">
              <Plus size={16} />
              <span>Compile Report</span>
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Compiler overlay/modal */}
      {isGenerating && genStats && (
        <div className="modal-overlay">
          <div className="modal-backdrop" onClick={() => setIsGenerating(false)}></div>
          <div className="modal-content card-glass">
            <h3>Confirm Monthly Report</h3>
            <p className="compiler-subtitle">Compiling summary metrics for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}</p>
            
            <div className="compiled-stats-summary">
              <div className="stat-row highlight">
                <span>Discipline Consistency Score</span>
                <span className="val">{genStats.monthlyPctScore}%</span>
              </div>
              <div className="stat-row">
                <span>Days Logged</span>
                <span>{genStats.journalsLogged} days</span>
              </div>
              <div className="stat-row">
                <span>Total Money Earned</span>
                <span className="success">₹{genStats.moneyEarned.toLocaleString()}</span>
              </div>
              <div className="stat-row">
                <span>Total Money Spent</span>
                <span className="danger">₹{genStats.moneySpent.toLocaleString()}</span>
              </div>
              <div className="stat-row highlight">
                <span>Net Savings</span>
                <span className={genStats.moneyEarned - genStats.moneySpent >= 0 ? 'success' : 'danger'}>
                  ₹{(genStats.moneyEarned - genStats.moneySpent).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={() => setIsGenerating(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSaveReport} className="btn-primary">Save Report</button>
            </div>
          </div>
        </div>
      )}

      {/* Reports List */}
      <div className="reports-list">
        {loading && reports.length === 0 ? (
          <div className="reports-loading">
            <div className="spinner"></div>
            <p>Loading monthly summaries...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="empty-reports card-glass">
            <Calendar size={36} className="empty-icon" />
            <h4>No Monthly Reports generated yet</h4>
            <p>Reports will appear here automatically when you complete a journal on the last day of the month, or you can manually compile one above.</p>
          </div>
        ) : (
          reports.map((report) => {
            const isExpanded = expandedReportId === report.id;
            const summary = report.habit_summary || {};
            
            // Calculate financial metrics
            let earned = 0;
            let spent = 0;
            Object.values(summary).forEach((info: any) => {
              if (info.name.includes('Money Earned')) earned = info.totalValue;
              else if (info.name.includes('Money Spent')) spent = info.totalValue;
            });
            const savings = earned - spent;

            let prevYear = report.year;
            let prevMonth = report.month - 1;
            if (prevMonth === 0) {
              prevYear -= 1;
              prevMonth = 12;
            }
            const prevReport = reports.find(r => r.year === prevYear && r.month === prevMonth);
            const prevSummary = prevReport?.habit_summary || null;
            
            const comparisons = generateDetailedComparison(summary, prevSummary);
            const summaryText = generateReadableSummaryText('month', report.monthly_pct_score, prevReport ? prevReport.monthly_pct_score : null, comparisons);

            return (
              <div key={report.id} className={`report-accordion-card card-glass ${isExpanded ? 'expanded' : ''}`}>
                <div onClick={() => toggleExpand(report.id)} className="accordion-trigger">
                  <div className="trigger-left">
                    <div className="month-badge">
                      <span className="m-num">{MONTH_NAMES[report.month - 1].substring(0, 3)}</span>
                      <span className="y-num">{report.year}</span>
                    </div>
                    <div className="trigger-summary">
                      <h4>Monthly Score: <span className="score-color">{report.monthly_pct_score}%</span></h4>
                      <p className="fin-summary">
                        Savings: <span className={savings >= 0 ? 'success' : 'danger'}>₹{savings.toLocaleString()}</span> (Earned: ₹{earned.toLocaleString()} | Spent: ₹{spent.toLocaleString()})
                      </p>
                    </div>
                  </div>
                  
                  <div className="trigger-right">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="accordion-content animate-fade-in">
                    <div className="auto-summary-box">
                      <h5><Activity size={16} /> Automated Monthly Summary</h5>
                      <p>{summaryText}</p>
                    </div>

                    <div className="content-grid" style={{ marginTop: '20px' }}>
                      {/* Left: Detailed Comparison */}
                      <div className="monthly-metrics-details">
                        <h5>📊 Detailed Performance</h5>
                        <div className="comparison-table-wrapper" style={{ marginBottom: '16px', overflowX: 'auto' }}>
                          <table className="comparison-table">
                            <thead>
                              <tr>
                                <th>Metric</th>
                                <th>Current</th>
                                <th>Previous</th>
                                <th>Diff</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {comparisons.map((comp) => {
                                const valStr = comp.inputType === 'boolean' ? ' days' : (comp.unit ? ` ${comp.unit}` : '');
                                const isPositive = comp.difference > 0;
                                const diffStr = comp.difference === 0 ? '-' : `${isPositive ? '+' : ''}${comp.difference}${valStr}`;
                                const statusClass = comp.status === 'Improved' ? 'success' : comp.status === 'Declined' ? 'danger' : 'neutral';
                                
                                return (
                                  <tr key={comp.habitId}>
                                    <td className="metric-name">{comp.name}</td>
                                    <td>{comp.currentValue}{valStr}</td>
                                    <td>{prevSummary ? `${comp.prevValue}${valStr}` : '—'}</td>
                                    <td className={statusClass}>{prevSummary ? diffStr : '—'}</td>
                                    <td>
                                      {prevSummary && comp.status !== 'No Change' && (
                                        <span className={`status-badge ${statusClass}`}>{comp.status}</span>
                                      )}
                                      {!prevSummary && '—'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Right: Actions and visual progress */}
                      <div className="visual-metrics-details">
                        <h5>💡 Month Achievements</h5>
                        <div className="achievement-box">
                          <Sparkles className="ach-icon" size={16} />
                          <p>
                            During {MONTH_NAMES[report.month - 1]} {report.year}, you achieved an overall discipline score of {report.monthly_pct_score}%. 
                            You registered a net savings of ₹{savings.toLocaleString()} rupees.
                          </p>
                        </div>

                        <button 
                          onClick={() => window.print()} 
                          className="btn-print-report btn-primary"
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '10px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '12px',
                            marginTop: '20px'
                          }}
                        >
                          <FileSpreadsheet size={16} /> Save / Print PDF
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <style jsx>{`
        .monthly-page-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border);
          padding-bottom: 16px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .header-info h3 {
          font-size: 24px;
          font-weight: 800;
          color: var(--primary);
          font-family: 'Outfit', sans-serif;
        }

        .header-info p {
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .month-selector-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          background-color: var(--bg-surface);
          border: 1px solid var(--border);
          padding: 6px 12px;
          border-radius: var(--radius-md);
        }

        .month-selector-bar .lbl {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-secondary);
        }

        .month-select, .year-input {
          padding: 6px 10px;
          border: 1px solid var(--border);
          background-color: var(--bg-elevated);
          border-radius: var(--radius-sm);
          font-weight: 600;
          outline: none;
        }

        .year-input {
          width: 80px;
          text-align: center;
        }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background-color: var(--primary);
          color: white;
          border: none;
          border-radius: var(--radius-sm);
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
        }

        .btn-primary:hover {
          background-color: var(--primary-hover);
        }

        .error-banner {
          background-color: var(--danger-light);
          color: var(--danger);
          padding: 12px 16px;
          border-radius: var(--radius-md);
          border: 1px solid rgba(239, 68, 68, 0.1);
          font-size: 13px;
          font-weight: 500;
        }

        .reports-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .reports-loading {
          text-align: center;
          padding: 40px;
          color: var(--text-secondary);
        }

        .empty-reports {
          padding: 50px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .empty-icon {
          color: var(--text-tertiary);
        }

        .empty-reports h4 {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .empty-reports p {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .auto-summary-box {
          background-color: var(--primary-light);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: var(--radius-md);
          padding: 16px;
          margin-bottom: 24px;
        }

        .auto-summary-box h5 {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--primary);
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 8px;
          font-family: 'Outfit', sans-serif;
        }

        .auto-summary-box p {
          font-size: 14px;
          color: var(--text-primary);
          line-height: 1.5;
        }

        .comparison-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .comparison-table th {
          text-align: left;
          padding: 8px 12px;
          border-bottom: 1px solid var(--border);
          color: var(--text-secondary);
          font-weight: 600;
        }

        .comparison-table td {
          padding: 10px 12px;
          border-bottom: 1px solid var(--border);
          color: var(--text-primary);
        }

        .comparison-table .metric-name {
          font-weight: 600;
        }

        .comparison-table .success {
          color: var(--success);
          font-weight: 600;
        }

        .comparison-table .danger {
          color: var(--danger);
          font-weight: 600;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          font-size: 11px;
          font-weight: 700;
        }

        .status-badge.success {
          background-color: var(--success-light);
          color: var(--success);
        }

        .status-badge.danger {
          background-color: var(--danger-light);
          color: var(--danger);
        }

        .report-accordion-card {
          border-radius: var(--radius-md);
          overflow: hidden;
          transition: all 0.2s ease;
        }

        .accordion-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          cursor: pointer;
          user-select: none;
          background-color: var(--bg-surface);
        }

        .accordion-trigger:hover {
          background-color: rgba(0, 0, 0, 0.02);
        }

        .trigger-left {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .month-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 52px;
          height: 52px;
          border-radius: var(--radius-sm);
          background-color: var(--bg-inset);
          border: 1px solid var(--border);
        }

        .month-badge .m-num {
          font-size: 16px;
          font-weight: 800;
          color: var(--text-primary);
          font-family: 'Outfit', sans-serif;
          text-transform: uppercase;
        }

        .month-badge .y-num {
          font-size: 9px;
          color: var(--text-secondary);
          font-weight: 600;
        }

        .trigger-summary h4 {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          font-family: 'Outfit', sans-serif;
        }

        .score-color {
          color: var(--primary);
        }

        .fin-summary {
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 4px;
          font-weight: 500;
        }

        .fin-summary .success { color: var(--success); font-weight: 700; }
        .fin-summary .danger { color: var(--danger); font-weight: 700; }

        .trigger-right {
          display: flex;
          align-items: center;
          gap: 16px;
          color: var(--text-secondary);
        }

        .accordion-content {
          border-top: 1px solid var(--border);
          background-color: rgba(0, 0, 0, 0.01);
          padding: 24px;
        }

        .content-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }

        .totals-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          background-color: var(--bg-surface);
          border: 1px solid var(--border);
          padding: 16px;
          border-radius: var(--radius-md);
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          border-bottom: 1px dashed var(--border);
          padding-bottom: 4px;
        }

        .total-row .lbl {
          color: var(--text-secondary);
        }

        .total-row .val {
          font-weight: 700;
          color: var(--text-primary);
        }

        .achievement-box {
          display: flex;
          gap: 12px;
          background-color: var(--bg-surface);
          border: 1px solid var(--border);
          padding: 16px;
          border-radius: var(--radius-md);
        }

        .ach-icon {
          color: #f59e0b;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .achievement-box p {
          font-size: 13px;
          line-height: 1.5;
          color: var(--text-secondary);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
        }

        .modal-content {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 500px;
          background-color: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .modal-content h3 {
          font-size: 18px;
          font-weight: 800;
          color: var(--text-primary);
          font-family: 'Outfit', sans-serif;
        }

        .compiler-subtitle {
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: -8px;
        }

        .compiled-stats-summary {
          background-color: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: var(--text-secondary);
        }

        .stat-row.highlight {
          font-weight: 700;
          color: var(--text-primary);
          border-bottom: 1px dashed var(--border);
          padding-bottom: 6px;
          margin-bottom: 4px;
        }

        .stat-row .val {
          color: var(--primary);
        }

        .stat-row .success { color: var(--success); }
        .stat-row .danger { color: var(--danger); }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          border-top: 1px solid var(--border);
          padding-top: 16px;
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .header-actions {
            width: 100%;
          }
          .month-selector-bar {
            flex-wrap: wrap;
            gap: 8px;
            width: 100%;
          }
          .month-select {
            flex: 1;
            min-width: 120px;
          }
          .year-input {
            width: 80px;
          }
          .btn-primary {
            margin-left: auto;
          }
          .content-grid {
            grid-template-columns: 1fr;
            gap: 24px;
          }
          .accordion-trigger {
            padding: 14px 16px;
          }
          .accordion-content {
            padding: 16px;
          }
          .modal-content {
            max-width: 100%;
            max-height: 95vh;
            border-radius: var(--radius-lg) var(--radius-lg) 0 0;
            padding: 20px 16px;
          }
          .modal-overlay {
            align-items: flex-end;
            padding: 0;
          }
          .modal-actions {
            flex-direction: column;
          }
          .modal-actions .btn-primary,
          .modal-actions .btn-secondary {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .month-selector-bar {
            flex-direction: column;
            align-items: stretch;
          }
          .month-select, .year-input {
            width: 100%;
          }
          .btn-primary {
            width: 100%;
            justify-content: center;
            margin-left: 0;
          }
          .accordion-trigger {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .trigger-left {
            width: 100%;
          }
          .trigger-right {
            width: 100%;
            justify-content: space-between;
            border-top: 1px dashed var(--border);
            padding-top: 10px;
          }
          .trigger-summary h4 {
            font-size: 14px;
          }
          .empty-reports {
            padding: 30px 16px;
          }
        }
      `}</style>
    </div>
  );
}
