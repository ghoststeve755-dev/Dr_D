// src/components/habits/HabitCard.tsx

'use client';

import { Habit } from '@/types';
import { Edit2, Trash2, ArrowUp, ArrowDown, Settings, HelpCircle } from 'lucide-react';

interface HabitCardProps {
  habit: Habit;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export default function HabitCard({
  habit,
  isFirst,
  isLast,
  onEdit,
  onDelete,
  onToggleActive,
  onMoveUp,
  onMoveDown,
}: HabitCardProps) {
  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case 'health': return '🏥';
      case 'learning': return '🎓';
      case 'productivity': return '⚡';
      case 'finance': return '💰';
      default: return '📌';
    }
  };

  const getScoringRuleLabel = (config: any) => {
    switch (config.type) {
      case 'boolean':
        return `Yes = ${config.yes_points} pt`;
      case 'divide_by':
        return `Value ÷ ${config.divisor}`;
      case 'multiply_by':
        return `Value × ${config.multiplier}`;
      case 'add_subtract':
        return `${config.multiplier >= 0 ? '+' : ''}${config.multiplier} pts per ${config.per_unit} units`;
      case 'fixed':
        return `${config.fixed_points} pts if non-zero`;
      case 'threshold':
        return `${config.rules.length} Threshold Tiers`;
      default:
        return 'Custom rule';
    }
  };

  return (
    <div className={`habit-card-container ${habit.is_active ? '' : 'inactive-habit'}`}>
      <div className="drag-reorder-section">
        <button 
          onClick={onMoveUp} 
          disabled={isFirst} 
          className="order-btn" 
          aria-label="Move Up"
        >
          <ArrowUp size={16} />
        </button>
        <button 
          onClick={onMoveDown} 
          disabled={isLast} 
          className="order-btn" 
          aria-label="Move Down"
        >
          <ArrowDown size={16} />
        </button>
      </div>

      <div className="habit-info-section">
        <div className="title-row">
          <h4>{habit.name}</h4>
          {habit.is_system && <span className="system-badge">System</span>}
        </div>
        <div className="badges-row">
          <span className={`category-badge ${habit.category}`}>
            {getCategoryEmoji(habit.category)} {habit.category}
          </span>
          <span className="type-badge">
            {habit.input_type === 'boolean' ? 'Boolean' : 'Numeric'}
          </span>
          {habit.unit && <span className="unit-badge">Unit: {habit.unit}</span>}
        </div>
      </div>

      <div className="habit-config-section">
        <div className="config-item">
          <span className="label">Scoring Method</span>
          <span className="val">{getScoringRuleLabel(habit.scoring_config)}</span>
        </div>
        {habit.weekly_target && (
          <div className="config-item">
            <span className="label">Weekly Target</span>
            <span className="val">{habit.weekly_target} {habit.unit}</span>
          </div>
        )}
      </div>

      <div className="habit-actions-section">
        <div className="toggle-container">
          <label className="switch">
            <input 
              type="checkbox" 
              checked={habit.is_active} 
              onChange={onToggleActive} 
            />
            <span className="slider round"></span>
          </label>
          <span className="toggle-label">{habit.is_active ? 'Active' : 'Disabled'}</span>
        </div>

        <div className="action-buttons">
          <button onClick={onEdit} className="btn-action edit" aria-label="Edit Habit">
            <Edit2 size={16} />
          </button>
          <button 
            onClick={onDelete} 
            disabled={habit.is_system} 
            className="btn-action delete" 
            aria-label="Delete Habit"
            title={habit.is_system ? "System habits cannot be deleted" : "Delete habit"}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <style jsx>{`
        .habit-card-container {
          background-color: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          padding: 16px 20px;
          gap: 20px;
          transition: all 0.2s ease;
        }

        .habit-card-container:hover {
          border-color: var(--primary);
          box-shadow: var(--card-shadow);
        }

        .inactive-habit {
          opacity: 0.6;
        }

        .drag-reorder-section {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .order-btn {
          background: transparent;
          border: none;
          color: var(--text-tertiary);
          cursor: pointer;
          padding: 2px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .order-btn:hover:not(:disabled) {
          color: var(--text-primary);
          background-color: var(--bg-inset);
        }

        .order-btn:disabled {
          opacity: 0.2;
          cursor: not-allowed;
        }

        .habit-info-section {
          flex: 2;
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 150px;
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .title-row h4 {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          font-family: 'Outfit', sans-serif;
        }

        .system-badge {
          background-color: var(--primary-light);
          color: var(--primary);
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: var(--radius-full);
          text-transform: uppercase;
        }

        .badges-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .category-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          text-transform: capitalize;
        }

        .category-badge.health {
          background-color: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
        }
        .category-badge.learning {
          background-color: rgba(139, 92, 246, 0.1);
          color: #8b94f6;
        }
        .category-badge.productivity {
          background-color: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }
        .category-badge.finance {
          background-color: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
        }

        .type-badge, .unit-badge {
          background-color: var(--bg-inset);
          color: var(--text-secondary);
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: var(--radius-sm);
        }

        .habit-config-section {
          flex: 1.5;
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 140px;
        }

        .config-item {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          border-bottom: 1px dashed var(--border);
          padding-bottom: 4px;
        }

        .config-item .label {
          color: var(--text-secondary);
        }

        .config-item .val {
          font-weight: 600;
          color: var(--text-primary);
        }

        .habit-actions-section {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .toggle-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          min-width: 60px;
        }

        .toggle-label {
          font-size: 10px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }

        .btn-action {
          background-color: transparent;
          border: 1px solid var(--border);
          color: var(--text-secondary);
          cursor: pointer;
          height: 36px;
          width: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-md);
          transition: all 0.2s ease;
        }

        .btn-action:hover:not(:disabled) {
          color: var(--text-primary);
          background-color: var(--bg-inset);
        }

        .btn-action.edit:hover {
          color: var(--primary);
          border-color: var(--primary);
          background-color: var(--primary-light);
        }

        .btn-action.delete:hover:not(:disabled) {
          color: var(--danger);
          border-color: var(--danger);
          background-color: var(--danger-light);
        }

        .btn-action:disabled {
          opacity: 0.3;
          cursor: not-allowed;
          background-color: var(--bg-inset);
        }

        @media (max-width: 768px) {
          .habit-card-container {
            flex-direction: column;
            align-items: stretch;
            padding: 16px;
          }

          .drag-reorder-section {
            flex-direction: row;
            justify-content: flex-end;
          }

          .habit-actions-section {
            justify-content: space-between;
            border-top: 1px solid var(--border);
            padding-top: 12px;
          }
        }
      `}</style>
    </div>
  );
}
