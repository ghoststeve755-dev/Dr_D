// src/lib/summaryGenerator.ts

export interface DetailedComparison {
  habitId: string;
  name: string;
  currentValue: number;
  prevValue: number;
  difference: number;
  pctChange: number;
  status: 'Improved' | 'Declined' | 'No Change';
  unit: string | null;
  inputType: string;
}

export function generateDetailedComparison(
  currentSummary: Record<string, any>,
  prevSummary: Record<string, any> | null
): DetailedComparison[] {
  const comparisons: DetailedComparison[] = [];

  Object.keys(currentSummary).forEach(habitId => {
    const current = currentSummary[habitId];
    const prev = prevSummary ? prevSummary[habitId] : null;

    const currentValue = current.totalValue || 0;
    const prevValue = prev ? (prev.totalValue || 0) : 0;
    
    const difference = currentValue - prevValue;
    
    let pctChange = 0;
    if (prevValue !== 0) {
      pctChange = (difference / Math.abs(prevValue)) * 100;
    } else if (currentValue !== 0) {
      pctChange = 100;
    }

    let status: 'Improved' | 'Declined' | 'No Change' = 'No Change';
    
    // For most habits, higher is better.
    // Exceptions like "Money Spent" or habits we might want to minimize.
    // We will infer based on the name for now, but usually "Money Spent" should be lower to improve.
    const lowerIsBetter = current.name.toLowerCase().includes('spent') || current.name.toLowerCase().includes('expense');

    if (difference > 0) {
      status = lowerIsBetter ? 'Declined' : 'Improved';
    } else if (difference < 0) {
      status = lowerIsBetter ? 'Improved' : 'Declined';
    }

    comparisons.push({
      habitId,
      name: current.name,
      currentValue,
      prevValue,
      difference,
      pctChange,
      status,
      unit: current.unit || null,
      inputType: current.inputType
    });
  });

  return comparisons;
}

export function generateReadableSummaryText(
  periodName: 'week' | 'month',
  currentPct: number,
  prevPct: number | null,
  comparisons: DetailedComparison[]
): string {
  if (!prevPct || comparisons.length === 0) {
    return `This ${periodName}, you achieved an overall discipline score of ${currentPct}%. Keep up the good work and maintain consistency!`;
  }

  const scoreDiff = currentPct - prevPct;
  let summary = `This ${periodName} your overall discipline score ${scoreDiff >= 0 ? 'improved by' : 'declined by'} ${Math.abs(scoreDiff)}%. `;

  const significantChanges: string[] = [];
  
  // Find study hours, earnings, expenses, etc.
  comparisons.forEach(comp => {
    if (comp.status === 'No Change') return;

    const absDiff = Math.abs(comp.difference);
    const unitStr = comp.unit ? ` ${comp.unit}` : (comp.inputType === 'boolean' ? ' days' : '');
    
    // Custom readable phrases based on habit name
    const lowerName = comp.name.toLowerCase();
    
    if (lowerName.includes('study')) {
      significantChanges.push(`You studied ${absDiff}${unitStr} ${comp.status === 'Improved' ? 'more' : 'less'} than last ${periodName}`);
    } else if (lowerName.includes('earn') || lowerName.includes('income')) {
      significantChanges.push(`You earned ${absDiff}${unitStr} ${comp.status === 'Improved' ? 'more' : 'less'} than last ${periodName}`);
    } else if (lowerName.includes('spent') || lowerName.includes('expense')) {
      significantChanges.push(`spending ${absDiff}${unitStr} ${comp.status === 'Improved' ? 'less' : 'more'}`); // Note: Improved means spent less
    } else if (lowerName.includes('read')) {
      significantChanges.push(`Your reading ${comp.status === 'Improved' ? 'increased' : 'decreased'} by ${absDiff}${unitStr}`);
    } else if (lowerName.includes('exercise') || lowerName.includes('workout')) {
      significantChanges.push(`You exercised ${absDiff} ${comp.status === 'Improved' ? 'extra' : 'fewer'} days`);
    } else if (comp.inputType === 'boolean') {
      // generic boolean
      significantChanges.push(`You completed '${comp.name}' ${absDiff} ${comp.status === 'Improved' ? 'more' : 'fewer'} times`);
    }
  });

  if (significantChanges.length > 0) {
    // Combine changes into sentences
    // Group earnings and expenses if both exist
    const earnStr = significantChanges.find(s => s.includes('earned'));
    const spendStr = significantChanges.find(s => s.includes('spending'));
    
    const otherChanges = significantChanges.filter(s => !s.includes('earned') && !s.includes('spending'));
    
    otherChanges.forEach(change => {
      summary += change + '. ';
    });

    if (earnStr && spendStr) {
      summary += `${earnStr} while ${spendStr}. `;
    } else if (earnStr) {
      summary += `${earnStr}. `;
    } else if (spendStr) {
      summary += `You ended up ${spendStr}. `;
    }
  }

  // Conclusion sentence
  if (scoreDiff >= 0) {
    summary += `Overall, this was a stronger ${periodName} than the previous one.`;
  } else {
    summary += `Focus on regaining your consistency next ${periodName}.`;
  }

  return summary.trim();
}
