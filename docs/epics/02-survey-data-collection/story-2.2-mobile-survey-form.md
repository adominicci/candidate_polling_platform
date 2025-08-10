# Story 2.2: Mobile Survey Form UI

**Epic**: Survey Data Collection  
**Assigned Agent**: 🎨 Frontend Developer  
**Story Points**: 13  
**Priority**: High  
**Sprint**: 2  
**Dependencies**: UX Designer (wireframes)

## User Story
**As a** field volunteer  
**I want** an easy-to-use mobile form  
**So that** I can quickly collect voter information on my phone  

## Acceptance Criteria
- [ ] Mobile-first responsive design using Untitled UI components
- [ ] Large touch targets (44px minimum)
- [ ] Progressive form wizard (8 sections)
- [ ] Progress indicator showing completion status
- [ ] Form validation with Spanish error messages
- [ ] Clean, professional appearance matching PPD branding

## Technical Requirements
### Untitled UI Components to Use
```typescript
// Core form components
import { 
  Input, 
  Select, 
  RadioGroup, 
  Radio, 
  Checkbox, 
  Button, 
  Card, 
  Progress 
} from "@/components/ui";
import { cx } from "@/utils/cx";
```

### Form Structure
8-section progressive wizard:
1. Información Personal (8 fields)
2. Información del Hogar (4 fields)
3. Historial de Votación (4 fields)
4. Modalidad de Voto (6 fields)
5. Afiliación Política (3 fields)
6. Prioridades (2 fields)
7. Asuntos Comunitarios (2 fields)
8. Evaluación Partidista (2 fields)

### Mobile Design Requirements
- Minimum touch target size: 44x44px
- Form width: Full screen on mobile, max 600px on desktop
- Section navigation: Previous/Next buttons
- Progress bar showing completion percentage
- Large, legible text (minimum 16px)
- High contrast for outdoor visibility

## Definition of Done
- [ ] All 8 form sections implemented
- [ ] All 31 questions rendered correctly
- [ ] Mobile responsiveness verified on iOS/Android
- [ ] Touch targets meet accessibility guidelines
- [ ] Progress indicator updates correctly
- [ ] Form validation shows Spanish error messages
- [ ] Navigation between sections works smoothly
- [ ] Data persists when moving between sections
- [ ] Submit functionality connects to API
- [ ] Loading states implemented
- [ ] Success/error feedback working

## Component Implementation Examples
### Input Field with Validation
```typescript
<Input
  label="Nombre *"
  placeholder="Juan García"
  value={formData.name}
  onChange={(e) => updateField('name', e.target.value)}
  error={errors.name}
  required
  className="text-lg font-semibold leading-7"
  aria-describedby={errors.name ? "name-error" : undefined}
/>
```

### Radio Group Implementation
```typescript
<RadioGroup
  label="Género *"
  value={formData.gender}
  onChange={(value) => updateField('gender', value)}
  className="flex gap-3"
  required
>
  <Radio value="M">Masculino</Radio>
  <Radio value="F">Femenino</Radio>
</RadioGroup>
```

### Progress Indicator
```typescript
<Progress 
  value={(currentSection / totalSections) * 100}
  className="w-full mb-6"
  aria-label={`Progreso: ${currentSection} de ${totalSections} secciones`}
/>
```

## Form State Management
```typescript
interface SurveyFormData {
  // Demographics
  name: string;
  gender: 'M' | 'F' | '';
  residential_address: string;
  email?: string;
  postal_address?: string;
  birth_date: string;
  age_range: string;
  phone: string;
  electoral_number?: string;
  
  // Additional sections...
}

const [formData, setFormData] = useState<SurveyFormData>({});
const [currentSection, setCurrentSection] = useState(1);
const [errors, setErrors] = useState<Record<string, string>>({});
```

## Validation Requirements
### Field Validation Rules
- **Name**: 2-100 characters, required
- **Email**: Valid email format, optional
- **Phone**: Format 787-555-1234, required
- **Date**: Valid date format, required
- **Required fields**: Clear * indicators
- **Real-time validation**: Show errors as user types

### Spanish Error Messages
```typescript
const errorMessages = {
  required: 'Este campo es obligatorio',
  email: 'Correo electrónico inválido',
  phone: 'Formato: 787-555-1234',
  minLength: 'Mínimo {min} caracteres',
  maxLength: 'Máximo {max} caracteres'
};
```

## Performance Requirements
- Form renders in < 500ms
- Section navigation < 200ms
- Smooth scrolling animations
- Minimal re-renders during typing
- Efficient form state management

## Dependencies
- Survey questions from database (Story 2.1)
- UX wireframes and design specifications (Story 2.3)
- Untitled UI components configured (Story 1.3)
- Authentication system (Story 1.4)

## Blockers/Risks
- Complex conditional question logic
- Mobile keyboard interface issues
- Form performance with 31 questions
- Touch interaction edge cases

## Testing Checklist
### Mobile Device Testing
- [ ] iPhone (Safari, Chrome)
- [ ] Android (Chrome, Samsung Internet)
- [ ] Tablet responsiveness
- [ ] Landscape/portrait orientation
- [ ] Touch interactions work smoothly

### Form Functionality Testing
- [ ] All question types render correctly
- [ ] Validation triggers appropriately
- [ ] Navigation preserves form data
- [ ] Submit process works end-to-end
- [ ] Error states display properly
- [ ] Loading states show during submission

### Accessibility Testing
- [ ] Screen reader navigation
- [ ] Keyboard navigation
- [ ] Focus indicators visible
- [ ] ARIA labels present
- [ ] Color contrast sufficient
- [ ] Touch targets large enough

## Resources
- Untitled UI React documentation
- UX Designer wireframes
- Survey questions database structure
- Mobile form best practices
- Spanish language style guide