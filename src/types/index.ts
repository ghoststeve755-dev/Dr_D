// src/types/index.ts

export interface User {
  id: string;
  username: string;
  name: string;
  timezone: string;
  created_at: string;
}

export type HabitCategory = 'health' | 'learning' | 'productivity' | 'finance';
export type HabitInputType = 'boolean' | 'number';

export type ScoringConfig =
  | { type: 'boolean'; yes_points: number }
  | { type: 'threshold'; rules: { min: number; max: number | null; points: number }[] }
  | { type: 'divide_by'; divisor: number }
  | { type: 'multiply_by'; multiplier: number }
  | { type: 'add_subtract'; per_unit: number; multiplier: number; direction: 'positive' | 'negative' }
  | { type: 'fixed'; fixed_points: number };

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  category: HabitCategory;
  input_type: HabitInputType;
  unit: string | null;
  weekly_target: number | null;
  display_order: number;
  is_active: boolean;
  is_system: boolean;
  scoring_config: ScoringConfig;
  created_at: string;
  updated_at: string;
}

export interface DailyJournal {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  week_number: number;
  month: number;
  year: number;
  day_of_week: string;
  is_late_entry: boolean;
  notes: string | null;
  daily_raw_score: number;
  daily_max_score: number;
  daily_pct_score: number;
  submitted_at: string;
  created_at: string;
}

export interface HabitLog {
  id: string;
  user_id: string;
  journal_id: string;
  habit_id: string;
  date: string;
  raw_value: string;
  computed_score: number;
  created_at: string;
}

export interface WeeklyReview {
  id: string;
  user_id: string;
  year: number;
  week_number: number;
  achievement: string | null;
  challenge: string | null;
  learning: string | null;
  next_focus: string | null;
  notes: string | null;
  weekly_raw_score: number;
  weekly_max_score: number;
  weekly_pct_score: number;
  habit_summary: Record<string, any> | null;
  submitted_at: string;
}

export interface MonthlyReport {
  id: string;
  user_id: string;
  year: number;
  month: number;
  monthly_pct_score: number;
  habit_summary: Record<string, any> | null;
  is_auto_generated: boolean;
  created_at: string;
}

export interface NotificationSettings {
  id: string;
  user_id: string;
  daily_reminder: boolean;
  daily_time: string;
  weekly_reminder: boolean;
  monthly_reminder: boolean;
  push_endpoint: string | null;
  push_p256dh: string | null;
  push_auth: string | null;
  created_at: string;
}
