// src/app/habits/page.tsx

'use client';

import { useState } from 'react';
import { useHabits } from '@/hooks/useHabits';
import HabitList from '@/components/habits/HabitList';
import HabitForm from '@/components/habits/HabitForm';
import { Habit } from '@/types';
import { Plus } from 'lucide-react';

export default function HabitsPage() {
  const {
    habits,
    loading,
    error,
    createHabit,
    updateHabit,
    toggleHabitActive,
    deleteHabit,
    reorderHabits
  } = useHabits();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  const handleEditClick = (habit: Habit) => {
    setEditingHabit(habit);
    setIsFormOpen(true);
  };

  const handleCreateClick = () => {
    setEditingHabit(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (habitData: any) => {
    if (editingHabit) {
      await updateHabit(editingHabit.id, habitData);
    } else {
      await createHabit(habitData);
    }
    setIsFormOpen(false);
    setEditingHabit(null);
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setEditingHabit(null);
  };

  const handleDeleteHabit = async (id: string) => {
    if (confirm('Are you sure you want to delete this habit? This will permanently delete all logged values associated with it.')) {
      await deleteHabit(id);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading Habits...</p>
        <style jsx>{`
          .loading-state {
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
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="habits-page-container animate-fade-in">
      <div className="page-header">
        <div className="header-info">
          <h3>Manage Discipline Habits</h3>
          <p>Configure scoring rules, weekly targets and display priority for your habits.</p>
        </div>
        <button onClick={handleCreateClick} className="btn-primary">
          <Plus size={16} />
          <span>New Habit</span>
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <HabitList
        habits={habits}
        onEdit={handleEditClick}
        onDelete={handleDeleteHabit}
        onToggleActive={toggleHabitActive}
        onReorder={reorderHabits}
      />

      {isFormOpen && (
        <div className="modal-overlay">
          <div className="modal-backdrop" onClick={handleFormCancel}></div>
          <div className="modal-content">
            <HabitForm
              initialHabit={editingHabit}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
            />
          </div>
        </div>
      )}

      <style jsx>{`
        .habits-page-container {
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

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 18px;
          background-color: var(--primary);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
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
          max-width: 600px;
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

          .btn-primary {
            width: 100%;
            justify-content: center;
          }

          .modal-overlay {
            padding: 0;
            align-items: flex-end;
          }

          .modal-content {
            max-width: 100%;
            max-height: 95vh;
            border-radius: var(--radius-lg) var(--radius-lg) 0 0;
          }
        }
      `}</style>
    </div>
  );
}
