// src/hooks/useJournal.ts

'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { DailyJournal, HabitLog, Habit } from '@/types';
import { calculateDailyJournalScore } from '@/lib/scoring';
import { getISOWeekAndYear, getDayName, getMonthAndYear } from '@/lib/dates';

export function useJournal() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJournalEntry = useCallback(async (dateStr: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch daily journal row and logs for this date in parallel
      const [journalResult, logsResult] = await Promise.all([
        supabase
          .from('daily_journals')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', dateStr)
          .maybeSingle(),
        supabase
          .from('habit_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', dateStr)
      ]);

      if (journalResult.error) throw journalResult.error;
      if (logsResult.error) throw logsResult.error;

      const journal = journalResult.data;
      const logs = logsResult.data;

      // Map logs to habitId -> rawValue
      const values: { [habitId: string]: string } = {};
      logs?.forEach((log) => {
        values[log.habit_id] = log.raw_value;
      });

      return {
        journal: journal as DailyJournal | null,
        values,
      };
    } catch (err: any) {
      console.error('Error fetching journal entry:', err);
      setError(err.message || 'Failed to load journal entry');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const submitJournalEntry = async (
    dateStr: string,
    values: { [habitId: string]: string },
    notes: string,
    activeHabits: Habit[]
  ) => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Calculate scores
      const { rawScore, maxScore, pctScore, computedScores } = calculateDailyJournalScore(
        activeHabits,
        values
      );

      // 2. Parse date properties
      const dateObj = new Date(dateStr);
      const { week, year } = getISOWeekAndYear(dateObj);
      const { month } = getMonthAndYear(dateObj);
      const dayName = getDayName(dateObj);
      
      const todayStr = new Date().toISOString().split('T')[0];
      const isLateEntry = dateStr !== todayStr;

      // 3. Upsert daily_journals row
      const { data: journal, error: journalError } = await supabase
        .from('daily_journals')
        .upsert({
          user_id: user.id,
          date: dateStr,
          week_number: week,
          month,
          year,
          day_of_week: dayName,
          is_late_entry: isLateEntry,
          notes: notes || null,
          daily_raw_score: rawScore,
          daily_max_score: maxScore,
          daily_pct_score: pctScore,
          submitted_at: new Date().toISOString(),
        }, { onConflict: 'user_id,date' })
        .select()
        .single();

      if (journalError) throw journalError;

      // 4. Delete old logs for this date first (clean slate) to avoid conflicts on update
      const { error: deleteError } = await supabase
        .from('habit_logs')
        .delete()
        .eq('user_id', user.id)
        .eq('date', dateStr);

      if (deleteError) throw deleteError;

      // 5. Insert new habit_logs
      const logsToInsert = activeHabits.map((habit) => ({
        user_id: user.id,
        journal_id: journal.id,
        habit_id: habit.id,
        date: dateStr,
        raw_value: values[habit.id] || '0',
        computed_score: computedScores[habit.id] || 0,
      }));

      if (logsToInsert.length > 0) {
        const { error: logsError } = await supabase
          .from('habit_logs')
          .insert(logsToInsert);

        if (logsError) throw logsError;
      }

      return journal as DailyJournal;
    } catch (err: any) {
      console.error('Error submitting journal entry:', err);
      setError(err.message || 'Failed to submit journal entry');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchJournalHistory = async (limit = 30) => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: fetchError } = await supabase
        .from('daily_journals')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;

      return data as DailyJournal[];
    } catch (err: any) {
      console.error('Error fetching journal history:', err);
      setError(err.message || 'Failed to fetch journal history');
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    fetchJournalEntry,
    submitJournalEntry,
    fetchJournalHistory,
  };
}
