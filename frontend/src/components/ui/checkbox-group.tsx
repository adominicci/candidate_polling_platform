'use client'

import * as React from 'react'
import { cx } from '@/lib/utils/cx'

export interface CheckboxOption {
  value: string
  label: string
  disabled?: boolean
}

export interface CheckboxGroupProps {
  value?: string[]
  onChange: (values: string[]) => void
  options: CheckboxOption[]
  name?: string
  error?: boolean
  helperText?: string
  className?: string
  disabled?: boolean
  maxSelections?: number
  minSelections?: number
}

const CheckboxGroup = React.forwardRef<HTMLDivElement, CheckboxGroupProps>(
  ({ 
    value = [], 
    onChange, 
    options, 
    name, 
    error, 
    helperText, 
    className, 
    disabled,
    maxSelections,
    minSelections 
  }, ref) => {
    
    const handleCheckboxChange = (optionValue: string, checked: boolean) => {
      if (disabled) return
      
      let newValues: string[]
      
      if (checked) {
        // Check if we can add more selections
        if (maxSelections && value.length >= maxSelections) {
          return // Don't add if max reached
        }
        newValues = [...value, optionValue]
      } else {
        // Check if we can remove selections
        if (minSelections && value.length <= minSelections) {
          return // Don't remove if min would be violated
        }
        newValues = value.filter(v => v !== optionValue)
      }
      
      onChange(newValues)
    }

    return (
      <div ref={ref} className={cx('w-full', className)}>
        <fieldset className="space-y-3" disabled={disabled}>
          {options.map((option) => {
            const isChecked = value.includes(option.value)
            const isDisabled = option.disabled || disabled || 
              (!isChecked && maxSelections !== undefined && value.length >= maxSelections) ||
              (isChecked && minSelections !== undefined && value.length <= minSelections)
            
            return (
              <div
                key={option.value}
                className={cx(
                  'relative flex cursor-pointer rounded-lg px-4 py-3 shadow-sm border',
                  isChecked 
                    ? 'border-primary-600 bg-primary-50' 
                    : 'border-gray-300 bg-white hover:border-gray-400',
                  isDisabled && 'opacity-50 cursor-not-allowed',
                  error && !isChecked && 'border-red-300',
                  'md:px-5 md:py-4' // Larger on desktop
                )}
              >
                <div className="flex w-full items-center">
                  <div className="flex items-center h-5">
                    <input
                      id={`${name}-${option.value}`}
                      name={name}
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => handleCheckboxChange(option.value, e.target.checked)}
                      disabled={isDisabled}
                      className={cx(
                        'h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500',
                        'md:h-5 md:w-5' // Larger on desktop
                      )}
                    />
                  </div>
                  <div className="ml-3">
                    <label
                      htmlFor={`${name}-${option.value}`}
                      className={cx(
                        'text-sm font-medium cursor-pointer',
                        isChecked ? 'text-primary-900' : 'text-gray-900',
                        isDisabled && 'cursor-not-allowed'
                      )}
                    >
                      {option.label}
                    </label>
                  </div>
                </div>
              </div>
            )
          })}
        </fieldset>
        
        {(maxSelections || minSelections || helperText) && (
          <div className="mt-2 text-sm">
            {maxSelections && (
              <p className="text-muted-foreground">
                Máximo {maxSelections} selecciones ({value.length}/{maxSelections} seleccionadas)
              </p>
            )}
            {helperText && (
              <p className={cx(
                error ? 'text-red-600' : 'text-muted-foreground'
              )}>
                {helperText}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }
)

CheckboxGroup.displayName = 'CheckboxGroup'

export { CheckboxGroup }