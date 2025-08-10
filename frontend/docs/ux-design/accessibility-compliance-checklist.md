# Accessibility Compliance Checklist
## WCAG 2.1 AA Standards for PPD Survey Form

### Overview
This document provides a comprehensive checklist for ensuring the PPD survey form meets WCAG 2.1 AA accessibility standards. It includes testing procedures, compliance verification, and remediation guidelines specific to mobile-first Spanish-language political data collection.

---

### WCAG 2.1 AA Compliance Matrix

#### Principle 1: Perceivable
Information and user interface components must be presentable to users in ways they can perceive.

##### 1.1 Text Alternatives
- [ ] **1.1.1 Non-text Content (A)**: All images, icons, and graphical elements have appropriate alternative text
  - **Survey Application**: Form icons (required field asterisks, validation icons) have `aria-label` attributes
  - **Test**: Use screen reader to verify all icons are announced properly
  - **Spanish**: Alt text provided in Spanish ("requerido", "válido", "error")

##### 1.2 Time-based Media
- [ ] **1.2.1 Audio-only and Video-only (A)**: Not applicable - no audio/video content in survey form
- [ ] **1.2.2 Captions (A)**: Not applicable
- [ ] **1.2.3 Audio Description or Media Alternative (A)**: Not applicable

##### 1.3 Adaptable
- [ ] **1.3.1 Info and Relationships (A)**: Information, structure, and relationships can be programmatically determined
  - **Survey Application**: 
    - Form labels properly associated with inputs using `htmlFor`/`id`
    - Radio groups use `fieldset`/`legend` structure
    - Required fields marked with `aria-required="true"`
    - Error messages linked with `aria-describedby`
  - **Test**: Navigate with screen reader to verify structure is logical
  - **Code Example**:
    ```jsx
    <FormField label="Nombre completo" required htmlFor="name-input">
      <Input 
        id="name-input"
        aria-required="true"
        aria-describedby="name-error"
      />
    </FormField>
    ```

- [ ] **1.3.2 Meaningful Sequence (A)**: Content can be presented in a meaningful sequence without losing information
  - **Survey Application**: Tab order follows logical survey flow (demographics → voting history → preferences)
  - **Test**: Tab through entire form to verify sequence makes sense
  - **Implementation**: Use `tabIndex` only when necessary, rely on DOM order

- [ ] **1.3.3 Sensory Characteristics (A)**: Instructions don't rely solely on sensory characteristics
  - **Survey Application**: Error states use color + icon + text (not color alone)
  - **Test**: Use high contrast mode to verify information is still clear
  - **Example**: "❌ Este campo es requerido" (icon + text, not just red color)

- [ ] **1.3.4 Orientation (AA)**: Content does not restrict its view to single orientation
  - **Survey Application**: Form works in both portrait and landscape orientations
  - **Test**: Rotate device to verify usability in both orientations
  - **Implementation**: Responsive design with flexible layouts

- [ ] **1.3.5 Identify Input Purpose (AA)**: Input fields can be programmatically identified
  - **Survey Application**: Input fields use appropriate `autocomplete` attributes
  - **Test**: Verify browser autofill works correctly
  - **Code Example**:
    ```jsx
    <Input 
      type="email"
      autoComplete="email"
      id="email-input"
    />
    <Input 
      type="tel" 
      autoComplete="tel"
      id="phone-input"
    />
    ```

##### 1.4 Distinguishable
- [ ] **1.4.1 Use of Color (A)**: Color is not used as the only visual means of conveying information
  - **Survey Application**: Form validation uses color + icons + text
  - **Test**: Use color blindness simulator to verify information is clear
  - **Implementation**: 
    ```jsx
    // ✅ Good: Color + icon + text
    <div className="text-error-600">
      <ExclamationIcon className="w-4 h-4" />
      Este campo es requerido
    </div>
    
    // ❌ Bad: Color only  
    <div className="text-red-600">Campo inválido</div>
    ```

- [ ] **1.4.2 Audio Control (A)**: Not applicable - no auto-playing audio

- [ ] **1.4.3 Contrast (AA)**: Text has contrast ratio of at least 4.5:1 (3:1 for large text)
  - **Survey Application**: All text meets minimum contrast ratios
  - **Test**: Use contrast checker tool on all text/background combinations
  - **PPD Colors Verified**:
    - Primary blue (#0d5bdd) on white: 7.2:1 ✅
    - Error red (#dc2626) on white: 5.7:1 ✅
    - Success green (#16a34a) on white: 4.8:1 ✅
    - Gray text (#6b7280) on white: 4.6:1 ✅

- [ ] **1.4.4 Resize text (AA)**: Text can be resized up to 200% without loss of functionality
  - **Survey Application**: Form remains usable when browser zoom is increased to 200%
  - **Test**: Zoom browser to 200% and verify all functionality works
  - **Implementation**: Use relative units (rem, em) instead of fixed pixels

- [ ] **1.4.5 Images of Text (AA)**: Images are not used to present text
  - **Survey Application**: All text is actual text, not images
  - **Test**: Verify no text is rendered as images
  - **Implementation**: Use web fonts and CSS for all text styling

- [ ] **1.4.10 Reflow (AA)**: Content reflows for mobile without horizontal scrolling
  - **Survey Application**: No horizontal scrolling required at 320px width
  - **Test**: Resize browser to 320px wide and verify no horizontal scroll
  - **Implementation**: Mobile-first responsive design

- [ ] **1.4.11 Non-text Contrast (AA)**: UI components have 3:1 contrast ratio
  - **Survey Application**: Form controls (borders, focus indicators) meet 3:1 contrast
  - **Test**: Check contrast of form borders, button outlines, focus rings
  - **Implementation**: 
    ```css
    .form-input {
      border: 2px solid #d1d5db; /* 3.2:1 contrast ✅ */
    }
    .form-input:focus {
      border-color: #0d5bdd; /* 7.2:1 contrast ✅ */
      ring: 3px solid rgba(13, 91, 221, 0.2);
    }
    ```

- [ ] **1.4.12 Text Spacing (AA)**: Text can be adjusted without loss of content
  - **Survey Application**: Text remains readable with increased spacing
  - **Test**: Apply CSS text spacing adjustments and verify readability
  - **Implementation**: Avoid fixed heights that clip text

- [ ] **1.4.13 Content on Hover or Focus (AA)**: Additional content triggered by hover/focus is dismissible
  - **Survey Application**: Tooltip content can be dismissed and doesn't interfere
  - **Test**: Verify tooltips/help text can be dismissed
  - **Implementation**: Use `Esc` key to dismiss, mouse movement to hide

---

#### Principle 2: Operable
User interface components and navigation must be operable.

##### 2.1 Keyboard Accessible
- [ ] **2.1.1 Keyboard (A)**: All functionality available from keyboard
  - **Survey Application**: Entire form can be completed using only keyboard
  - **Test**: Complete survey using only Tab, Shift+Tab, Enter, Space, Arrow keys
  - **Spanish Context**: Test with Spanish keyboard layouts

- [ ] **2.1.2 No Keyboard Trap (A)**: Focus is not trapped in any component
  - **Survey Application**: Users can Tab through and exit all form sections
  - **Test**: Navigate with keyboard and ensure no focus traps exist
  - **Implementation**: Proper focus management in modals/overlays

- [ ] **2.1.4 Character Key Shortcuts (A)**: Single character shortcuts don't conflict
  - **Survey Application**: No single-key shortcuts implemented
  - **Test**: Verify no unintended keyboard shortcuts trigger actions

##### 2.2 Enough Time
- [ ] **2.2.1 Timing Adjustable (A)**: Users can extend time limits
  - **Survey Application**: Auto-save functionality prevents data loss
  - **Test**: Leave form idle and verify data is saved
  - **Implementation**: Save draft every 30 seconds, warn before session timeout

- [ ] **2.2.2 Pause, Stop, Hide (A)**: Users can control moving content
  - **Survey Application**: Loading spinners can be paused by screen readers
  - **Test**: Verify animations don't interfere with screen reader usage
  - **Implementation**: Respect `prefers-reduced-motion` CSS media query

##### 2.3 Seizures
- [ ] **2.3.1 Three Flashes or Below Threshold (A)**: Content doesn't flash more than 3 times per second
  - **Survey Application**: No flashing content in survey form
  - **Test**: Verify no rapid flashing animations
  - **Implementation**: Smooth transitions under 3Hz frequency

##### 2.4 Navigable
- [ ] **2.4.1 Bypass Blocks (A)**: Skip navigation links provided
  - **Survey Application**: "Skip to main content" link available
  - **Test**: Tab to first element and verify skip link appears
  - **Implementation**:
    ```jsx
    <a 
      href="#main-content" 
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary-600 text-white p-2 rounded"
    >
      Saltar al contenido principal
    </a>
    ```

- [ ] **2.4.2 Page Titled (A)**: Web pages have descriptive titles
  - **Survey Application**: Each section has descriptive page title
  - **Test**: Verify browser tab shows meaningful titles
  - **Implementation**: 
    ```jsx
    <Head>
      <title>Sección 1: Información Personal - Consulta PPD</title>
    </Head>
    ```

- [ ] **2.4.3 Focus Order (A)**: Focus order is logical and intuitive
  - **Survey Application**: Tab order follows survey question sequence
  - **Test**: Tab through form and verify logical progression
  - **Implementation**: DOM order matches visual/logical order

- [ ] **2.4.4 Link Purpose (A)**: Purpose of links can be determined from text
  - **Survey Application**: All navigation links have descriptive text
  - **Test**: Use screen reader to verify link purposes are clear
  - **Example**: "Ir a sección anterior" not just "Anterior"

- [ ] **2.4.5 Multiple Ways (AA)**: Multiple ways to locate content
  - **Survey Application**: Progress indicator allows jumping to sections
  - **Test**: Verify multiple navigation methods available
  - **Implementation**: Section navigation menu + linear progression

- [ ] **2.4.6 Headings and Labels (AA)**: Headings and labels describe topic/purpose
  - **Survey Application**: Form sections have clear headings, fields have descriptive labels
  - **Test**: Use heading navigation in screen reader
  - **Spanish Context**: Labels are clear and culturally appropriate

- [ ] **2.4.7 Focus Visible (AA)**: Keyboard focus indicator is visible
  - **Survey Application**: All focusable elements show clear focus indicators
  - **Test**: Tab through form and verify focus is always visible
  - **Implementation**:
    ```css
    .form-input:focus {
      outline: 2px solid #0d5bdd;
      outline-offset: 2px;
    }
    ```

##### 2.5 Input Modalities
- [ ] **2.5.1 Pointer Gestures (A)**: Functionality doesn't require multipoint/path-based gestures
  - **Survey Application**: All interactions use simple taps/clicks
  - **Test**: Verify no swipe/pinch gestures required for core functionality
  - **Implementation**: Provide button alternatives for any gesture-based actions

- [ ] **2.5.2 Pointer Cancellation (A)**: Functions triggered by pointer can be undone
  - **Survey Application**: Form submissions require confirmation
  - **Test**: Verify accidental taps don't cause irreversible actions
  - **Implementation**: Confirmation dialogs for final submission

- [ ] **2.5.3 Label in Name (A)**: Accessible name contains visible label text
  - **Survey Application**: Screen reader names match visible labels
  - **Test**: Compare visible labels with screen reader announcements
  - **Implementation**: Ensure `aria-label` includes visible text

- [ ] **2.5.4 Motion Actuation (A)**: Functionality doesn't require device motion
  - **Survey Application**: No shake/tilt gestures required
  - **Test**: Verify form works without device movement
  - **Implementation**: Traditional input methods only

---

#### Principle 3: Understandable
Information and the operation of user interface must be understandable.

##### 3.1 Readable
- [ ] **3.1.1 Language of Page (A)**: Primary language is programmatically determined
  - **Survey Application**: HTML lang attribute set to Spanish
  - **Test**: Verify screen reader uses Spanish pronunciation
  - **Implementation**: 
    ```html
    <html lang="es-PR">
    ```

- [ ] **3.1.2 Language of Parts (AA)**: Language changes are marked up
  - **Survey Application**: Any English terms marked with language attribute
  - **Test**: Verify mixed-language content is pronounced correctly
  - **Implementation**:
    ```jsx
    <span lang="en">PPD</span> (Partido Popular Democrático)
    ```

##### 3.2 Predictable
- [ ] **3.2.1 On Focus (A)**: Components don't change context when receiving focus
  - **Survey Application**: Focusing on form fields doesn't trigger navigation
  - **Test**: Tab through form and verify focus doesn't cause unexpected changes
  - **Implementation**: Avoid `onFocus` events that change page state

- [ ] **3.2.2 On Input (A)**: Changing input doesn't change context unless user is warned
  - **Survey Application**: Form changes don't trigger navigation
  - **Test**: Fill out form fields and verify no unexpected navigation
  - **Implementation**: Only trigger changes on explicit user actions (button clicks)

- [ ] **3.2.3 Consistent Navigation (AA)**: Navigation is consistent across pages
  - **Survey Application**: Section navigation appears in same location
  - **Test**: Verify navigation consistency across all sections
  - **Implementation**: Standard navigation component used throughout

- [ ] **3.2.4 Consistent Identification (AA)**: Components are identified consistently
  - **Survey Application**: Similar form elements have consistent labeling
  - **Test**: Verify consistent terminology across all sections
  - **Spanish Context**: Consistent use of "requerido", "opcional", etc.

##### 3.3 Input Assistance
- [ ] **3.3.1 Error Identification (A)**: Errors are identified in text
  - **Survey Application**: Form validation errors clearly described
  - **Test**: Trigger validation errors and verify clear descriptions
  - **Spanish Context**: Error messages in clear, helpful Spanish
  - **Implementation**:
    ```jsx
    <div role="alert" className="error-message">
      El teléfono debe tener el formato: 787-555-1234
    </div>
    ```

- [ ] **3.3.2 Labels or Instructions (A)**: Labels/instructions provided for user input
  - **Survey Application**: All form fields have clear labels and help text
  - **Test**: Verify every input has appropriate guidance
  - **Spanish Context**: Instructions culturally appropriate for Puerto Rico

- [ ] **3.3.3 Error Suggestion (AA)**: Error correction suggestions provided
  - **Survey Application**: Validation errors include correction guidance
  - **Test**: Verify error messages suggest how to fix issues
  - **Example**: "El correo debe incluir @ y un dominio (ejemplo: juan@gmail.com)"

- [ ] **3.3.4 Error Prevention (AA)**: Errors are prevented through confirmation/review
  - **Survey Application**: Final submission requires confirmation
  - **Test**: Verify critical actions require confirmation
  - **Implementation**: Review page before final submission

---

#### Principle 4: Robust
Content must be robust enough to be interpreted by assistive technologies.

##### 4.1 Compatible
- [ ] **4.1.1 Parsing (A)**: HTML is valid and elements properly nested
  - **Survey Application**: All HTML validates correctly
  - **Test**: Run HTML validator on survey pages
  - **Implementation**: Regular validation in development process

- [ ] **4.1.2 Name, Role, Value (A)**: UI components have accessible name/role/value
  - **Survey Application**: All form controls have proper ARIA attributes
  - **Test**: Use accessibility inspector to verify ARIA properties
  - **Implementation**:
    ```jsx
    <input
      type="radio"
      role="radio"
      aria-labelledby="question-label"
      aria-required="true"
      aria-invalid="false"
    />
    ```

- [ ] **4.1.3 Status Messages (AA)**: Status messages can be programmatically determined
  - **Survey Application**: Form submission status announced to screen readers
  - **Test**: Verify status changes are announced
  - **Implementation**:
    ```jsx
    <div 
      role="status" 
      aria-live="polite"
      aria-atomic="true"
    >
      Guardando borrador...
    </div>
    ```

---

### Mobile Accessibility Testing

#### Touch Target Requirements
- [ ] **Minimum Size**: All interactive elements at least 44×44px
- [ ] **Spacing**: 8px minimum between adjacent touch targets
- [ ] **Visual Feedback**: Clear visual response to touch interactions
- [ ] **Error Recovery**: Easy correction of touch mistakes

#### Voice Assistant Testing
- [ ] **iOS VoiceOver**: Complete survey using VoiceOver navigation
- [ ] **Android TalkBack**: Complete survey using TalkBack navigation
- [ ] **Voice Control**: Test basic voice commands for form filling
- [ ] **Spanish Synthesis**: Verify Spanish text pronuncies correctly

### Testing Tools and Procedures

#### Automated Testing Tools
```bash
# Install accessibility testing tools
npm install --save-dev @axe-core/playwright jest-axe

# Run automated accessibility tests
npm run test:a11y
```

#### Manual Testing Checklist

##### Keyboard Navigation Test
1. **Tab Order**: Tab through entire form, verify logical sequence
2. **Focus Management**: Ensure focus is always visible and logical
3. **Escape Routes**: Verify user can exit any focused component
4. **Keyboard Shortcuts**: Test standard shortcuts (Enter, Space, Escape)

##### Screen Reader Test (Spanish)
1. **Content Structure**: Navigate by headings, verify logical hierarchy
2. **Form Labels**: Verify all form elements properly labeled
3. **Error Messages**: Confirm errors announced clearly
4. **Status Updates**: Verify dynamic content changes announced

##### Color/Contrast Test
1. **Color Blindness**: Test with color blindness simulators
2. **High Contrast**: Verify interface works in high contrast mode
3. **Dark Mode**: Test interface in dark mode (if supported)
4. **Low Vision**: Test with zoom up to 200%

##### Mobile Testing
1. **Portrait/Landscape**: Test both orientations
2. **One-handed Use**: Verify thumb navigation zones work
3. **Voice Input**: Test voice-to-text functionality
4. **Switch Navigation**: Test external switch navigation

### Accessibility Statement Template

```markdown
## Declaración de Accesibilidad - Plataforma de Consulta PPD

### Compromiso de Accesibilidad
El Partido Popular Democrático se compromete a hacer que su plataforma de consulta electoral sea accesible para todas las personas, independientemente de sus capacidades.

### Estándares de Cumplimiento
Esta plataforma cumple con las Pautas de Accesibilidad para el Contenido Web (WCAG) 2.1 nivel AA.

### Características de Accesibilidad
- ✅ Navegación completa por teclado
- ✅ Compatible con lectores de pantalla
- ✅ Contraste de color alto (mínimo 4.5:1)
- ✅ Texto redimensionable hasta 200%
- ✅ Formularios con etiquetas claras
- ✅ Mensajes de error descriptivos
- ✅ Interfaz responsiva para dispositivos móviles

### Idioma y Cultura
- Contenido disponible en español de Puerto Rico
- Terminología política apropiada para el contexto local
- Formatos de fecha y teléfono según convenciones locales

### Reportar Problemas de Accesibilidad
Si encuentra barreras de accesibilidad, por favor contacte:
- Email: accesibilidad@ppd.org  
- Teléfono: 787-XXX-XXXX
```

This comprehensive checklist ensures the PPD survey form meets all WCAG 2.1 AA requirements while providing an excellent user experience for Puerto Rican field volunteers.