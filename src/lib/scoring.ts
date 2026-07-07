// src/lib/scoring.ts

import { ScoringConfig, Habit } from '@/types';

export function computeHabitScore(rawValue: string, config: ScoringConfig): number {
  const cleanVal = (rawValue || '').trim();
  const val = parseFloat(cleanVal);
  
  switch (config.type) {
    case 'boolean':
      const isYes = cleanVal === '1' || cleanVal === 'true' || cleanVal.toLowerCase() === 'yes';
      return isYes ? (config.yes_points ?? 1) : 0;

    case 'threshold':
      if (isNaN(val)) return 0;
      for (const rule of config.rules) {
        const minOk = rule.min === null || val >= rule.min;
        const maxOk = rule.max === null || val <= rule.max;
        if (minOk && maxOk) {
          return rule.points;
        }
      }
      return 0;

    case 'divide_by':
      if (isNaN(val)) return 0;
      return val / (config.divisor || 1);

    case 'multiply_by':
      if (isNaN(val)) return 0;
      return val * (config.multiplier || 1);

    case 'add_subtract':
      if (isNaN(val)) return 0;
      return (val / (config.per_unit || 1)) * (config.multiplier || 1);

    case 'fixed':
      if (isNaN(val)) return 0;
      return val !== 0 ? config.fixed_points : 0;

    default:
      return 0;
  }
}

export function getHabitMaxScore(config: ScoringConfig, weeklyTarget: number | null): number {
  const target = weeklyTarget || 0;
  switch (config.type) {
    case 'boolean':
      return config.yes_points ?? 1;

    case 'threshold':
      let maxPoints = 0;
      for (const rule of config.rules) {
        if (rule.points > maxPoints) {
          maxPoints = rule.points;
        }
      }
      return maxPoints;

    case 'divide_by':
      if (target <= 0) return 1.0; // fallback if no target
      return (target / 7) / (config.divisor || 1);

    case 'multiply_by':
      if (target <= 0) return 1.0; // fallback
      return (target / 7) * (config.multiplier || 1);

    case 'add_subtract':
      if (config.multiplier < 0) {
        // For negative scoring habits (e.g. Money Spent), maximum score is 0 (the ideal case of spending 0 rupees)
        return 0;
      }
      if (target <= 0) return 20.0; // fallback (e.g. ₹2000 daily target -> 20 pts)
      return (target / 7) / (config.per_unit || 1) * (config.multiplier || 1);

    case 'fixed':
      return config.fixed_points;

    default:
      return 1;
  }
}

export function calculateDailyJournalScore(
  habits: Habit[],
  values: { [habitId: string]: string }
): {
  rawScore: number;
  maxScore: number;
  pctScore: number;
  computedScores: { [habitId: string]: number };
} {
  let rawScore = 0;
  let maxScore = 0;
  const computedScores: { [habitId: string]: number } = {};

  habits.forEach((habit) => {
    if (!habit.is_active) return;
    
    const value = values[habit.id] ?? '';
    const score = computeHabitScore(value, habit.scoring_config);
    const maxHabitScore = getHabitMaxScore(habit.scoring_config, habit.weekly_target);
    
    computedScores[habit.id] = score;
    
    // Check if the habit is a financial transaction log ("Money Earned" or "Money Spent")
    const isFinancial = habit.name.toLowerCase().includes('money earned') || 
                        habit.name.toLowerCase().includes('money spent');
    
    if (!isFinancial) {
      rawScore += score;
      maxScore += maxHabitScore;
    }
  });

  // Clamp rawScore/maxScore to avoid division by zero or negative percentages
  const pctScore = maxScore > 0 ? Math.round((rawScore / maxScore) * 100) : 0;

  return {
    rawScore,
    maxScore,
    pctScore,
    computedScores,
  };
}
