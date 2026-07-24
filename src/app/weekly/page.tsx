// src/app/weekly/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useWeekly } from '@/hooks/useWeekly';
import WeeklyForm from '@/components/weekly/WeeklyForm';
import { WeeklyReview } from '@/types';
import { getISOWeekAndYear } from '@/lib/dates';
import { Calendar, Plus, CheckCircle, ChevronDown, ChevronUp, AlertCircle, FileSpreadsheet, Activity } from 'lucide-react';
import { generateDetailedComparison, generateReadableSummaryText } from '@/lib/summaryGenerator';

export default function WeeklyReviewsPage() {
  const { fetchWeeklyReviews, loading, error } = useWeekly();
  const [reviews, setReviews] = useState<WeeklyReview[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState({ week: 1, year: 2026 });
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);

  const loadReviews = async () => {
    const list = await fetchWeeklyReviews();
    setReviews(list);
  };

  useEffect(() => {
    loadReviews();
    
    // Set default week to review (the current ISO week)
    const { week, year } = getISOWeekAndYear(new Date());
    setSelectedWeek({ week, year });
  }, [fetchWeeklyReviews]);

  const handleReviewSuccess = () => {
    setIsFormOpen(false);
    loadReviews(); // Refresh review list
  };

  const toggleExpand = (id: string) => {
    setExpandedReviewId(prev => prev === id ? null : id);
  };

  const handleCreateNewReview = () => {
    // Check if a review already exists for selected week
    const exists = reviews.some(r => r.week_number === selectedWeek.week && r.year === selectedWeek.year);
    if (exists) {
      if (!confirm(`A review for Week ${selectedWeek.week}, ${selectedWeek.year} already exists. Overwrite?`)) {
        return;
      }
    }
    setIsFormOpen(true);
  };

  return (
    <div className="weekly-page-container animate-fade-in">
      <div className="page-header">
        <div className="header-info">
          <h3>Weekly Reflections & Reviews</h3>
          <p>Weekly stats are automatically generated every Sunday based on your daily journals. Edit them here to add your personal reflections.</p>
        </div>

        <div className="header-actions">
          <div className="week-selector-bar">
            <span className="lbl">Week</span>
            <input
              type="number"
              min="1"
              max="53"
              value={selectedWeek.week}
              onChange={(e) => setSelectedWeek(prev => ({ ...prev, week: parseInt(e.target.value) || 1 }))}
              className="week-input"
            />
            <span className="lbl">Year</span>
            <input
              type="number"
              value={selectedWeek.year}
              onChange={(e) => setSelectedWeek(prev => ({ ...prev, year: parseInt(e.target.value) || 2026 }))}
              className="year-input"
            />
            <button onClick={handleCreateNewReview} className="btn-primary">
              <Plus size={16} />
              <span>Review Week</span>
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="reviews-list">
        {loading && reviews.length === 0 ? (
          <div className="reviews-loading">
            <div className="spinner"></div>
            <p>Loading weekly history...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="empty-reviews card-glass">
            <Calendar size={36} className="empty-icon" />
            <h4>No Weekly Reviews generated yet</h4>
            <p>Reviews will appear here automatically when you complete a Sunday journal, or you can manually create one above.</p>
          </div>
        ) : (
          reviews.map((review) => {
            const isExpanded = expandedReviewId === review.id;
            const summary = review.habit_summary || {};
            
            // Calculate financial metrics
            let earned = 0;
            let spent = 0;
            Object.values(summary).forEach((info: any) => {
              if (info.name.includes('Money Earned')) earned = info.totalValue;
              else if (info.name.includes('Money Spent')) spent = info.totalValue;
            });
            const savings = earned - spent;

            let prevYear = review.year;
            let prevWeek = review.week_number - 1;
            if (prevWeek === 0) {
              prevYear -= 1;
              prevWeek = 53; // Assuming max 53 weeks
            }
            const prevReview = reviews.find(r => r.year === prevYear && r.week_number === prevWeek);
            const prevSummary = prevReview?.habit_summary || null;
            
            const comparisons = generateDetailedComparison(summary, prevSummary);
            const summaryText = generateReadableSummaryText('week', review.weekly_pct_score, prevReview ? prevReview.weekly_pct_score : null, comparisons);

            return (
              <div key={review.id} className={`review-accordion-card card-glass ${isExpanded ? 'expanded' : ''}`}>
                <div onClick={() => toggleExpand(review.id)} className="accordion-trigger">
                  <div className="trigger-left">
                    <div className="week-badge">
                      <span className="w-num">W{review.week_number}</span>
                      <span className="y-num">{review.year}</span>
                    </div>
                    <div className="trigger-summary">
                      <h4>Weekly Score: <span className="score-color">{review.weekly_pct_score}%</span></h4>
                      <p className="fin-summary">
                        Earned: <span className="success">₹{earned.toLocaleString()}</span> | 
                        Spent: <span className="danger">₹{spent.toLocaleString()}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="trigger-right">
                    <span className="raw-pts-pill">
                      {parseFloat(review.weekly_raw_score.toString()).toFixed(1)} / {parseFloat(review.weekly_max_score.toString()).toFixed(1)} pts
                    </span>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="accordion-content animate-fade-in">
                    <div className="auto-summary-box">
                      <h5><Activity size={16} /> Automated Weekly Summary</h5>
                      <p>{summaryText}</p>
                    </div>

                    <div className="content-grid" style={{ marginTop: '20px' }}>
                      {/* Left: Reflection Notes */}
                      <div className="reflection-details">
                        <div className="ref-item">
                          <h5>🏆 Biggest Achievement</h5>
                          <p>{review.achievement || 'No entry'}</p>
                        </div>
                        <div className="ref-item">
                          <h5>⚠️ Biggest Challenge</h5>
                          <p>{review.challenge || 'No entry'}</p>
                        </div>
                        <div className="ref-item">
                          <h5>💡 Lessons Learned</h5>
                          <p>{review.learning || 'No entry'}</p>
                        </div>
                        <div className="ref-item">
                          <h5>🎯 Focus for Next Week</h5>
                          <p>{review.next_focus || 'No entry'}</p>
                        </div>
                        {review.notes && (
                          <div className="ref-item">
                            <h5>📝 Additional Notes</h5>
                            <p>{review.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Right: Detailed Comparison */}
                      <div className="habit-totals-details">
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
                            fontSize: '12px'
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

      {isFormOpen && (
        <div className="modal-overlay">
          <div className="modal-backdrop" onClick={() => setIsFormOpen(false)}></div>
          <div className="modal-content">
            <WeeklyForm
              year={selectedWeek.year}
              week={selectedWeek.week}
              onSuccess={handleReviewSuccess}
              onCancel={() => setIsFormOpen(false)}
            />
          </div>
        </div>
      )}

      <style jsx>{`
        .weekly-page-container {
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

        .week-selector-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          background-color: var(--bg-surface);
          border: 1px solid var(--border);
          padding: 6px 12px;
          border-radius: var(--radius-md);
        }

        .week-selector-bar .lbl {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-secondary);
        }

        .week-input, .year-input {
          width: 60px;
          padding: 6px 8px;
          border: 1px solid var(--border);
          background-color: var(--bg-elevated);
          border-radius: var(--radius-sm);
          text-align: center;
          font-weight: 600;
          outline: none;
        }

        .year-input {
          width: 80px;
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

        .reviews-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .reviews-loading {
          text-align: center;
          padding: 40px;
          color: var(--text-secondary);
        }

        .empty-reviews {
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

        .empty-reviews h4 {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .empty-reviews p {
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

        .review-accordion-card {
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

        .week-badge {
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

        .week-badge .w-num {
          font-size: 16px;
          font-weight: 800;
          color: var(--text-primary);
          font-family: 'Outfit', sans-serif;
        }

        .week-badge .y-num {
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

        .raw-pts-pill {
          background-color: var(--bg-inset);
          padding: 4px 12px;
          border-radius: var(--radius-full);
          font-size: 11px;
          font-weight: 700;
          color: var(--text-secondary);
        }

        .accordion-content {
          border-top: 1px solid var(--border);
          background-color: rgba(0, 0, 0, 0.01);
          padding: 24px;
        }

        .content-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 32px;
        }

        .reflection-details {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .ref-item h5 {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }

        .ref-item p {
          font-size: 13px;
          color: var(--text-primary);
          line-height: 1.5;
          background-color: var(--bg-surface);
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          border-left: 3px solid var(--border);
        }

        .ref-item:nth-child(1) p { border-left-color: #f59e0b; }
        .ref-item:nth-child(2) p { border-left-color: #ef4444; }
        .ref-item:nth-child(3) p { border-left-color: #10b981; }
        .ref-item:nth-child(4) p { border-left-color: #3b82f6; }

        .habit-totals-details h5 {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
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
          max-width: 680px;
          max-height: 90vh;
          overflow-y: auto;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-xl);
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
          .week-selector-bar {
            flex-wrap: wrap;
            gap: 8px;
            width: 100%;
          }
          .week-input, .year-input {
            width: 70px;
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
          }
          .modal-overlay {
            align-items: flex-end;
            padding: 0;
          }
        }

        @media (max-width: 480px) {
          .week-selector-bar {
            flex-direction: column;
            align-items: stretch;
          }
          .week-input, .year-input {
            width: 100%;
            text-align: left;
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
          .empty-reviews {
            padding: 30px 16px;
          }
        }
      `}</style>
    </div>
  );
}
