import * as React from 'react'
import { cx } from '@/lib/utils/cx'

export interface FormFieldProps {
  label?: string
  required?: boolean
  error?: string
  helperText?: string
  children: React.ReactNode
  className?: string
  htmlFor?: string
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ label, required, error, helperText, children, className, htmlFor }, ref) => {
    return (
      <div ref={ref} className={cx('w-full', className)}>
        {label && (
          <label 
            htmlFor={htmlFor}
            className={cx(
              'block text-sm font-medium text-gray-900 mb-2',
              // Mobile-first: larger text for better readability
              'md:text-base'
            )}
          >
            {label}
            {required && (
              <span className="text-red-600 ml-1" aria-label="Campo requerido">
                *
              </span>
            )}
          </label>
        )}
        
        <div className="relative">
          {children}
        </div>
        
        {(error || helperText) && (
          <div className="mt-2">
            {error ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : helperText ? (
              <p className="text-sm text-gray-500">
                {helperText}
              </p>
            ) : null}
          </div>
        )}
      </div>
    )
  }
)

FormField.displayName = 'FormField'

export { FormField }