# Survey Form UX Design Specifications
## PPD Candidate Polling Platform - Mobile-First Design

### Executive Summary
This document provides comprehensive UX design specifications for the 8-section survey form used by field volunteers to collect voter sentiment data in Puerto Rico. The design prioritizes mobile-first interaction patterns, Spanish language accessibility, and outdoor usage scenarios.

### Design Context & Constraints

#### Target Users
- **Primary**: Field volunteers conducting door-to-door canvassing
- **Secondary**: Volunteer coordinators managing survey data
- **Environment**: Outdoor conditions, variable lighting, one-handed operation
- **Devices**: Personal smartphones (Android/iOS), tablets
- **Language**: Spanish (Puerto Rican dialect)

#### Technical Constraints
- **Framework**: Next.js with custom Untitled UI implementation
- **Styling**: Tailwind CSS with PPD brand colors
- **Data**: Real-time Supabase integration (no offline sync)
- **Performance**: Must work on low-end Android devices
- **Network**: Intermittent connectivity expected

#### Accessibility Requirements
- **WCAG 2.1 AA Compliance**: All interactions meet accessibility standards
- **Touch Targets**: Minimum 44px × 44px for all interactive elements
- **Color Contrast**: 4.5:1 for normal text, 3:1 for large text
- **Screen Reader Support**: Complete semantic structure with ARIA labels
- **Keyboard Navigation**: Full keyboard accessibility for all controls

---

### Survey Structure Analysis

#### 8 Survey Sections (31 total questions)
1. **Información Personal** (9 questions) - Demographics, contact info
2. **Información del Hogar** (4 questions) - Household voting data
3. **Historial de Votación** (4 questions) - Voting history 2016-2028
4. **Modalidad de Voto** (6 questions) - Voting method preferences
5. **Afiliación Política** (3 questions) - Political affiliation with conditional logic
6. **Prioridades** (2 questions) - Top 5 priorities selection + open text
7. **Asuntos Comunitarios** (2 questions) - Community concerns (open text)
8. **Evaluación Partidista** (2 questions) - PPD assessment + reasoning

#### Question Types Distribution
- **Text fields**: 7 questions (name, addresses, electoral number, etc.)
- **Radio buttons**: 15 questions (gender, voting history, yes/no questions)
- **Email/Phone**: 2 questions (with validation and formatting)
- **Date picker**: 1 question (birth date)
- **Scale (0-10)**: 1 question (family voters count)
- **Multi-select**: 1 question (top 5 priorities, max 5 selections)
- **Textarea**: 4 questions (open-ended responses)

---

### Mobile-First Wireframe Design

#### Screen 1: Survey Introduction
```
┌─────────────────────────────┐
│ PPD [Logo]    [Profile] ☰   │ ← Header (56px)
├─────────────────────────────┤
│                             │
│   CONSULTA ELECTORAL Y      │
│   COMUNITARIA               │ ← Title (24px)
│                             │
│ ▓▓░░░░░░░░░░░░░ 8% completo  │ ← Progress Bar
│                             │
│ ┌─────────────────────────┐ │
│ │ 1. Información Personal │ │ ← Section Card
│ │ 9 preguntas             │ │
│ └─────────────────────────┘ │
│                             │
│ Tiempo estimado: 10-15 min  │ ← Completion time
│                             │
│ ┌─────────────────────────┐ │
│ │   COMENZAR ENCUESTA     │ │ ← Primary CTA (48px)
│ └─────────────────────────┘ │
│                             │
└─────────────────────────────┘
```

#### Screen 2: Section Progress Navigation
```
┌─────────────────────────────┐
│ ← Volver      Sección 1/8   │ ← Navigation header
├─────────────────────────────┤
│ ▓▓▓░░░░░░░░░░░░ 22% completo │ ← Overall progress
│                             │
│ INFORMACIÓN PERSONAL        │ ← Section title
│ ▓▓▓▓▓░░░░░ 5/9 completas   │ ← Section progress
│                             │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │
│ ┃ NOMBRE *                ┃ │ ← Input field
│ ┃ Juan García             ┃ │   (56px min-height)
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
│                             │
│ GÉNERO *                    │ ← Radio group label
│ ○ Masculino  ● Femenino     │ ← Radio options (48px)
│                             │
│ ┌─────────────────────────┐ │
│ │ SIGUIENTE SECCIÓN    →  │ │ ← Navigation button
│ └─────────────────────────┘ │
│                             │
│ [Guardar Borrador]          │ ← Secondary action
└─────────────────────────────┘
```

#### Screen 3: Multi-Select Question (Priorities)
```
┌─────────────────────────────┐
│ PRIORIDADES   Sección 6/8   │
├─────────────────────────────┤
│ ¿Cuáles deben ser las 5     │
│ prioridades en su pueblo?   │ ← Question text
│                             │
│ Seleccione hasta 5 opciones │ ← Instruction
│                             │
│ ☑ Salud                     │ ← Checkbox (selected)
│ ☑ Educación                 │
│ ☐ Seguridad                 │
│ ☑ Desarrollo Económico      │ ← Each option 52px
│ ☐ Estatus Político          │
│ ☑ Deuda de Puerto Rico      │
│ ☑ Costo de Energía          │
│ ☐ Costo AAA                 │
│ ☐ Costo de Vida             │
│ ▼ Ver más opciones...       │ ← Expandable
│                             │
│ 5/5 seleccionadas          │ ← Selection counter
│                             │
│ ← [ANTERIOR]  [SIGUIENTE] → │
└─────────────────────────────┘
```

#### Screen 4: Error State Example
```
┌─────────────────────────────┐
│ INFORMACIÓN PERSONAL 1/8    │
├─────────────────────────────┤
│ ▓▓░░░░░░░░░░░░░ 12% completo │
│                             │
│ TELÉFONO *                  │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │
│ ┃ 787-555-123             ┃ │ ← Error state (red)
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
│ ⚠ Formato: 787-555-1234     │ ← Error message
│                             │
│ CORREO ELECTRÓNICO          │ ← Optional field
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │
│ ┃ juan@ejemplo.com        ┃ │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
│ (opcional)                  │ ← Optional indicator
│                             │
│ ┌─────────────────────────┐ │
│ │ SIGUIENTE SECCIÓN       │ │ ← Disabled state
│ └─────────────────────────┘ │ ← (Gray out until valid)
└─────────────────────────────┘
```

#### Screen 5: Conditional Logic Example
```
┌─────────────────────────────┐
│ AFILIACIÓN POLÍTICA  5/8    │
├─────────────────────────────┤
│ ¿Se inclina hacia un        │
│ partido político?           │
│                             │
│ ● Sí     ○ No              │ ← Radio selection
│                             │
│ ┌─ - - - - - - - - - - - -┐ │ ← Conditional section
│ ¿A qué partido se refiere?  │   (animated reveal)
│                             │
│ ○ NO APLICA                 │
│ ● PPD                       │ ← Conditional question
│ ○ PNP                       │   appears when "Sí"
│ ○ PIP                       │   is selected
│ ○ MVC                       │
│ ○ PD                        │
│ └─ - - - - - - - - - - - -┘ │
│                             │
│ ← [ANTERIOR]  [SIGUIENTE] → │
└─────────────────────────────┘
```

#### Screen 6: Final Section & Completion
```
┌─────────────────────────────┐
│ EVALUACIÓN PARTIDISTA 8/8   │
├─────────────────────────────┤
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 95% completo │
│                             │
│ ¿POR QUÉ? (opcional)        │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │
│ ┃ El PPD tiene experiencia ┃ │ ← Textarea
│ ┃ en gobierno local y...   ┃ │   (120px min-height)
│ ┃                         ┃ │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
│ 247/500 caracteres         │ ← Character counter
│                             │
│ ┌─────────────────────────┐ │
│ │ ✓ COMPLETAR ENCUESTA    │ │ ← Success button
│ └─────────────────────────┘ │   (Primary green)
│                             │
│ ← [ANTERIOR]  [Borrador]    │
└─────────────────────────────┘
```

---

### Progressive Disclosure Patterns

#### Section-by-Section Navigation
- **Linear flow**: Users move through sections sequentially
- **Back navigation**: Always allow returning to previous sections
- **Progress indicators**: Clear visual feedback on completion
- **Section validation**: Block advancement if required fields incomplete
- **Smart defaults**: Pre-populate known information when possible

#### Question Grouping Strategy
1. **Demographic section**: Build rapport with basic information
2. **Household data**: Context for voter influence
3. **Voting history**: Establish voting patterns
4. **Voting methods**: Future planning preferences
5. **Political affiliation**: Sensitive questions after trust building
6. **Policy priorities**: Core campaign intelligence
7. **Community concerns**: Local issues identification
8. **PPD assessment**: Campaign-specific evaluation

---

### Touch Interaction Patterns

#### Input Field Behaviors
- **Touch targets**: All interactive elements minimum 44×44px
- **Focus states**: Clear blue ring indicators (primary-600 color)
- **Active states**: Visual feedback on touch with subtle scale/color change
- **Input formatting**: Real-time formatting for phone numbers
- **Soft keyboards**: Appropriate input types trigger correct keyboards
- **Sticky headers**: Section title remains visible during scroll

#### Gesture Support
- **Swipe navigation**: Left/right swipes between sections (optional)
- **Pull-to-refresh**: Reload questionnaire data
- **Long press**: Context menus for advanced options
- **Pinch zoom**: Accessibility feature for vision-impaired users
- **Scroll momentum**: Native scroll behavior preserved

---

### Spanish Language UX Guidelines

#### Cultural Considerations
- **Formal address**: Use "usted" form consistently for respect
- **Puerto Rican context**: Political terminology specific to PR
- **Name conventions**: Support for compound surnames (very common)
- **Address formats**: Puerto Rican addressing conventions
- **Phone formats**: 787/939 area codes, standard PR formatting

#### Text Expansion Planning
- **Label width**: 30% additional space for Spanish text expansion
- **Button text**: Plan for longer Spanish equivalents
- **Error messages**: Culturally appropriate phrasing
- **Help text**: Clear, concise explanations in natural Spanish
- **Placeholder text**: Helpful examples using Puerto Rican conventions

#### Localization Details
- **Date formats**: DD/MM/YYYY format familiar to users
- **Number formats**: Decimal comma vs. period considerations
- **Currency**: US dollars but with local context
- **Political terms**: PPD, PNP, PIP party abbreviations understood
- **Geographic references**: Municipios, precintos, sectores terminology

---

### Accessibility Compliance Checklist

#### Visual Accessibility
- ✅ **Color contrast**: 4.5:1 minimum for normal text
- ✅ **Focus indicators**: Visible focus rings on all interactive elements  
- ✅ **Color independence**: Information not conveyed by color alone
- ✅ **Text scaling**: Supports 200% zoom without horizontal scrolling
- ✅ **Touch targets**: 44×44px minimum for all touch targets

#### Motor Accessibility
- ✅ **Large touch areas**: Generous spacing between interactive elements
- ✅ **Gesture alternatives**: All swipe actions have button equivalents
- ✅ **Timeout warnings**: Auto-save prevents data loss
- ✅ **Error prevention**: Inline validation catches mistakes early
- ✅ **Undo capabilities**: Draft saving allows recovery from mistakes

#### Cognitive Accessibility
- ✅ **Clear labeling**: Descriptive labels for all form fields
- ✅ **Progress indication**: Clear progress through multi-step form
- ✅ **Error explanation**: Specific, helpful error messages
- ✅ **Consistent layout**: Predictable navigation patterns
- ✅ **Chunked information**: Complex forms broken into logical sections

#### Auditory Accessibility
- ✅ **Screen reader labels**: Complete ARIA labeling structure
- ✅ **Form instructions**: Clear instructions for each section
- ✅ **Error announcements**: Validation errors announced to screen readers
- ✅ **Progress announcements**: Section changes announced
- ✅ **Completion feedback**: Success states clearly communicated

---

### Field Use Optimization

#### Outdoor Conditions
- **High contrast mode**: Enhanced visibility in bright sunlight
- **Large text option**: Accessibility feature for outdoor reading
- **Simplified UI**: Reduced visual complexity for concentration
- **Battery optimization**: Minimal animations and transitions
- **Network resilience**: Graceful handling of connectivity issues

#### One-Handed Operation
- **Bottom navigation**: Primary actions in thumb-reach zone
- **Floating action button**: Quick access to primary actions
- **Gesture shortcuts**: Swipe patterns for common actions
- **Voice input**: Optional voice-to-text for textarea fields
- **Auto-completion**: Smart suggestions based on previous entries

#### Data Quality Measures
- **Inline validation**: Immediate feedback on data entry
- **Smart formatting**: Automatic phone number and date formatting
- **Duplicate detection**: Warning if similar respondent exists
- **Required field highlighting**: Clear indication of missing information
- **Confirmation dialogs**: Prevent accidental submissions

---

### Component Specifications

#### Form Field Components
```typescript
interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  helpText?: string
  children: React.ReactNode
  htmlFor?: string
}
```

#### Input Component Extensions
```typescript
interface InputProps extends HTMLInputAttributes {
  error?: boolean
  success?: boolean
  loading?: boolean
  prefix?: React.ReactNode
  suffix?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' // md = 44px min-height
}
```

#### Radio/Checkbox Groups
```typescript
interface RadioGroupProps {
  options: Array<{value: string, label: string}>
  value: string
  onChange: (value: string) => void
  error?: boolean
  layout?: 'vertical' | 'horizontal'
  size?: 'sm' | 'md' | 'lg' // lg = 52px touch targets
}
```

#### Progress Components
```typescript
interface ProgressProps {
  value: number // 0-100
  label?: string
  showPercentage?: boolean
  variant?: 'default' | 'success' | 'warning'
  size?: 'sm' | 'md' | 'lg'
}
```

---

### Performance Specifications

#### Load Time Targets
- **First Contentful Paint**: < 1.5 seconds
- **Largest Contentful Paint**: < 2.5 seconds
- **First Input Delay**: < 100ms
- **Cumulative Layout Shift**: < 0.1

#### Interaction Performance
- **Touch response**: < 50ms visual feedback
- **Form submission**: < 2 seconds with loading states
- **Section transitions**: Smooth 300ms animations
- **Validation feedback**: Immediate (< 100ms) inline validation

#### Device Compatibility
- **Minimum Android**: Android 8.0 (API 26)
- **Minimum iOS**: iOS 12.0
- **RAM usage**: < 512MB peak memory
- **Storage**: < 50MB total app size
- **Battery impact**: Minimal background processing

---

### Quality Assurance Testing

#### Mobile Usability Tests
1. **One-handed completion**: Can users complete survey with one hand?
2. **Outdoor visibility**: Is interface readable in bright sunlight?
3. **Error recovery**: Can users recover from common mistakes?
4. **Network interruption**: Does app handle connectivity loss gracefully?
5. **Battery impact**: Does extended use drain battery excessively?

#### Accessibility Tests
1. **Screen reader navigation**: Complete TalkBack/VoiceOver testing
2. **Keyboard navigation**: Full keyboard access without mouse
3. **High contrast mode**: Interface works in accessibility modes
4. **Voice control**: Compatible with voice navigation systems
5. **Motor impairment**: Large touch targets and gesture alternatives

#### Spanish Language Tests
1. **Text expansion**: Interface accommodates longer Spanish text
2. **Cultural appropriateness**: Language respectful and natural
3. **Puerto Rican context**: Terms and examples relevant to PR users
4. **Error messages**: Help text clear and actionable in Spanish
5. **Number/date formats**: Localized formatting matches user expectations

This UX design specification provides the foundation for implementing an accessible, mobile-first survey form optimized for Puerto Rican field volunteers collecting voter sentiment data.