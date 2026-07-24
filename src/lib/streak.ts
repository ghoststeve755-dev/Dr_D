// src/lib/streak.ts

export function calculateStreak(dates: string[]): { current: number; longest: number } {
  if (dates.length === 0) return { current: 0, longest: 0 };

  // Get unique date strings and sort descending (newest first)
  const sortedDates = Array.from(new Set(dates)).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime();
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const todayVal = new Date(todayStr);
  const yesterdayVal = new Date(todayVal);
  yesterdayVal.setDate(todayVal.getDate() - 1);
  const yesterdayStr = yesterdayVal.toISOString().split('T')[0];

  // A streak is active if the most recent entry is today or yesterday
  const mostRecentEntry = sortedDates[0];
  const isStreakActive = mostRecentEntry === todayStr || mostRecentEntry === yesterdayStr;

  let current = 0;
  if (isStreakActive) {
    const expected = new Date(mostRecentEntry);
    for (let i = 0; i < sortedDates.length; i++) {
      const currentEntry = new Date(sortedDates[i]);
      // Calculate day difference
      const diffDays = Math.round((expected.getTime() - currentEntry.getTime()) / (1000 * 3600 * 24));
      
      if (diffDays === 0) {
        current++;
        // Set expected to previous day
        expected.setDate(expected.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Calculate longest streak in history
  let longest = 0;
  let tempStreak = 0;
  let expected: Date | null = null;

  for (let i = 0; i < sortedDates.length; i++) {
    const currentEntry = new Date(sortedDates[i]);
    
    if (expected === null) {
      tempStreak = 1;
      expected = new Date(currentEntry);
      expected.setDate(expected.getDate() - 1);
    } else {
      const diffDays = Math.round((expected.getTime() - currentEntry.getTime()) / (1000 * 3600 * 24));
      
      if (diffDays === 0) {
        tempStreak++;
        expected.setDate(expected.getDate() - 1);
      } else {
        if (tempStreak > longest) {
          longest = tempStreak;
        }
        tempStreak = 1;
        expected = new Date(currentEntry);
        expected.setDate(expected.getDate() - 1);
      }
    }
  }

  if (tempStreak > longest) {
    longest = tempStreak;
  }

  return { current, longest };
}
