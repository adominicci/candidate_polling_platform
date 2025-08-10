# Untitled UI Component Specifications
## Survey Form Integration & Customization Guide

### Overview
This document provides detailed specifications for integrating and customizing Untitled UI components for the PPD survey form. It includes component APIs, styling guidelines, and accessibility requirements specific to mobile-first, Spanish-language political data collection.

---

### Component Architecture

#### Base Component Structure
```
Survey Form Components
├── Layout Components
│   ├── SurveyContainer
│   ├── SectionHeader
│   └── ProgressIndicator
├── Form Components  
│   ├── FormField (wrapper)
│   ├── Input (text, email, tel, date)
│   ├── Textarea
│   ├── RadioGroup
│   ├── CheckboxGroup
│   └── NumberScale
├── Navigation Components
│   ├── NavigationControls
│   ├── Button (primary, secondary, outline)
│   └── IconButton
└── Feedback Components
    ├── ErrorMessage
    ├── SuccessMessage
    └── LoadingSpinner
```

#### Design Token Integration
```css
/* PPD Brand Colors integrated with Untitled UI */
:root {
  /* Primary brand colors */
  --primary-50: #ecf5ff;
  --primary-100: #d4e8ff;
  --primary-600: #0d5bdd; /* PPD Blue */
  --primary-700: #0c4fb3;
  
  /* Semantic colors for forms */
  --success-50: #f0fdf4;
  --success-600: #16a34a;
  --error-50: #fef2f2;
  --error-600: #dc2626;
  --warning-50: #fffbeb;
  --warning-600: #d97706;
  
  /* Typography scale */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px - iOS zoom prevention */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  
  /* Spacing scale */
  --space-1: 0.25rem;    /* 4px */
  --space-2: 0.5rem;     /* 8px */
  --space-3: 0.75rem;    /* 12px */
  --space-4: 1rem;       /* 16px */
  --space-6: 1.5rem;     /* 24px */
  --space-11: 2.75rem;   /* 44px - minimum touch target */
  
  /* Border radius */
  --radius-sm: 0.25rem;  /* 4px */
  --radius-md: 0.5rem;   /* 8px */
  --radius-lg: 0.75rem;  /* 12px */
}
```

---

### Layout Components

#### SurveyContainer Component
```tsx
interface SurveyContainerProps {
  children: React.ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
}

const SurveyContainer: React.FC<SurveyContainerProps> = ({ 
  children, 
  className = '',
  maxWidth = 'md' 
}) => {
  const maxWidthClasses = {
    sm: 'max-w-sm',   // 384px - very narrow
    md: 'max-w-2xl',  // 672px - optimal for survey forms  
    lg: 'max-w-4xl',  // 896px - wider for desktop
    xl: 'max-w-6xl'   // 1152px - full dashboard
  };

  return (
    <div className={cx(
      'survey-container',
      'w-full mx-auto px-4 py-6',
      'min-h-screen bg-background',
      maxWidthClasses[maxWidth],
      className
    )}>
      {children}
    </div>
  );
};
```

#### SectionHeader Component
```tsx
interface SectionHeaderProps {
  title: string
  sectionNumber: number
  totalSections: number
  completionPercentage: number
  onBack?: () => void
  className?: string
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  sectionNumber, 
  totalSections,
  completionPercentage,
  onBack,
  className = ''
}) => {
  return (
    <header className={cx('section-header', 'mb-6', className)}>
      {/* Navigation bar */}
      <div className="flex items-center justify-between mb-4">
        {onBack ? (
          <IconButton
            variant="ghost"
            size="sm"
            onClick={onBack}
            aria-label="Volver a sección anterior"
            className="p-2"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </IconButton>
        ) : (
          <div /> // Spacer
        )}
        
        <div className="text-sm font-medium text-muted-foreground">
          Sección {sectionNumber} de {totalSections}
        </div>
      </div>
      
      {/* Progress bar */}
      <ProgressIndicator 
        value={completionPercentage}
        label={`${completionPercentage}% completo`}
        className="mb-4"
      />
      
      {/* Section title */}
      <h1 className="text-xl md:text-2xl font-semibold text-foreground">
        {title}
      </h1>
    </header>
  );
};
```

#### ProgressIndicator Component  
```tsx
interface ProgressIndicatorProps {
  value: number // 0-100
  label?: string
  variant?: 'default' | 'success' | 'warning'
  size?: 'sm' | 'md' | 'lg'
  showPercentage?: boolean
  className?: string
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  value,
  label,
  variant = 'default',
  size = 'md',
  showPercentage = true,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3', 
    lg: 'h-4'
  };
  
  const colorClasses = {
    default: 'bg-primary-600',
    success: 'bg-success-600',
    warning: 'bg-warning-600'
  };

  return (
    <div className={cx('progress-indicator', className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className="text-sm font-medium text-foreground">
              {label}
            </span>
          )}
          {showPercentage && (
            <span className="text-sm text-muted-foreground">
              {value}%
            </span>
          )}
        </div>
      )}
      
      <div className={cx(
        'progress-track',
        'w-full bg-muted rounded-full overflow-hidden',
        sizeClasses[size]
      )}>
        <div
          className={cx(
            'progress-fill',
            'h-full transition-all duration-500 ease-out rounded-full',
            colorClasses[variant]
          )}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label || `${value} por ciento completo`}
        />
      </div>
    </div>
  );
};
```

---

### Form Components

#### FormField Wrapper Component
```tsx
interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  success?: boolean
  helpText?: string
  children: React.ReactNode
  htmlFor?: string
  className?: string
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  error,
  success = false,
  helpText,
  children,
  htmlFor,
  className = ''
}) => {
  const fieldId = htmlFor || `field-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${fieldId}-error` : undefined;
  const helpId = helpText ? `${fieldId}-help` : undefined;

  return (
    <div className={cx('form-field', 'space-y-2', className)}>
      {/* Label */}
      <label 
        htmlFor={fieldId}
        className="block text-sm font-medium text-foreground"
      >
        {label}
        {required && (
          <span 
            className="text-error-600 ml-1" 
            aria-label="requerido"
          >
            *
          </span>
        )}
      </label>
      
      {/* Input element with proper ARIA attributes */}
      <div className="relative">
        {React.cloneElement(children as React.ReactElement, {
          id: fieldId,
          'aria-describedby': [errorId, helpId].filter(Boolean).join(' ') || undefined,
          'aria-invalid': error ? 'true' : 'false',
          'aria-required': required ? 'true' : undefined
        })}
        
        {/* Success indicator */}
        {success && !error && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <CheckIcon className="w-5 h-5 text-success-600" />
          </div>
        )}
      </div>
      
      {/* Error message */}
      {error && (
        <div 
          id={errorId}
          role="alert"
          aria-live="polite"
          className="flex items-start space-x-2 text-sm text-error-600"
        >
          <ExclamationCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Help text */}
      {helpText && !error && (
        <div 
          id={helpId}
          className="text-sm text-muted-foreground"
        >
          {helpText}
        </div>
      )}
    </div>
  );
};
```

#### Enhanced Input Component
```tsx
interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: 'default' | 'filled' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  error?: boolean
  success?: boolean
  loading?: boolean
  prefix?: React.ReactNode
  suffix?: React.ReactNode
  className?: string
}

const Input: React.FC<InputProps> = ({
  variant = 'outline',
  size = 'md',
  error = false,
  success = false,
  loading = false,
  prefix,
  suffix,
  className = '',
  ...props
}) => {
  const sizeClasses = {
    sm: 'h-9 px-3 text-sm',     // 36px height
    md: 'h-11 px-4 text-base',  // 44px height - minimum touch target
    lg: 'h-12 px-4 text-lg'     // 48px height - generous touch target
  };
  
  const variantClasses = {
    default: 'border-input bg-background',
    filled: 'border-transparent bg-muted',
    outline: 'border-input bg-background'
  };
  
  const stateClasses = cx({
    'border-error-600 focus:border-error-600 focus:ring-error-600/20': error,
    'border-success-600 focus:border-success-600 focus:ring-success-600/20': success && !error,
    'border-input focus:border-primary-600 focus:ring-primary-600/20': !error && !success
  });

  return (
    <div className="relative">
      {prefix && (
        <div className="absolute left-3 inset-y-0 flex items-center pointer-events-none">
          {prefix}
        </div>
      )}
      
      <input
        className={cx(
          'flex w-full rounded-md border transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'placeholder:text-muted-foreground',
          sizeClasses[size],
          variantClasses[variant],
          stateClasses,
          prefix && 'pl-10',
          suffix && 'pr-10',
          className
        )}
        {...props}
      />
      
      {suffix && (
        <div className="absolute right-3 inset-y-0 flex items-center pointer-events-none">
          {suffix}
        </div>
      )}
      
      {loading && (
        <div className="absolute right-3 inset-y-0 flex items-center">
          <LoadingSpinner className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};
```

#### RadioGroup Component
```tsx
interface RadioOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

interface RadioGroupProps {
  name: string
  value: string
  onChange: (value: string) => void
  options: RadioOption[]
  layout?: 'vertical' | 'horizontal'
  size?: 'sm' | 'md' | 'lg'
  error?: boolean
  className?: string
}

const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  value,
  onChange,
  options,
  layout = 'vertical',
  size = 'md',
  error = false,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'min-h-[40px] p-3',  // Minimum viable touch target
    md: 'min-h-[44px] p-4',  // Standard touch target
    lg: 'min-h-[48px] p-4'   // Generous touch target
  };

  return (
    <div 
      role="radiogroup"
      className={cx(
        'radio-group',
        'space-y-2',
        layout === 'horizontal' && 'flex space-y-0 space-x-4',
        className
      )}
    >
      {options.map((option) => (
        <label
          key={option.value}
          className={cx(
            'radio-option',
            'flex items-start cursor-pointer',
            'rounded-lg border transition-all duration-200',
            sizeClasses[size],
            {
              'border-primary-600 bg-primary-50': value === option.value,
              'border-input hover:border-muted-foreground hover:bg-muted/50': value !== option.value,
              'border-error-600': error,
              'opacity-50 cursor-not-allowed': option.disabled
            }
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={(e) => onChange(e.target.value)}
            disabled={option.disabled}
            className="sr-only" // Hidden but accessible to screen readers
          />
          
          {/* Custom radio indicator */}
          <div className={cx(
            'radio-indicator',
            'flex-shrink-0 w-5 h-5 rounded-full border-2 mr-3 mt-0.5',
            'transition-all duration-200',
            {
              'border-primary-600 bg-primary-600': value === option.value,
              'border-muted-foreground': value !== option.value,
              'border-error-600': error
            }
          )}>
            {value === option.value && (
              <div className="w-2 h-2 bg-white rounded-full m-auto" />
            )}
          </div>
          
          {/* Label and description */}
          <div className="flex-1">
            <div className="font-medium text-foreground">
              {option.label}
            </div>
            {option.description && (
              <div className="text-sm text-muted-foreground mt-1">
                {option.description}
              </div>
            )}
          </div>
        </label>
      ))}
    </div>
  );
};
```

#### CheckboxGroup Component
```tsx
interface CheckboxOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

interface CheckboxGroupProps {
  value: string[]
  onChange: (value: string[]) => void
  options: CheckboxOption[]
  maxSelections?: number
  minSelections?: number
  layout?: 'vertical' | 'grid'
  error?: boolean
  className?: string
}

const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  value = [],
  onChange,
  options,
  maxSelections,
  minSelections,
  layout = 'vertical',
  error = false,
  className = ''
}) => {
  const handleToggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      // Remove item
      onChange(value.filter(item => item !== optionValue));
    } else if (!maxSelections || value.length < maxSelections) {
      // Add item if under limit
      onChange([...value, optionValue]);
    }
    // If at limit, do nothing (could show toast feedback)
  };

  const isAtMaximum = maxSelections && value.length >= maxSelections;

  return (
    <div className={cx('checkbox-group', className)}>
      {/* Selection counter */}
      {maxSelections && (
        <div className="flex justify-between items-center mb-3 p-3 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium">
            Seleccione hasta {maxSelections} opciones
          </span>
          <span className={cx(
            'text-sm font-medium',
            value.length >= maxSelections ? 'text-warning-600' : 'text-muted-foreground'
          )}>
            {value.length}/{maxSelections}
          </span>
        </div>
      )}
      
      <div className={cx(
        layout === 'grid' && 'grid grid-cols-2 gap-2',
        layout === 'vertical' && 'space-y-2'
      )}>
        {options.map((option) => {
          const isSelected = value.includes(option.value);
          const isDisabled = option.disabled || 
            (!isSelected && isAtMaximum);

          return (
            <label
              key={option.value}
              className={cx(
                'checkbox-option',
                'flex items-start cursor-pointer min-h-[44px] p-4',
                'rounded-lg border transition-all duration-200',
                {
                  'border-primary-600 bg-primary-50': isSelected,
                  'border-input hover:border-muted-foreground hover:bg-muted/50': !isSelected && !isDisabled,
                  'border-error-600': error,
                  'opacity-50 cursor-not-allowed': isDisabled
                }
              )}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => !isDisabled && handleToggle(option.value)}
                disabled={isDisabled}
                className="sr-only"
              />
              
              {/* Custom checkbox indicator */}
              <div className={cx(
                'checkbox-indicator',
                'flex-shrink-0 w-5 h-5 rounded border-2 mr-3 mt-0.5',
                'transition-all duration-200',
                {
                  'border-primary-600 bg-primary-600': isSelected,
                  'border-muted-foreground': !isSelected,
                  'border-error-600': error
                }
              )}>
                {isSelected && (
                  <CheckIcon className="w-3 h-3 text-white m-auto" />
                )}
              </div>
              
              {/* Label and description */}
              <div className="flex-1">
                <div className="font-medium text-foreground">
                  {option.label}
                </div>
                {option.description && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {option.description}
                  </div>
                )}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
};
```

#### NumberScale Component
```tsx
interface NumberScaleProps {
  value?: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  labels?: { [key: number]: string }
  error?: boolean
  className?: string
}

const NumberScale: React.FC<NumberScaleProps> = ({
  value,
  onChange,
  min = 0,
  max = 10,
  step = 1,
  labels = {},
  error = false,
  className = ''
}) => {
  const numbers = [];
  for (let i = min; i <= max; i += step) {
    numbers.push(i);
  }

  return (
    <div className={cx('number-scale', className)}>
      {/* Scale buttons */}
      <div className="grid grid-cols-6 gap-2 mb-4">
        {numbers.map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onChange(num)}
            className={cx(
              'scale-button',
              'flex items-center justify-center',
              'w-full h-12 rounded-lg border-2 font-semibold',
              'transition-all duration-200',
              'hover:scale-105 active:scale-95',
              {
                'border-primary-600 bg-primary-600 text-white': value === num,
                'border-input text-foreground hover:border-primary-300': value !== num,
                'border-error-600': error
              }
            )}
            aria-label={`Seleccionar ${num}${labels[num] ? `: ${labels[num]}` : ''}`}
            aria-pressed={value === num ? 'true' : 'false'}
          >
            {num}
          </button>
        ))}
      </div>
      
      {/* Labels for specific values */}
      {Object.keys(labels).length > 0 && (
        <div className="grid grid-cols-6 gap-2 text-xs text-muted-foreground">
          {numbers.map((num) => (
            <div key={num} className="text-center">
              {labels[num] || ''}
            </div>
          ))}
        </div>
      )}
      
      {/* Current selection display */}
      {value !== undefined && (
        <div className="text-center mt-4 p-3 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium">
            Seleccionado: <span className="text-primary-600">{value}</span>
            {labels[value] && (
              <span className="text-muted-foreground ml-1">
                ({labels[value]})
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
};
```

---

### Navigation Components

#### NavigationControls Component
```tsx
interface NavigationControlsProps {
  currentStep: number
  totalSteps: number
  canGoBack?: boolean
  canGoForward?: boolean
  onPrevious?: () => void
  onNext?: () => void
  onSubmit?: () => void
  isSubmitting?: boolean
  primaryLabel?: string
  secondaryLabel?: string
  className?: string
}

const NavigationControls: React.FC<NavigationControlsProps> = ({
  currentStep,
  totalSteps,
  canGoBack = true,
  canGoForward = true,
  onPrevious,
  onNext,
  onSubmit,
  isSubmitting = false,
  primaryLabel,
  secondaryLabel,
  className = ''
}) => {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className={cx(
      'navigation-controls',
      'flex items-center justify-between gap-4 pt-6',
      className
    )}>
      {/* Previous button */}
      {!isFirstStep && canGoBack && onPrevious ? (
        <Button
          variant="outline"
          size="lg"
          onClick={onPrevious}
          disabled={isSubmitting}
          className="flex-shrink-0"
        >
          <ChevronLeftIcon className="w-4 h-4 mr-2" />
          {secondaryLabel || 'Anterior'}
        </Button>
      ) : (
        <div /> // Spacer
      )}

      {/* Next/Submit button */}
      {isLastStep ? (
        <Button
          variant="default"
          size="lg"
          onClick={onSubmit}
          disabled={!canGoForward || isSubmitting}
          loading={isSubmitting}
          className="flex-shrink-0"
        >
          <CheckIcon className="w-4 h-4 mr-2" />
          {primaryLabel || 'Completar'}
        </Button>
      ) : (
        <Button
          variant="default"
          size="lg"
          onClick={onNext}
          disabled={!canGoForward}
          className="flex-shrink-0"
        >
          {primaryLabel || 'Siguiente'}
          <ChevronRightIcon className="w-4 h-4 ml-2" />
        </Button>
      )}
    </div>
  );
};
```

#### Enhanced Button Component
```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'success'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  loading?: boolean
  asChild?: boolean
  children: React.ReactNode
  className?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'default', 
    size = 'default', 
    loading = false,
    disabled,
    children,
    ...props 
  }, ref) => {
    const variantClasses = {
      default: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
      destructive: 'bg-error-600 text-white hover:bg-error-700 active:bg-error-800',
      outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      link: 'text-primary-600 underline-offset-4 hover:underline',
      success: 'bg-success-600 text-white hover:bg-success-700 active:bg-success-800'
    };

    const sizeClasses = {
      default: 'h-11 px-4 py-2',      // 44px height - minimum touch target
      sm: 'h-9 rounded-md px-3',      // 36px height - compact
      lg: 'h-12 rounded-lg px-6',     // 48px height - generous touch target  
      icon: 'h-11 w-11'               // Square button
    };

    return (
      <button
        className={cx(
          'inline-flex items-center justify-center whitespace-nowrap rounded-md',
          'text-sm font-medium ring-offset-background transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          'active:scale-95 transition-transform',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <LoadingSpinner className="mr-2 h-4 w-4" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

---

### Feedback Components

#### LoadingSpinner Component
```tsx
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <svg
      className={cx(
        'animate-spin',
        sizeClasses[size],
        className
      )}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-label="Cargando"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};
```

#### Message Components
```tsx
interface MessageProps {
  children: React.ReactNode
  variant?: 'error' | 'success' | 'warning' | 'info'
  size?: 'sm' | 'md'
  className?: string
}

const Message: React.FC<MessageProps> = ({
  children,
  variant = 'info',
  size = 'md',
  className = ''
}) => {
  const variantClasses = {
    error: 'bg-error-50 text-error-600 border-error-200',
    success: 'bg-success-50 text-success-600 border-success-200',
    warning: 'bg-warning-50 text-warning-600 border-warning-200',
    info: 'bg-primary-50 text-primary-600 border-primary-200'
  };

  const sizeClasses = {
    sm: 'p-3 text-sm',
    md: 'p-4 text-base'
  };

  const icons = {
    error: ExclamationCircleIcon,
    success: CheckCircleIcon,
    warning: ExclamationTriangleIcon,
    info: InformationCircleIcon
  };

  const Icon = icons[variant];

  return (
    <div
      className={cx(
        'flex items-start space-x-3 border rounded-lg',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      role="alert"
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">{children}</div>
    </div>
  );
};
```

---

### Integration Example

#### Complete Form Section Example
```tsx
const SurveySection: React.FC<SurveySectionProps> = ({
  section,
  answers,
  errors,
  onAnswerChange,
  onNext,
  onPrevious,
  isFirst,
  isLast,
  canProceed
}) => {
  return (
    <SurveyContainer>
      <SectionHeader
        title={section.title}
        sectionNumber={section.order}
        totalSections={8}
        completionPercentage={75}
        onBack={!isFirst ? onPrevious : undefined}
      />
      
      <Card className="mb-6">
        <CardContent className="space-y-6 p-6">
          {section.questions.map((question) => (
            <FormField
              key={question.id}
              label={question.text}
              required={question.required}
              error={errors[question.id]}
              success={!errors[question.id] && answers[question.id]}
            >
              {renderQuestionInput(question, answers, onAnswerChange)}
            </FormField>
          ))}
        </CardContent>
      </Card>
      
      <NavigationControls
        currentStep={section.order - 1}
        totalSteps={8}
        canGoBack={!isFirst}
        canGoForward={canProceed}
        onPrevious={onPrevious}
        onNext={isLast ? undefined : onNext}
        onSubmit={isLast ? onSubmit : undefined}
      />
    </SurveyContainer>
  );
};
```

This component specification provides a complete foundation for implementing the PPD survey form with Untitled UI components, ensuring accessibility, mobile optimization, and Spanish language support.