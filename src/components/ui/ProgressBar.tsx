interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' };

export function ProgressBar({
  value,
  max,
  label,
  showPercentage = true,
  size = 'md',
  color = 'bg-blue-600 dark:bg-blue-500',
}: ProgressBarProps) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  return (
    <div className="flex flex-col gap-1">
      {(label || showPercentage) && (
        <div className="flex justify-between text-sm">
          {label && (
            <span className="text-gray-600 dark:text-gray-400">{label}</span>
          )}
          {showPercentage && (
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div
        className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${heights[size]}`}
      >
        <div
          className={`${color} ${heights[size]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
