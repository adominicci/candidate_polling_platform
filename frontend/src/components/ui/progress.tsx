import * as React from 'react'
import { cx } from '@/lib/utils/cx'

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  className?: string
  label?: string
  showPercentage?: boolean
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, label, showPercentage = true, ...props }, ref) => {
    const percentage = Math.min(Math.max(0, value), max)
    const displayPercentage = Math.round((percentage / max) * 100)

    return (
      <div 
        ref={ref} 
        className={cx('w-full', className)} 
        {...props}
      >
        {(label || showPercentage) && (
          <div className="flex justify-between items-center mb-2">
            {label && (
              <span className="text-sm font-medium text-gray-700">
                {label}
              </span>
            )}
            {showPercentage && (
              <span className="text-sm text-gray-500">
                {displayPercentage}%
              </span>
            )}
          </div>
        )}
        
        <div 
          className="h-3 bg-gray-200 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={label}
        >
          <div
            className={cx(
              "h-full bg-primary-600 transition-all duration-300 ease-in-out rounded-full",
              displayPercentage === 100 && "bg-success-600"
            )}
            style={{ width: `${displayPercentage}%` }}
          />
        </div>
      </div>
    )
  }
)

Progress.displayName = 'Progress'

export { Progress }