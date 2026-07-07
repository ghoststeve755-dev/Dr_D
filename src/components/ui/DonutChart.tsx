// src/components/ui/DonutChart.tsx

'use client';

interface DonutChartProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  subLabel?: string;
}

export default function DonutChart({
  percentage = 0,
  size = 180,
  strokeWidth = 14,
  label,
  subLabel
}: DonutChartProps) {
  // Clamp percentage between 0 and 100
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (clampedPercentage / 100) * circumference;

  return (
    <div className="donut-chart-wrapper">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut-svg">
        <defs>
          <linearGradient id="donutGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--success)" />
          </linearGradient>
        </defs>
        {/* Background Circle */}
        <circle
          className="donut-bg"
          stroke="var(--bg-inset)"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Active Ring */}
        <circle
          className="donut-fill"
          stroke="url(#donutGradient)"
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="donut-labels">
        <span className="donut-main-label">{label || `${clampedPercentage}%`}</span>
        {subLabel && <span className="donut-sub-label">{subLabel}</span>}
      </div>

      <style jsx>{`
        .donut-chart-wrapper {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .donut-svg {
          transform: rotate(0deg);
        }

        .donut-fill {
          transition: stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .donut-labels {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .donut-main-label {
          font-family: 'Outfit', sans-serif;
          font-size: 32px;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1;
        }

        .donut-sub-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-secondary);
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}
