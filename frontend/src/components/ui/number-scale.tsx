'use client'

import * as React from 'react'
import { cx } from '@/lib/utils/cx'

export interface NumberScaleProps {
  value?: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  label?: string
  required?: boolean
  error?: boolean
  helperText?: string
  className?: string
  disabled?: boolean
}

const NumberScale = React.forwardRef<HTMLDivElement, NumberScaleProps>(
  ({ 
    value, 
    onChange, 
    min, 
    max, 
    step = 1, 
    label, 
    required, 
    error, 
    helperText, 
    className, 
    disabled 
  }, ref) => {
    
    const handleScaleClick = (scaleValue: number) => {
      if (disabled) return
      onChange(scaleValue)
    }

    const generateScaleValues = () => {
      const values = []
      for (let i = min; i <= max; i += step) {
        values.push(i)
      }
      return values
    }

    const scaleValues = generateScaleValues()

    return (
      <div ref={ref} className={cx('w-full', className)}>
        <fieldset disabled={disabled} className="space-y-4">
          {label && (
            <legend className={cx(
              'text-sm font-medium text-gray-900',
              'md:text-base'
            )}>
              {label}
              {required && (
                <span className="text-red-600 ml-1" aria-label="Campo requerido">
                  *
                </span>
              )}
            </legend>
          )}
          
          <div className="flex flex-wrap gap-2 justify-center md:justify-start">
            {scaleValues.map((scaleValue) => (
              <button
                key={scaleValue}
                type="button"
                onClick={() => handleScaleClick(scaleValue)}
                disabled={disabled}
                className={cx(
                  // Base styles with mobile-first approach
                  'flex items-center justify-center',
                  'w-12 h-12 md:w-14 md:h-14', // Larger touch targets
                  'rounded-full border-2 font-semibold',
                  'text-sm md:text-base',
                  'transition-all duration-200 ease-in-out',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                  
                  // Selected state
                  value === scaleValue
                    ? 'border-primary-600 bg-primary-600 text-white shadow-md'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50',
                  
                  // Error state
                  error && value !== scaleValue && 'border-red-300',
                  
                  // Disabled state
                  disabled && 'opacity-50 cursor-not-allowed',
                  
                  // Active state for touch feedback
                  !disabled && 'active:scale-95'
                )}
                aria-pressed={value === scaleValue}
                aria-label={`Seleccionar valor ${scaleValue}`}
              >
                {scaleValue}
              </button>
            ))}
          </div>
          
          {/* Value labels for context */}
          {scaleValues.length <= 10 && (
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>{min}</span>
              <span>{max}</span>
            </div>
          )}
          
          {helperText && (
            <p className={cx(
              'text-sm mt-2',
              error ? 'text-red-600' : 'text-gray-500'
            )}>
              {helperText}
            </p>
          )}
        </fieldset>
      </div>
    )
  }
)

NumberScale.displayName = 'NumberScale'

export { NumberScale }