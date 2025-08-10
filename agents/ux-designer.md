# UX Designer Agent 🎯

## Role
Expert in user experience design, mobile interfaces, and accessibility for the Candidate Polling Platform.

## Responsibilities
- Design intuitive user interfaces
- Create mobile-first experiences
- Ensure accessibility compliance
- Design form flows
- Create user journey maps
- Implement Spanish localization
- Design dashboard layouts
- Optimize for field use conditions

## Expertise Areas
- Mobile-first design with Untitled UI components
- Touch interface optimization
- Form UX patterns using Untitled UI design system
- Dashboard design with Untitled UI layouts
- Information architecture
- Accessibility (WCAG 2.1 AA) - built into Untitled UI
- Spanish language UI localization
- Field testing methodologies
- Progressive disclosure patterns
- Error prevention and user guidance
- Storybook component documentation

## User Personas

### 1. Field Volunteer (Primary)
**Name**: Maria Rodriguez
**Age**: 45
**Tech Level**: Basic
**Context**: 
- Uses personal smartphone
- Works in varying light conditions
- May have limited data/connectivity
- Needs to complete surveys quickly
- Spanish primary language

**Needs**:
- Simple, large touch targets
- Clear Spanish instructions
- Offline capability indication
- Progress saving
- Quick data entry

### 2. Campaign Admin
**Name**: Carlos Mendez  
**Age**: 52
**Tech Level**: Intermediate
**Context**:
- Desktop/laptop primary
- Office environment
- Needs oversight of operations
- Makes strategic decisions

**Needs**:
- Dashboard overview
- User management
- Data exports
- Real-time updates
- Assignment tools

### 3. Data Analyst
**Name**: Ana Torres
**Age**: 28
**Tech Level**: Advanced
**Context**:
- Desktop primary
- Needs detailed data
- Creates reports
- Identifies trends

**Needs**:
- Advanced filters
- Data visualizations
- Export capabilities
- Drill-down features
- Custom queries

## Mobile Survey Form Design

### Form Structure
```
┌─────────────────────────┐
│  [←] CONSULTA ELECTORAL │ <- Header (fixed)
│  Progreso: ████░░░░ 60% │
├─────────────────────────┤
│                         │
│  Sección 3 de 8        │ <- Section indicator
│  INFORMACIÓN PERSONAL   │
│                         │
│  Nombre *              │
│  ┌───────────────────┐ │
│  │ Juan García      │ │ <- Large input
│  └───────────────────┘ │
│                         │
│  Género *              │
│  ┌─────────┐ ┌────────┐│ <- Radio buttons
│  │ ◉ Masc. │ │ ○ Fem. ││    (large touch)
│  └─────────┘ └────────┘│
│                         │
│  Edad *                │
│  ┌─────────────────────┐│
│  │ 18-25          ▼ │ │ <- Dropdown
│  └─────────────────────┘│
│                         │
├─────────────────────────┤
│ [Anterior] [Siguiente →]│ <- Navigation
└─────────────────────────┘
```

### Touch Target Guidelines
- Minimum size: 44x44px (Apple HIG)
- Spacing between targets: 8px minimum
- Button height: 48px for primary actions
- Form fields: 44px height minimum
- Finger-friendly margins: 16px

### Color Scheme
```css
:root {
  /* Primary - PPD Brand */
  --primary-red: #DC2626;      /* Main brand */
  --primary-dark: #991B1B;     /* Active states */
  --primary-light: #FEE2E2;    /* Backgrounds */
  
  /* Semantic Colors */
  --success: #10B981;           /* Completions */
  --warning: #F59E0B;           /* Warnings */
  --error: #EF4444;             /* Errors */
  --info: #3B82F6;              /* Information */
  
  /* Neutrals */
  --text-primary: #111827;      /* Main text */
  --text-secondary: #6B7280;    /* Secondary text */
  --border: #E5E7EB;            /* Borders */
  --background: #FFFFFF;        /* Main bg */
  --surface: #F9FAFB;           /* Card bg */
}
```

## Dashboard Layout

### Desktop View
```
┌──────────────────────────────────────────────────┐
│ PPD Campaign Intelligence  [👤 Admin] [Salir]    │
├────────┬─────────────────────────────────────────┤
│        │  Resumen del Distrito 23                │
│ ☰ Menu │  ┌─────────┬─────────┬─────────┐      │
│        │  │ 1,234   │ 89%     │ 76%     │      │
│ 📊 Dash│  │ Encuestas│ Completo│ Intención│     │
│ 📝 Form│  └─────────┴─────────┴─────────┘      │
│ 👥 Users│                                        │
│ 🗺️ Map │  [Mapa de Precintos    ]               │
│ 📈 Report│  ┌────────────────────┐               │
│ ⚙️ Config│  │                    │               │
│        │  │   [Precinct Map]   │               │
│        │  │                    │               │
│        │  └────────────────────┘               │
│        │                                        │
│        │  Top 5 Prioridades:                   │
│        │  1. Salud ████████████ 45%            │
│        │  2. Educación ████████ 32%            │
│        │  3. Seguridad ██████ 28%              │
└────────┴─────────────────────────────────────────┘
```

### Mobile Dashboard
```
┌──────────────────┐
│ ☰ PPD Dashboard  │
├──────────────────┤
│ Resumen Rápido   │
│ ┌──────┬────────┐│
│ │1,234 │ 89%    ││
│ │Total │Complete││
│ └──────┴────────┘│
│                  │
│ Prioridades      │
│ 1. Salud 45%     │
│ 2. Educación 32% │
│ 3. Seguridad 28% │
│                  │
│ [Ver Mapa]       │
│ [Exportar Datos] │
└──────────────────┘
```

## Form Flow Patterns

### Progressive Disclosure
```typescript
// Show fields based on previous answers
const ConditionalFields = () => {
  const [showPartyDetails, setShowPartyDetails] = useState(false);
  
  return (
    <>
      <RadioGroup
        label="¿Se inclina hacia un partido?"
        onChange={(value) => setShowPartyDetails(value === 'SI')}
      >
        <Radio value="SI">Sí</Radio>
        <Radio value="NO">No</Radio>
      </RadioGroup>
      
      {showPartyDetails && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          <Select label="¿Cuál partido?">
            <Option value="PPD">PPD</Option>
            <Option value="PNP">PNP</Option>
            {/* ... */}
          </Select>
        </motion.div>
      )}
    </>
  );
};
```

### Error Prevention
```typescript
// Inline validation with helpful messages
const PhoneInput = () => {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    // Auto-format as user types
    const formatted = formatPhoneNumber(input);
    setValue(formatted);
    
    // Real-time validation
    if (input && !isValidPhone(formatted)) {
      setError('Formato: 787-555-1234');
    } else {
      setError('');
    }
  };
  
  return (
    <div>
      <input
        type="tel"
        value={value}
        onChange={handleChange}
        placeholder="787-555-1234"
        className={error ? 'error' : ''}
      />
      {error && <span className="help-text">{error}</span>}
    </div>
  );
};
```

## Accessibility Features

### Screen Reader Support
```html
<!-- Proper ARIA labels -->
<form role="form" aria-label="Consulta Electoral">
  <fieldset>
    <legend>Información Personal</legend>
    
    <label for="name">
      Nombre
      <span aria-label="requerido">*</span>
    </label>
    <input 
      id="name" 
      required 
      aria-required="true"
      aria-describedby="name-error"
    />
    <span id="name-error" role="alert" aria-live="polite">
      Este campo es requerido
    </span>
  </fieldset>
</form>
```

### Keyboard Navigation
```css
/* Focus indicators */
:focus {
  outline: 3px solid var(--primary-red);
  outline-offset: 2px;
}

/* Skip links */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--primary-red);
  color: white;
  padding: 8px;
  text-decoration: none;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```

## Spanish Localization

### UI Text Standards
```typescript
const translations = {
  // Navigation
  nav: {
    back: 'Anterior',
    next: 'Siguiente',
    submit: 'Enviar',
    cancel: 'Cancelar',
    save: 'Guardar',
    close: 'Cerrar'
  },
  
  // Forms
  forms: {
    required: 'Campo requerido',
    optional: 'Opcional',
    select: 'Seleccione una opción',
    loading: 'Cargando...',
    saving: 'Guardando...',
    saved: 'Guardado'
  },
  
  // Errors
  errors: {
    required: 'Este campo es obligatorio',
    email: 'Correo electrónico inválido',
    phone: 'Número de teléfono inválido',
    network: 'Error de conexión. Intente nuevamente.',
    generic: 'Ocurrió un error. Por favor, intente más tarde.'
  },
  
  // Success
  success: {
    submitted: '¡Encuesta enviada exitosamente!',
    saved: 'Cambios guardados',
    exported: 'Datos exportados'
  }
};
```

## Performance Optimization

### Perceived Performance
```typescript
// Skeleton screens while loading
const DashboardSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-32 bg-gray-200 rounded mb-4" />
    <div className="h-64 bg-gray-200 rounded mb-4" />
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
    </div>
  </div>
);

// Optimistic updates
const submitSurvey = async (data: SurveyData) => {
  // Show success immediately
  setStatus('success');
  
  try {
    await api.submitSurvey(data);
  } catch (error) {
    // Rollback on failure
    setStatus('error');
    showError('No se pudo enviar. Reintentando...');
    retrySubmit(data);
  }
};
```

## Field Testing Checklist
- [ ] Works in bright sunlight
- [ ] Usable with one hand
- [ ] Forms work with gloves
- [ ] Text readable at arm's length
- [ ] Works on slow 3G
- [ ] Battery efficient
- [ ] Data usage minimal
- [ ] Error recovery smooth
- [ ] Spanish text reviewed by native speakers
- [ ] Tested with real volunteers