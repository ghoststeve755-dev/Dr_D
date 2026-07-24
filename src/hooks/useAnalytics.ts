import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Habit } from '@/types';

export function useAnalytics(habits: Habit[], habitsLoading: boolean) {
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  
  const [journals, setJournals] = useState<any[]>([]);
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
    if (journals.length === 0 || habitsLoading) return;

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

    // 2. Dynamic Numeric Trends
    const numericTrends: { [habitId: string]: { name: string, data: any[] } } = {};
    
    habits.filter(h => h.input_type === 'number').forEach(h => {
      numericTrends[h.id] = { name: h.name, data: [] };
    });

    filteredJournals.forEach(j => {
      const dateStr = j.date.substring(5);
      
      habits.filter(h => h.input_type === 'number').forEach(h => {
        // Find log for this habit
        const log = j.habit_logs?.find((l: any) => l.habit_id === h.id);
        const val = log ? parseFloat(log.raw_value) || 0 : 0;
        
        numericTrends[h.id].data.push({
          date: dateStr,
          Value: val
        });
      });
    });
    
    setFinancialData(Object.values(numericTrends));

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

  }, [journals, filter, habits, habitsLoading]);

  return {
    loading,
    filter,
    setFilter,
    analyticsData,
    financialData,
    completionData,
    heatmapData
  };
}
