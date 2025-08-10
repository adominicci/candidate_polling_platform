# Spanish Language & Puerto Rico UX Guidelines
## Cultural Context and Localization Standards

### Overview
This document provides comprehensive guidelines for designing user interfaces in Spanish specifically for Puerto Rican users of the PPD candidate polling platform. It addresses cultural nuances, linguistic patterns, and regional preferences essential for creating authentic and respectful user experiences.

---

### Puerto Rican Spanish Characteristics

#### Linguistic Patterns
- **Formal address preference**: Use "usted" form consistently in political contexts
- **Regional vocabulary**: Incorporate Puerto Rican Spanish terms where appropriate
- **Anglicisms**: Common English loanwords are acceptable when widely understood
- **Gender-inclusive language**: Consider both masculine and feminine forms
- **Respectful tone**: Maintain dignified, courteous language throughout

#### Common Puerto Rican Terms
```
Mainland US → Puerto Rico Usage
County → Municipio
Precinct → Precinto 
Neighborhood → Sector/Barrio
Voting → Ejercer su derecho al voto
Poll worker → Funcionario electoral
Absentee voting → Voto por correo
```

#### Political Context Vocabulary
```
English Term → Puerto Rican Spanish
Political party → Partido político
Incumbent → Incumbente
Candidate → Candidato/Candidata
Primary election → Elección primaria
General election → Elección general
Voter registration → Inscripción electoral
Polling place → Lugar de votación
Electoral college → Colegio Electoral (US context)
Popular vote → Voto popular
```

---

### Text Expansion Planning

#### Spanish Text Length Considerations
Spanish text typically requires **25-30% more space** than English. Design implications:

```
English: "Next Section" (12 chars)
Spanish: "Siguiente Sección" (17 chars) = +42% length

English: "Save Draft" (10 chars)
Spanish: "Guardar Borrador" (16 chars) = +60% length

English: "Complete Survey" (15 chars)
Spanish: "Completar Encuesta" (18 chars) = +20% length
```

#### Button Text Examples
```css
/* Plan for longer Spanish text in buttons */
.button-primary {
  min-width: 140px; /* Accommodate longer Spanish text */
  padding: 12px 20px; /* Extra horizontal padding */
  text-align: center;
  white-space: nowrap; /* Prevent text wrapping when possible */
}

/* Responsive text sizing */
@media (max-width: 375px) {
  .button-text {
    font-size: 14px; /* Slightly smaller on narrow screens */
  }
}
```

#### Form Label Planning
```
Short English → Longer Spanish
Name → Nombre completo
Email → Correo electrónico
Phone → Número de teléfono
Address → Dirección residencial
Zip Code → Código postal
```

---

### Cultural Design Considerations

#### Name Conventions
Puerto Ricans commonly use **compound surnames**:
- Format: Nombre + Apellido Paterno + Apellido Materno
- Example: "María Elena García Rodriguez"
- **Design impact**: Name fields need adequate width and length

```jsx
// Accommodate longer names
<Input
  label="Nombre completo"
  placeholder="Ejemplo: José Luis Rivera Santos"
  maxLength={100} // Generous length for compound names
  className="w-full" // Full width on mobile
/>
```

#### Address Formats
Puerto Rican addresses follow unique patterns:
```
Standard Format:
[Street Number] [Street Name]
[Urbanización/Sector] [Apartment/Unit]
[City], PR [Postal Code]

Example:
123 Calle Luna
Urb. Villa Caparra, Apt. 4-B
Guaynabo, PR 00966
```

```jsx
// Address input design
<div className="address-group">
  <Input label="Dirección residencial" placeholder="Ej: 123 Calle Luna" />
  <Input label="Urbanización/Sector" placeholder="Ej: Urb. Villa Caparra" />
  <Input label="Apartamento/Unidad" placeholder="Ej: Apt. 4-B (opcional)" />
  <div className="city-zip-row">
    <Input label="Ciudad" placeholder="Ej: Guaynabo" />
    <Input label="Código postal" placeholder="00966" pattern="[0-9]{5}" />
  </div>
</div>
```

#### Phone Number Standards
Puerto Rico uses US format but with specific area codes:
- **Area codes**: 787, 939 (both cover entire island)
- **Format**: (787) 555-1234 or 787-555-1234
- **Mobile preference**: Most users prefer dash format

```jsx
const PhoneInput = ({ value, onChange }) => {
  const formatPhone = (input) => {
    const digits = input.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  return (
    <Input
      label="Número de teléfono"
      placeholder="787-555-1234"
      value={value}
      onChange={(e) => onChange(formatPhone(e.target.value))}
      pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"
    />
  );
};
```

---

### Political Context Sensitivity

#### Party Affiliation Language
```jsx
const POLITICAL_PARTIES = {
  PPD: {
    name: "Partido Popular Democrático",
    abbreviation: "PPD",
    description: "Partido del Estado Libre Asociado"
  },
  PNP: {
    name: "Partido Nuevo Progresista", 
    abbreviation: "PNP",
    description: "Partido de la Estadidad"
  },
  PIP: {
    name: "Partido Independentista Puertorriqueño",
    abbreviation: "PIP", 
    description: "Partido de la Independencia"
  },
  MVC: {
    name: "Movimiento Victoria Ciudadana",
    abbreviation: "MVC",
    description: "Movimiento político emergente"
  },
  PD: {
    name: "Proyecto Dignidad",
    abbreviation: "PD",
    description: "Partido de valores conservadores"
  }
};
```

#### Respectful Political Language
- **Neutral tone**: Avoid partisan language even in PPD platform
- **Inclusive approach**: Respect all political viewpoints
- **Professional terminology**: Use official political terms
- **Dignified discourse**: Maintain respectful tone about opposition

```jsx
// Example: Neutral question wording
const VotingHistoryQuestion = {
  text: "¿Ejerció su derecho al voto en las elecciones de 2020?",
  // NOT: "¿Votó usted en 2020?" (less formal)
  // NOT: "¿Participó en las elecciones pasadas?" (less specific)
  
  options: [
    { value: "SI", label: "Sí" },
    { value: "NO", label: "No" },
    { value: "NO_RECUERDO", label: "No recuerdo" } // Respectful option
  ]
};
```

---

### User Interface Text Standards

#### Form Labels and Instructions
```javascript
const UI_TEXT = {
  // Form labels (formal, clear)
  labels: {
    name: "Nombre completo",
    email: "Correo electrónico", 
    phone: "Número de teléfono",
    address: "Dirección residencial",
    postalAddress: "Dirección postal",
    birthDate: "Fecha de nacimiento",
    gender: "Género",
    precinct: "Precinto electoral",
    electoralNumber: "Número electoral"
  },
  
  // Instructions (helpful, clear)
  instructions: {
    required: "Los campos marcados con (*) son obligatorios",
    optional: "Este campo es opcional",
    phoneFormat: "Use el formato: 787-555-1234",
    emailFormat: "Ejemplo: juan.perez@gmail.com",
    selectMultiple: "Puede seleccionar múltiples opciones",
    selectMax: (n) => `Seleccione máximo ${n} opciones`
  },
  
  // Actions (clear, actionable)
  actions: {
    next: "Siguiente",
    previous: "Anterior", 
    save: "Guardar",
    submit: "Enviar",
    complete: "Completar",
    cancel: "Cancelar",
    edit: "Editar",
    delete: "Eliminar",
    continue: "Continuar"
  },
  
  // Status messages (informative)
  status: {
    saving: "Guardando...",
    saved: "Guardado exitosamente",
    submitting: "Enviando...",
    submitted: "Enviado exitosamente", 
    loading: "Cargando...",
    error: "Ha ocurrido un error",
    success: "Operación exitosa"
  }
};
```

#### Error Messages (Helpful and Specific)
```javascript
const ERROR_MESSAGES = {
  required: "Este campo es obligatorio",
  
  // Email validation
  emailInvalid: "Ingrese un correo electrónico válido",
  emailExample: "Ejemplo: maria.santos@gmail.com",
  
  // Phone validation  
  phoneInvalid: "Ingrese un número de teléfono válido",
  phoneFormat: "Use el formato: 787-555-1234",
  phoneIncomplete: "El número debe tener 10 dígitos",
  
  // Text length
  tooShort: (min) => `Mínimo ${min} caracteres`,
  tooLong: (max) => `Máximo ${max} caracteres`,
  
  // Selection limits
  selectMin: (min) => `Debe seleccionar al menos ${min} opciones`,
  selectMax: (max) => `Puede seleccionar máximo ${max} opciones`,
  
  // Date validation
  dateInvalid: "Ingrese una fecha válida",
  dateFuture: "La fecha no puede ser futura",
  dateFormat: "Use el formato DD/MM/AAAA",
  
  // Network/server errors
  networkError: "Error de conexión. Verifique su internet.",
  serverError: "Error del servidor. Intente nuevamente.",
  timeoutError: "La operación tomó demasiado tiempo. Intente de nuevo."
};
```

#### Success Messages (Positive and Clear)
```javascript
const SUCCESS_MESSAGES = {
  draftsaved: "Borrador guardado exitosamente",
  sectionComplete: "Sección completada",
  surveySubmitted: "Encuesta enviada exitosamente",
  dataValidated: "Información válida",
  progressSaved: "Progreso guardado automáticamente",
  
  // Completion messages
  thankYou: "¡Gracias por su participación!",
  completionMessage: "Su respuesta ha sido registrada y ayudará en nuestra consulta electoral.",
  nextSteps: "Los datos serán procesados para análisis de la consulta comunitaria."
};
```

---

### Date and Time Formats

#### Puerto Rican Date Preferences
Most Puerto Ricans are familiar with both US (MM/DD/YYYY) and international (DD/MM/YYYY) formats, but prefer the international format:

```jsx
const DateDisplay = ({ date }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    // Puerto Rican preference: DD/MM/YYYY
    return date.toLocaleDateString('es-PR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  };
  
  return <span>{formatDate(date)}</span>;
};

// Date input with proper localization
<input 
  type="date"
  pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}"
  placeholder="DD/MM/AAAA"
  title="Formato: DD/MM/AAAA"
/>
```

#### Time Format (12-hour preference)
```javascript
const timeFormat = {
  locale: 'es-PR',
  options: {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true // Puerto Ricans prefer 12-hour format
  }
};

// Example: "2:30 PM" instead of "14:30"
const displayTime = (date) => {
  return date.toLocaleTimeString('es-PR', timeFormat.options);
};
```

---

### Accessibility in Spanish

#### Screen Reader Considerations
```jsx
// Proper Spanish screen reader labels
<input
  type="radio"
  name="voting-history"
  aria-label="Sí, ejercí mi derecho al voto en 2020"
  aria-describedby="voting-history-help"
/>

<div id="voting-history-help" className="sr-only">
  Seleccione si ejerció su derecho al voto en las elecciones generales de 2020
</div>
```

#### ARIA Labels in Spanish
```jsx
const AriaLabels = {
  // Navigation
  mainNavigation: "Navegación principal",
  breadcrumb: "Ruta de navegación", 
  pagination: "Paginación",
  
  // Form elements
  required: "requerido",
  optional: "opcional", 
  invalid: "inválido",
  valid: "válido",
  
  // Actions
  close: "cerrar",
  open: "abrir",
  expand: "expandir",
  collapse: "colapsar",
  
  // Status
  loading: "cargando",
  error: "error",
  success: "éxito",
  warning: "advertencia"
};
```

---

### Cultural Color Psychology

#### Color Associations in Puerto Rican Context
```css
:root {
  /* Political context colors */
  --ppd-blue: #0d5bdd; /* Associated with PPD party */
  --pr-flag-red: #dc2626; /* Puerto Rican flag red */
  --pr-flag-blue: #1e40af; /* Puerto Rican flag blue */
  
  /* Cultural significance */
  --success-green: #16a34a; /* Positive, growth */
  --warning-amber: #d97706; /* Caution, attention */
  --error-red: #dc2626; /* Problems, invalid */
  
  /* Neutral, professional */
  --text-primary: #1f2937; /* High contrast reading */
  --text-secondary: #6b7280; /* Supporting text */
  --background: #ffffff; /* Clean, professional */
}
```

#### Avoiding Color-Only Communication
```jsx
// ✅ Good: Color + icon + text
<div className="status-success">
  <CheckIcon className="text-green-600" />
  <span>Información válida</span>
</div>

// ❌ Bad: Color only
<div className="text-green-600">
  Válido
</div>
```

---

### Responsive Text Strategies

#### Mobile-First Spanish Typography
```css
/* Base typography for Spanish text */
.spanish-text-base {
  font-family: 'Inter', 'Segoe UI', sans-serif;
  line-height: 1.5; /* Extra space for accented characters */
  font-size: 16px; /* Minimum size to prevent iOS zoom */
}

/* Responsive scaling for longer Spanish text */
@media (max-width: 375px) {
  .button-text {
    font-size: 14px;
    line-height: 1.4;
  }
  
  .form-label {
    font-size: 15px;
    margin-bottom: 8px;
  }
}

/* Handle text overflow gracefully */
.truncate-spanish {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wrap-spanish {
  word-break: break-word; /* Handle long Spanish words */
  hyphens: auto;
  -webkit-hyphens: auto;
}
```

#### Dynamic Text Sizing
```jsx
const ResponsiveText = ({ children, maxLength = 50 }) => {
  const shouldTruncate = children.length > maxLength;
  const [expanded, setExpanded] = useState(false);
  
  if (shouldTruncate && !expanded) {
    return (
      <div className="responsive-text">
        <span>{children.substring(0, maxLength)}...</span>
        <button 
          onClick={() => setExpanded(true)}
          className="text-link ml-1"
        >
          ver más
        </button>
      </div>
    );
  }
  
  return <span className="responsive-text">{children}</span>;
};
```

---

### Testing Guidelines for Spanish UX

#### Content Review Checklist
- [ ] **Native Spanish review**: Content reviewed by Puerto Rican Spanish speakers
- [ ] **Political neutrality**: Language maintains respectful, non-partisan tone
- [ ] **Cultural appropriateness**: Terms and examples relevant to Puerto Rico
- [ ] **Text expansion**: Interface accommodates 30% longer text
- [ ] **Date/time formats**: Matches Puerto Rican user expectations
- [ ] **Phone/address formats**: Follows local conventions

#### Usability Testing Considerations
- [ ] **Target user testing**: Test with actual Puerto Rican volunteers
- [ ] **Device testing**: Test on devices commonly used in Puerto Rico
- [ ] **Network conditions**: Test with typical PR mobile network speeds
- [ ] **Accessibility testing**: Screen readers with Spanish voice synthesis
- [ ] **Multi-generational testing**: Test with users across age groups

This comprehensive guide ensures the survey form respects Puerto Rican cultural context while providing an accessible, professional user experience for political data collection.