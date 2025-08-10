# Component Interaction Patterns
## PPD Survey Form - Accessibility & Touch Optimization

### Touch Target Specifications

#### Minimum Touch Target Requirements
All interactive elements must meet the following minimum sizes:
- **Primary touch targets**: 44×44px (iOS Human Interface Guidelines)
- **Secondary touch targets**: 40×40px minimum
- **Text inputs**: 48px minimum height for comfortable typing
- **Radio buttons**: 48×48px touch area (visual element can be smaller)
- **Checkboxes**: 48×48px touch area with 24×24px visual checkbox
- **Scale selectors**: 52×52px for number scale buttons

#### Touch Target Spacing
- **Minimum gap**: 8px between adjacent interactive elements
- **Recommended gap**: 12px for comfortable touch separation
- **Button groups**: 16px gap between primary/secondary actions
- **Form fields**: 20px vertical spacing between field groups

### Input Field Interactions

#### Text Input Behavior
```css
/* Base input styling with proper touch targets */
.survey-input {
  min-height: 44px;
  padding: 12px 16px;
  font-size: 16px; /* Prevents zoom on iOS */
  border-radius: 8px;
  border: 2px solid #e2e8f0;
  transition: all 0.2s ease-in-out;
}

.survey-input:focus {
  border-color: #0d5bdd; /* PPD primary blue */
  box-shadow: 0 0 0 3px rgba(13, 91, 221, 0.1);
  outline: none;
}

.survey-input:error {
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}
```

#### Phone Number Formatting
```typescript
// Real-time formatting as user types
const formatPhoneInput = (value: string) => {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');
  
  // Progressive formatting
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
};

// Visual feedback during formatting
onInput: (e) => {
  const formatted = formatPhoneInput(e.target.value);
  setPhoneValue(formatted);
  // Validate in real-time
  setPhoneError(validatePhoneNumber(formatted));
}
```

#### Email Validation Pattern
```typescript
const EMAIL_VALIDATION = {
  pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  errorMessage: 'Ingrese un correo válido (ejemplo: juan@email.com)',
  
  validateOnBlur: true, // Don't validate while typing
  showSuccessState: true, // Green checkmark when valid
}

// Example: miguel.santos@gmail.com ✓
// Error: miguel.santos@ ⚠ Ingrese un correo válido
```

### Radio Button Interactions

#### Large Touch Area Implementation
```jsx
// RadioOption component with generous touch targets
<label className="radio-option">
  <input 
    type="radio" 
    name={groupName}
    value={option.value}
    className="sr-only" // Hidden from view, accessible to screen readers
  />
  <div className="radio-touch-area"> {/* 48x48px touch target */}
    <div className="radio-visual"> {/* 20x20px visual element */}
      <div className="radio-indicator" /> {/* 8x8px filled circle when selected */}
    </div>
    <span className="radio-label">{option.label}</span>
  </div>
</label>
```

```css
.radio-touch-area {
  display: flex;
  align-items: center;
  min-height: 48px;
  padding: 12px 16px;
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.radio-touch-area:hover {
  background-color: #f8fafc;
}

.radio-touch-area:active {
  background-color: #e2e8f0;
  transform: scale(0.98);
}
```

#### Radio Group Layout
```
┌─────────────────────────────┐
│ ¿Ejerció su derecho al      │ ← Question text
│ voto en 2020?               │
│                             │
│ ┌─────────────────────────┐ │ ← Option 1 (48px height)
│ │ ● SÍ                    │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │ ← Option 2 (48px height)
│ │ ○ NO                    │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │ ← Option 3 (48px height)
│ │ ○ NO RECUERDO           │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### Checkbox Interactions

#### Multi-Select with Maximum Constraint
```jsx
// Priority selection with 5-item maximum
const PriorityCheckboxGroup = () => {
  const [selected, setSelected] = useState([]);
  const maxSelections = 5;
  
  const handleToggle = (value) => {
    if (selected.includes(value)) {
      // Remove item
      setSelected(prev => prev.filter(item => item !== value));
    } else if (selected.length < maxSelections) {
      // Add item if under limit
      setSelected(prev => [...prev, value]);
    } else {
      // Show helpful feedback when at limit
      showToast('Máximo 5 prioridades. Deseleccione una opción primero.');
    }
  };
  
  return (
    <div className="checkbox-group">
      <div className="selection-counter">
        {selected.length}/{maxSelections} seleccionadas
      </div>
      {options.map(option => (
        <CheckboxOption 
          key={option.value}
          option={option}
          checked={selected.includes(option.value)}
          disabled={!selected.includes(option.value) && selected.length >= maxSelections}
          onToggle={handleToggle}
        />
      ))}
    </div>
  );
};
```

#### Checkbox Visual States
```css
/* Checkbox states with clear visual feedback */
.checkbox-option {
  position: relative;
  min-height: 52px; /* Slightly larger for multi-select */
  padding: 14px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-bottom: 8px;
  transition: all 0.2s;
}

.checkbox-option.checked {
  border-color: #0d5bdd;
  background-color: #ecf5ff;
}

.checkbox-option.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.checkbox-option:not(.disabled):hover {
  border-color: #cbd5e1;
  background-color: #f8fafc;
}
```

### Scale Input Interactions

#### Number Scale (0-10) Component
```
┌─────────────────────────────┐
│ ¿Cuántos familiares votan?  │ ← Question
│                             │
│ 0   1   2   3   4   5       │ ← Scale buttons (52px each)
│ ○   ○   ○   ●   ○   ○       │
│                             │
│ 6   7   8   9   10          │
│ ○   ○   ○   ○   ○           │
│                             │
│ Seleccionado: 3             │ ← Current value display
└─────────────────────────────┘
```

```jsx
const NumberScale = ({ min = 0, max = 10, value, onChange }) => {
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  
  return (
    <div className="number-scale">
      <div className="scale-grid">
        {numbers.map(num => (
          <button
            key={num}
            type="button"
            className={`scale-button ${value === num ? 'selected' : ''}`}
            onClick={() => onChange(num)}
            aria-label={`Seleccionar ${num}`}
          >
            {num}
          </button>
        ))}
      </div>
      {value !== undefined && (
        <div className="scale-value">
          Seleccionado: {value}
        </div>
      )}
    </div>
  );
};
```

### Date Input Optimization

#### Native Date Picker Enhancement
```jsx
const DateInput = ({ value, onChange, label, required }) => {
  const [focused, setFocused] = useState(false);
  
  return (
    <div className="date-input-wrapper">
      <label className="date-label">{label} {required && '*'}</label>
      <div className={`date-input-container ${focused ? 'focused' : ''}`}>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="date-input"
          max={new Date().toISOString().split('T')[0]} // Prevent future dates for birth_date
        />
        <CalendarIcon className="date-icon" />
      </div>
      <div className="date-help">
        Formato: DD/MM/AAAA
      </div>
    </div>
  );
};
```

### Textarea Interactions

#### Character Counter & Auto-Resize
```jsx
const TextareaField = ({ value, onChange, maxLength, placeholder, rows = 4 }) => {
  const [height, setHeight] = useState('auto');
  const textareaRef = useRef(null);
  
  // Auto-resize functionality
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);
  
  const remainingChars = maxLength - (value?.length || 0);
  const isNearLimit = remainingChars < 50;
  
  return (
    <div className="textarea-wrapper">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        className="survey-textarea"
        style={{ height }}
      />
      {maxLength && (
        <div className={`char-counter ${isNearLimit ? 'warning' : ''}`}>
          {value?.length || 0}/{maxLength} caracteres
        </div>
      )}
    </div>
  );
};
```

### Progress Indicators

#### Section Progress Implementation
```jsx
const SectionProgress = ({ currentSection, totalSections, completionPercentage }) => {
  const sections = Array.from({ length: totalSections }, (_, i) => ({
    index: i,
    isComplete: i < currentSection,
    isCurrent: i === currentSection,
    isUpcoming: i > currentSection
  }));
  
  return (
    <div className="progress-container">
      {/* Overall Progress Bar */}
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${completionPercentage}%` }}
        />
      </div>
      
      {/* Progress Text */}
      <div className="progress-text">
        <span>Sección {currentSection + 1} de {totalSections}</span>
        <span>{completionPercentage}% completo</span>
      </div>
      
      {/* Section Dots */}
      <div className="section-dots">
        {sections.map(section => (
          <div 
            key={section.index}
            className={`dot ${section.isComplete ? 'complete' : ''} ${section.isCurrent ? 'current' : ''}`}
            aria-label={`Sección ${section.index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
```

### Button States & Feedback

#### Primary Action Button
```css
.survey-button-primary {
  min-height: 48px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, #0d5bdd 0%, #1a7cff 100%);
  color: white;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.survey-button-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(13, 91, 221, 0.3);
}

.survey-button-primary:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(13, 91, 221, 0.2);
}

.survey-button-primary:disabled {
  background: #e2e8f0;
  color: #94a3b8;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
```

#### Loading State with Spinner
```jsx
const SubmitButton = ({ onSubmit, isSubmitting, children }) => {
  return (
    <button
      type="button"
      onClick={onSubmit}
      disabled={isSubmitting}
      className="survey-button-primary"
    >
      {isSubmitting ? (
        <>
          <LoadingSpinner className="mr-2" />
          Enviando...
        </>
      ) : (
        children
      )}
    </button>
  );
};

const LoadingSpinner = ({ className }) => (
  <svg className={`animate-spin h-4 w-4 ${className}`} viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);
```

### Navigation Patterns

#### Section Navigation Controls
```jsx
const NavigationControls = ({ 
  currentSection, 
  totalSections, 
  onPrevious, 
  onNext, 
  onSubmit,
  canProceed,
  isSubmitting 
}) => {
  const isFirstSection = currentSection === 0;
  const isLastSection = currentSection === totalSections - 1;
  
  return (
    <div className="navigation-controls">
      {/* Previous Button */}
      {!isFirstSection && (
        <button
          type="button"
          onClick={onPrevious}
          className="nav-button nav-button-secondary"
          disabled={isSubmitting}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Anterior
        </button>
      )}
      
      {/* Spacer */}
      <div className="flex-1" />
      
      {/* Next/Submit Button */}
      {isLastSection ? (
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canProceed || isSubmitting}
          className="nav-button nav-button-primary"
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner className="mr-2" />
              Enviando...
            </>
          ) : (
            <>
              <CheckIcon className="w-4 h-4 mr-2" />
              Completar
            </>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          className="nav-button nav-button-primary"
        >
          Siguiente
          <ChevronRight className="w-4 h-4 ml-2" />
        </button>
      )}
    </div>
  );
};
```

### Error States & Validation

#### Inline Validation Feedback
```jsx
const FormField = ({ label, error, success, required, children }) => {
  return (
    <div className="form-field">
      <label className="field-label">
        {label}
        {required && <span className="required-indicator">*</span>}
      </label>
      
      <div className={`field-input ${error ? 'error' : ''} ${success ? 'success' : ''}`}>
        {children}
      </div>
      
      {error && (
        <div className="field-error" role="alert">
          <AlertIcon className="error-icon" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="field-success">
          <CheckIcon className="success-icon" />
          Válido
        </div>
      )}
    </div>
  );
};
```

#### Error Message Patterns
```typescript
const ERROR_MESSAGES = {
  required: 'Este campo es obligatorio',
  email: 'Ingrese un correo válido (ejemplo: juan@gmail.com)',
  phone: 'Use el formato: 787-555-1234',
  date: 'Seleccione una fecha válida',
  maxLength: (max) => `Máximo ${max} caracteres`,
  minSelections: (min) => `Seleccione al menos ${min} opciones`,
  maxSelections: (max) => `Máximo ${max} selecciones permitidas`,
  network: 'Error de conexión. Revise su internet.',
  server: 'Error del servidor. Intente de nuevo.'
};
```

### Accessibility Enhancements

#### Screen Reader Support
```jsx
const AccessibleRadioGroup = ({ question, options, value, onChange, error }) => {
  const groupId = `radio-group-${question.id}`;
  const errorId = error ? `${groupId}-error` : undefined;
  
  return (
    <fieldset className="radio-fieldset">
      <legend className="radio-legend">
        {question.text}
        {question.required && <span aria-label="requerido">*</span>}
      </legend>
      
      <div 
        className="radio-group"
        role="radiogroup"
        aria-labelledby={groupId}
        aria-describedby={errorId}
        aria-invalid={error ? 'true' : 'false'}
      >
        {options.map(option => (
          <label key={option.value} className="radio-option">
            <input
              type="radio"
              name={groupId}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              aria-describedby={errorId}
            />
            <span className="radio-label">{option.label}</span>
          </label>
        ))}
      </div>
      
      {error && (
        <div id={errorId} className="field-error" role="alert" aria-live="polite">
          {error}
        </div>
      )}
    </fieldset>
  );
};
```

#### Focus Management
```javascript
// Focus management for section transitions
const useFocusManagement = () => {
  const focusFirstError = () => {
    const firstError = document.querySelector('.field-error');
    if (firstError) {
      const associatedInput = document.querySelector(`#${firstError.getAttribute('aria-describedby')}`);
      associatedInput?.focus();
    }
  };
  
  const focusFirstInput = () => {
    const firstInput = document.querySelector('input:not([type="hidden"]), select, textarea');
    firstInput?.focus();
  };
  
  const announceProgress = (section, total, percentage) => {
    const announcement = `Sección ${section} de ${total}. ${percentage} por ciento completo.`;
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = announcement;
    document.body.appendChild(announcer);
    
    setTimeout(() => document.body.removeChild(announcer), 1000);
  };
  
  return { focusFirstError, focusFirstInput, announceProgress };
};
```

These interaction patterns ensure the survey form provides an accessible, intuitive experience for field volunteers using mobile devices in challenging outdoor conditions.