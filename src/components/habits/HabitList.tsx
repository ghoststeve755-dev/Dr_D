// src/components/habits/HabitList.tsx

'use client';

import { Habit } from '@/types';
import HabitCard from './HabitCard';

interface HabitListProps {
  habits: Habit[];
  onEdit: (habit: Habit) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, currentActive: boolean) => void;
  onReorder: (orderedIds: string[]) => void;
}

export default function HabitList({
  habits,
  onEdit,
  onDelete,
  onToggleActive,
  onReorder,
}: HabitListProps) {
  
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const reordered = [...habits];
    const temp = reordered[index];
    reordered[index] = reordered[index - 1];
    reordered[index - 1] = temp;
    onReorder(reordered.map(h => h.id));
  };

  const handleMoveDown = (index: number) => {
    if (index === habits.length - 1) return;
    const reordered = [...habits];
    const temp = reordered[index];
    reordered[index] = reordered[index + 1];
    reordered[index + 1] = temp;
    onReorder(reordered.map(h => h.id));
  };

  if (habits.length === 0) {
    return (
      <div className="empty-habits">
        <p>No habits configured. Create your first habit using the button above.</p>
        <style jsx>{`
          .empty-habits {
            border: 2px dashed var(--border);
            border-radius: var(--radius-md);
            padding: 40px;
            text-align: center;
            color: var(--text-secondary);
            font-weight: 500;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="habits-list-container">
      {habits.map((habit, index) => (
        <HabitCard
          key={habit.id}
          habit={habit}
          isFirst={index === 0}
          isLast={index === habits.length - 1}
          onEdit={() => onEdit(habit)}
          onDelete={() => onDelete(habit.id)}
          onToggleActive={() => onToggleActive(habit.id, habit.is_active)}
          onMoveUp={() => handleMoveUp(index)}
          onMoveDown={() => handleMoveDown(index)}
        />
      ))}
      <style jsx>{`
        .habits-list-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
      `}</style>
    </div>
  );
}
