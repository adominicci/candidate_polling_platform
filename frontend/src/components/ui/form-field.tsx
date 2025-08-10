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
          <div className="mt-3">
            {error ? (
              <div className="flex items-start space-x-2 text-sm text-red-600" role="alert" aria-live="polite">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            ) : helperText ? (
              <div className="flex items-start space-x-2 text-sm text-gray-500">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>{helperText}</span>
              </div>
            ) : null}
          </div>
        )}
      </div>
    )
  }
)

FormField.displayName = 'FormField'

export { FormField }