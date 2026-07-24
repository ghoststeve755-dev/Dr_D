import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { calculateStreak } from '@/lib/streak';
import { getISOWeekAndYear, formatDateString, getDatesInISOWeek } from '@/lib/dates';
import { generateDetailedComparison, generateReadableSummaryText } from '@/lib/summaryGenerator';
import { useRouter } from 'next/navigation';

export function useDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('Doctor D');
  
  // Scoring & logs
  const [todayJournal, setTodayJournal] = useState<any>(null);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [habits, setHabits] = useState<any[]>([]);
  const [weeklyStats, setWeeklyStats] = useState({ raw: 0, max: 0, pct: 0 });
  const [monthlyStats, setMonthlyStats] = useState({ pct: 0 });
  const [datesOfCurrentWeek, setDatesOfCurrentWeek] = useState<string[]>([]);
  const [habitGridData, setHabitGridData] = useState<{ [date: string]: { [habitId: string]: any } }>({});
  const [weeklyComparison, setWeeklyComparison] = useState<any>(null);
  const [monthlyComparison, setMonthlyComparison] = useState<any>(null);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const todayDate = new Date();
        const todayStr = formatDateString(todayDate);
        const { week, year } = getISOWeekAndYear(todayDate);
        const weekDates = getDatesInISOWeek(week, year);
        setDatesOfCurrentWeek(weekDates);
        const monthNum = todayDate.getMonth() + 1;
        const yearNum = todayDate.getFullYear();

        // Fetch all required data in parallel
        const [
          profileResult,
          habitsResult,
          todayJournalResult,
          journalDatesResult,
          currentWeekJournalsResult,
          currentMonthJournalsResult,
          recentWeeklyReviewsResult,
          recentMonthlyReportsResult,
        ] = await Promise.all([
          supabase.from('users').select('*').eq('id', user.id).single(),
          supabase.from('habits').select('*').eq('user_id', user.id).eq('is_active', true).order('display_order', { ascending: true }),
          supabase.from('daily_journals').select('*, habit_logs(*)').eq('user_id', user.id).eq('date', todayStr).maybeSingle(),
          supabase.from('daily_journals').select('date').eq('user_id', user.id),
          supabase.from('daily_journals').select('*, habit_logs(*)').eq('user_id', user.id).eq('year', year).eq('week_number', week),
          supabase.from('daily_journals').select('daily_pct_score').eq('user_id', user.id).eq('year', yearNum).eq('month', monthNum),
          supabase.from('weekly_reviews').select('*').eq('user_id', user.id).order('year', { ascending: false }).order('week_number', { ascending: false }).limit(2),
          supabase.from('monthly_reports').select('*').eq('user_id', user.id).order('year', { ascending: false }).order('month', { ascending: false }).limit(2),
        ]);

        // Process profile
        const profile = profileResult.data;
        if (profile) setUsername(profile.name || 'Doctor D');

        // Process active habits
        const habitsList = habitsResult.data || [];
        setHabits(habitsList);

        // Process today's entry
        const todayEntry = todayJournalResult.data;
        setTodayJournal(todayEntry);

        // Process streak
        const journalDates = journalDatesResult.data;
        if (journalDates) {
          const dates = journalDates.map((d: any) => d.date);
          setStreak(calculateStreak(dates));
        }

        // Process weekly progress
        const currentWeekJournals = currentWeekJournalsResult.data;
        let weekRaw = 0;
        let weekMax = 0;
        currentWeekJournals?.forEach((journal: any) => {
          weekRaw += parseFloat(journal.daily_raw_score?.toString() || '0');
          weekMax += parseFloat(journal.daily_max_score?.toString() || '0');
        });
        
        setWeeklyStats({
          raw: weekRaw,
          max: weekMax,
          pct: weekMax > 0 ? Math.round((weekRaw / weekMax) * 100) : 0
        });

        // Map weekly logs for grid view
        const grid: typeof habitGridData = {};
        weekDates.forEach((d) => { grid[d] = {}; });
        currentWeekJournals?.forEach((journal: any) => {
          journal.habit_logs?.forEach((log: any) => {
            grid[journal.date][log.habit_id] = log;
          });
        });
        setHabitGridData(grid);

        // Process monthly progress
        const currentMonthJournals = currentMonthJournalsResult.data;
        if (currentMonthJournals && currentMonthJournals.length > 0) {
          const sum = currentMonthJournals.reduce((acc: number, curr: any) => acc + parseFloat(curr.daily_pct_score?.toString() || '0'), 0);
          setMonthlyStats({ pct: Math.round(sum / currentMonthJournals.length) });
        }

        // Compute weekly comparison
        const recentWeekly = recentWeeklyReviewsResult.data || [];
        if (recentWeekly.length >= 1) {
          const currentReview = recentWeekly[0];
          const prevReview = recentWeekly.length > 1 ? recentWeekly[1] : null;
          
          if (prevReview) {
            const comps = generateDetailedComparison(currentReview.habit_summary || {}, prevReview.habit_summary || {});
            const summaryText = generateReadableSummaryText('week', currentReview.weekly_pct_score, prevReview.weekly_pct_score, comps);
            setWeeklyComparison({
              currentPct: currentReview.weekly_pct_score,
              prevPct: prevReview.weekly_pct_score,
              scoreDiff: parseFloat(currentReview.weekly_pct_score?.toString() || '0') - parseFloat(prevReview.weekly_pct_score?.toString() || '0'),
              summaryText,
              detailedComparisons: comps
            });
          }
        }

        // Compute monthly comparison
        const recentMonthly = recentMonthlyReportsResult.data || [];
        if (recentMonthly.length >= 1) {
          const currentReport = recentMonthly[0];
          const prevReport = recentMonthly.length > 1 ? recentMonthly[1] : null;

          if (prevReport) {
            const comps = generateDetailedComparison(currentReport.habit_summary || {}, prevReport.habit_summary || {});
            const summaryText = generateReadableSummaryText('month', currentReport.monthly_pct_score, prevReport.monthly_pct_score, comps);
            setMonthlyComparison({
              currentPct: currentReport.monthly_pct_score,
              prevPct: prevReport.monthly_pct_score,
              scoreDiff: parseFloat(currentReport.monthly_pct_score?.toString() || '0') - parseFloat(prevReport.monthly_pct_score?.toString() || '0'),
              summaryText,
              detailedComparisons: comps
            });
          }
        }
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [router]);

  return {
    loading,
    username,
    todayJournal,
    streak,
    habits,
    weeklyStats,
    monthlyStats,
    datesOfCurrentWeek,
    habitGridData,
    weeklyComparison,
    monthlyComparison
  };
}
