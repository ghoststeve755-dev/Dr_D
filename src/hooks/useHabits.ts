// src/hooks/useHabits.ts

'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Habit, ScoringConfig } from '@/types';

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHabits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('No authenticated user found');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .order('display_order', { ascending: true });

      if (error) {
        throw error;
      }

      setHabits(data || []);
    } catch (err: any) {
      console.error('Error fetching habits:', err);
      setError(err.message || 'Failed to fetch habits');
    } finally {
      setLoading(false);
    }
  }, []);

  const createHabit = async (habitData: Omit<Habit, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('habits')
        .insert([{
          ...habitData,
          user_id: user.id
        }])
        .select();

      if (error) throw error;
      
      setHabits(prev => [...prev, data[0]].sort((a, b) => a.display_order - b.display_order));
      return data[0] as Habit;
    } catch (err: any) {
      console.error('Error creating habit:', err);
      throw new Error(err.message || 'Failed to create habit');
    }
  };

  const updateHabit = async (id: string, updates: Partial<Omit<Habit, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    try {
      const { data, error } = await supabase
        .from('habits')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();

      if (error) throw error;

      setHabits(prev => prev.map(h => h.id === id ? { ...h, ...data[0] } : h).sort((a, b) => a.display_order - b.display_order));
      return data[0] as Habit;
    } catch (err: any) {
      console.error('Error updating habit:', err);
      throw new Error(err.message || 'Failed to update habit');
    }
  };

  const toggleHabitActive = async (id: string, currentActive: boolean) => {
    return updateHabit(id, { is_active: !currentActive });
  };

  const deleteHabit = async (id: string) => {
    try {
      const { error } = await supabase
        .from('habits')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setHabits(prev => prev.filter(h => h.id !== id));
    } catch (err: any) {
      console.error('Error deleting habit:', err);
      throw new Error(err.message || 'Failed to delete habit');
    }
  };

  const reorderHabits = async (orderedIds: string[]) => {
    try {
      // Optimistic state update
      const updatedHabits = [...habits];
      orderedIds.forEach((id, index) => {
        const habitIndex = updatedHabits.findIndex(h => h.id === id);
        if (habitIndex !== -1) {
          updatedHabits[habitIndex] = { ...updatedHabits[habitIndex], display_order: index + 1 };
        }
      });
      setHabits(updatedHabits.sort((a, b) => a.display_order - b.display_order));

      // DB updates in parallel
      const updates = orderedIds.map((id, index) => 
        supabase
          .from('habits')
          .update({ display_order: index + 1, updated_at: new Date().toISOString() })
          .eq('id', id)
      );

      const results = await Promise.all(updates);
      const firstError = results.find(r => r.error);
      if (firstError) throw firstError.error;
    } catch (err: any) {
      console.error('Error reordering habits:', err);
      fetchHabits(); // Rollback to DB state
      throw new Error(err.message || 'Failed to reorder habits');
    }
  };

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  return {
    habits,
    loading,
    error,
    refetch: fetchHabits,
    createHabit,
    updateHabit,
    toggleHabitActive,
    deleteHabit,
    reorderHabits
  };
}
