// src/hooks/useMonthly.ts

'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { MonthlyReport, Habit } from '@/types';

export function useMonthly() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMonthlyReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('monthly_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) throw error;
      return data as MonthlyReport[];
    } catch (err: any) {
      console.error('Error fetching monthly reports:', err);
      setError(err.message || 'Failed to fetch monthly reports');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const aggregateMonthlyStats = useCallback(async (month: number, year: number, activeHabits: Habit[]) => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch all journals for this month
      const { data: journals, error: journalsError } = await supabase
        .from('daily_journals')
        .select('*, habit_logs(*)')
        .eq('user_id', user.id)
        .eq('year', year)
        .eq('month', month);

      if (journalsError) throw journalsError;

      // Initialize aggregation counters
      let totalRawScore = 0;
      let totalMaxScore = 0;
      let moneyEarned = 0;
      let moneySpent = 0;
      const habitSummary: Record<string, { name: string; totalValue: number; totalScore: number; inputType: string; unit: string | null; logsCount: number }> = {};

      activeHabits.forEach(h => {
        habitSummary[h.id] = {
          name: h.name,
          totalValue: 0,
          totalScore: 0,
          inputType: h.input_type,
          unit: h.unit,
          logsCount: 0
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
            habitSummary[log.habit_id].logsCount += 1;
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

      const averageDailyPct = journals && journals.length > 0 
        ? Math.round(journals.reduce((acc, curr) => acc + parseFloat(curr.daily_pct_score?.toString() || '0'), 0) / journals.length)
        : 0;

      return {
        journalsLogged: journals?.length || 0,
        monthlyPctScore: averageDailyPct,
        moneyEarned,
        moneySpent,
        habitSummary
      };
    } catch (err: any) {
      console.error('Error aggregating monthly stats:', err);
      setError(err.message || 'Failed to aggregate monthly metrics');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const submitMonthlyReport = async (reportData: Omit<MonthlyReport, 'id' | 'user_id' | 'created_at'>) => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('monthly_reports')
        .upsert({
          ...reportData,
          user_id: user.id,
          created_at: new Date().toISOString()
        }, { onConflict: 'user_id,year,month' })
        .select()
        .single();

      if (error) throw error;
      return data as MonthlyReport;
    } catch (err: any) {
      console.error('Error submitting monthly report:', err);
      setError(err.message || 'Failed to save monthly report');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    fetchMonthlyReports,
    aggregateMonthlyStats,
    submitMonthlyReport
  };
}
