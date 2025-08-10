'use client'

import * as React from 'react'
import { RadioGroup as HeadlessRadioGroup } from '@headlessui/react'
import { cx } from '@/lib/utils/cx'

export interface RadioOption {
  value: string
  label: string
  disabled?: boolean
}

export interface RadioGroupProps {
  value?: string
  onChange: (value: string) => void
  options: RadioOption[]
  name?: string
  error?: boolean
  helperText?: string
  className?: string
  disabled?: boolean
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ value, onChange, options, name, error, helperText, className, disabled }, ref) => {
    return (
      <div ref={ref} className={cx('w-full', className)}>
        <HeadlessRadioGroup 
          value={value} 
          onChange={onChange} 
          name={name}
          disabled={disabled}
          className="space-y-3"
        >
          {options.map((option) => (
            <HeadlessRadioGroup.Option 
              key={option.value} 
              value={option.value}
              disabled={option.disabled || disabled}
              className={({ active, checked }) =>
                cx(
                  'relative flex cursor-pointer rounded-lg px-4 py-3 shadow-sm focus:outline-none border',
                  active && 'ring-2 ring-primary-500 ring-offset-2',
                  checked 
                    ? 'border-primary-600 bg-primary-50 text-primary-900' 
                    : 'border-gray-300 bg-white',
                  (option.disabled || disabled) && 'opacity-50 cursor-not-allowed',
                  error && !checked && 'border-red-300',
                  'md:px-5 md:py-4' // Larger on desktop
                )
              }
            >
              {({ checked }) => (
                <>
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center">
                      <div className="text-sm">
                        <HeadlessRadioGroup.Label
                          as="p"
                          className={cx(
                            'font-medium',
                            checked ? 'text-primary-900' : 'text-gray-900'
                          )}
                        >
                          {option.label}
                        </HeadlessRadioGroup.Label>
                      </div>
                    </div>
                    {checked && (
                      <div className="shrink-0 text-primary-600">
                        <CheckIcon className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                </>
              )}
            </HeadlessRadioGroup.Option>
          ))}
        </HeadlessRadioGroup>
        {helperText && (
          <p className={cx(
            'mt-2 text-sm',
            error ? 'text-red-600' : 'text-muted-foreground'
          )}>
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

RadioGroup.displayName = 'RadioGroup'

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx={12} cy={12} r={12} fill="#fff" opacity="0.2" />
      <path
        d="M7 13l3 3 7-7"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export { RadioGroup }