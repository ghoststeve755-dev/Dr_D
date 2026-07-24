// src/hooks/useWeekly.ts

'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { WeeklyReview, Habit } from '@/types';

export function useWeekly() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeeklyReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('weekly_reviews')
        .select('*')
        .eq('user_id', user.id)
        .order('year', { ascending: false })
        .order('week_number', { ascending: false });

      if (error) throw error;
      return data as WeeklyReview[];
    } catch (err: any) {
      console.error('Error fetching weekly reviews:', err);
      setError(err.message || 'Failed to fetch weekly reviews');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const aggregateWeeklyStats = useCallback(async (week: number, year: number, activeHabits: Habit[]) => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch all journals for this week
      const { data: journals, error: journalsError } = await supabase
        .from('daily_journals')
        .select('*, habit_logs(*)')
        .eq('user_id', user.id)
        .eq('year', year)
        .eq('week_number', week);

      if (journalsError) throw journalsError;

      // Initialize aggregation counters
      let totalRawScore = 0;
      let totalMaxScore = 0;
      let moneyEarned = 0;
      let moneySpent = 0;
      const habitSummary: Record<string, { name: string; totalValue: number; totalScore: number; inputType: string; unit: string | null }> = {};

      activeHabits.forEach(h => {
        habitSummary[h.id] = {
          name: h.name,
          totalValue: 0,
          totalScore: 0,
          inputType: h.input_type,
          unit: h.unit
        };
      });

      journals?.forEach((j) => {
        totalRawScore += parseFloat(j.daily_raw_score?.toString() || '0');
        totalMaxScore += parseFloat(j.daily_max_score?.toString() || '0');

        j.habit_logs?.forEach((log: any) => {
          const valNum = parseFloat(log.raw_value) || 0;
          const scoreNum = parseFloat(log.computed_score) || 0;
          
          if (habitSummary[log.habit_id]) {
            habitSummary[log.habit_id].totalValue += valNum;
            habitSummary[log.habit_id].totalScore += scoreNum;
          }

          // Special finance tracking
          const habit = activeHabits.find(h => h.id === log.habit_id);
          if (habit) {
            if (habit.name.includes('Money Earned')) {
              moneyEarned += valNum;
            } else if (habit.name.includes('Money Spent')) {
              moneySpent += valNum;
            }
          }
        });
      });

      const weeklyPct = totalMaxScore > 0 ? Math.round((totalRawScore / totalMaxScore) * 100) : 0;

      return {
        journalsLogged: journals?.length || 0,
        weeklyRawScore: totalRawScore,
        weeklyMaxScore: totalMaxScore,
        weeklyPctScore: weeklyPct,
        moneyEarned,
        moneySpent,
        habitSummary
      };
    } catch (err: any) {
      console.error('Error aggregating weekly stats:', err);
      setError(err.message || 'Failed to aggregate weekly metrics');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const submitWeeklyReview = async (reviewData: Omit<WeeklyReview, 'id' | 'user_id' | 'submitted_at'>) => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('weekly_reviews')
        .upsert({
          ...reviewData,
          user_id: user.id,
          submitted_at: new Date().toISOString()
        }, { onConflict: 'user_id,year,week_number' })
        .select()
        .single();

      if (error) throw error;
      return data as WeeklyReview;
    } catch (err: any) {
      console.error('Error submitting weekly review:', err);
      setError(err.message || 'Failed to submit weekly review');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const autoGenerateWeeklyReview = useCallback(async (week: number, year: number, activeHabits: Habit[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const stats = await aggregateWeeklyStats(week, year, activeHabits);
      if (!stats) return;

      // Check for existing review to preserve text fields
      const { data: existingReview } = await supabase
        .from('weekly_reviews')
        .select('achievement, challenge, learning, next_focus, notes')
        .eq('user_id', user.id)
        .eq('year', year)
        .eq('week_number', week)
        .maybeSingle();

      const reviewData = {
        year,
        week_number: week,
        weekly_raw_score: stats.weeklyRawScore,
        weekly_max_score: stats.weeklyMaxScore,
        weekly_pct_score: stats.weeklyPctScore,
        habit_summary: stats.habitSummary,
        achievement: existingReview?.achievement || null,
        challenge: existingReview?.challenge || null,
        learning: existingReview?.learning || null,
        next_focus: existingReview?.next_focus || null,
        notes: existingReview?.notes || null,
      };

      await submitWeeklyReview(reviewData);
    } catch (err: any) {
      console.error('Error auto-generating weekly review:', err);
    }
  }, [aggregateWeeklyStats]);

  return {
    loading,
    error,
    fetchWeeklyReviews,
    aggregateWeeklyStats,
    submitWeeklyReview,
    autoGenerateWeeklyReview
  };
}
