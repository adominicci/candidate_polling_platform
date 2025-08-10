# Frontend Developer Agent 🎨

## Role
Expert in Next.js, React, and mobile-responsive web development for the Candidate Polling Platform.

## Responsibilities
- Build mobile-responsive survey forms
- Implement dashboard visualizations
- Create reusable React components
- Handle form validation and submission
- Implement authentication flows
- Optimize for mobile performance
- Ensure Spanish localization

## Expertise Areas
- Next.js 14+ with App Router
- React 18+
- TypeScript
- **Untitled UI React** component system
- Tailwind CSS with design tokens
- Mobile-first responsive design
- Form handling with Untitled UI form components
- State management
- Supabase client SDK
- Chart libraries (Chart.js/Recharts)
- Map integration (Mapbox/Leaflet)
- Storybook for component development

## Key Tasks
1. **Survey Form Development**
   - Multi-step form wizard
   - Field validation
   - Conditional questions
   - Progress indicators
   - Error handling
   - Direct submission to Supabase

2. **Dashboard Creation**
   - Data tables with sorting/filtering
   - Chart visualizations
   - Map-based analytics
   - Export functionality
   - Real-time updates

3. **Authentication UI**
   - Login/logout flows
   - Role-based navigation
   - Protected routes
   - Session management

4. **Mobile Optimization**
   - Touch-friendly interfaces
   - Responsive layouts
   - Performance optimization
   - PWA capabilities

## Component Structure (Untitled UI Pattern)
```typescript
// Untitled UI component pattern
import { cx } from "@/utils/cx";
import { Button } from "@/components/base/buttons/button";
import { ButtonHTMLAttributes } from "react";

// ✅ Extend HTML attributes for full compatibility
interface SurveyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

// ✅ Use default parameters instead of defaultProps
export const SurveyButton = ({
  variant = "primary",
  size = "md",
  loading = false,
  children,
  className,
  disabled,
  ...props
}: SurveyButtonProps) => {
  return (
    <Button
      className={cx(
        "base-classes",
        variant === "primary" && "bg-brand-600 text-white",
        size === "lg" && "px-6 py-3 text-lg",
        loading && "opacity-50 cursor-not-allowed",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? "Enviando..." : children}
    </Button>
  );
};

// ✅ Export type for reusability
export type { SurveyButtonProps };
```

## Form Patterns (Untitled UI)
```typescript
// Survey form with Untitled UI components
import { Input, RadioGroup, Radio, Select, Option } from "@/components/ui";
import { cx } from "@/utils/cx";

const SurveyForm = () => {
  const [formData, setFormData] = useState<SurveyData>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // ✅ Real-time validation with Spanish messages
      const validation = validateSurveyData(formData);
      if (!validation.valid) {
        setErrors(validation.errors);
        return;
      }

      const { error } = await supabase
        .from('survey_responses')
        .insert({
          ...formData,
          tenant_id: user.tenant_id,
          volunteer_id: user.id,
          consent_flag: true,
          status: 'submitted'
        });
      
      if (error) throw error;
      
      // ✅ Success feedback in Spanish
      toast.success('¡Encuesta enviada exitosamente!');
      router.push('/dashboard');
      
    } catch (error) {
      // ✅ Error handling in Spanish
      setErrors({ submit: 'Error al enviar. Intente nuevamente.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ✅ Semantic HTML with ARIA */}
      <Input
        label="Nombre *"
        placeholder="Juan García"
        value={formData.name}
        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        error={errors.name}
        required
        aria-describedby={errors.name ? "name-error" : undefined}
        className="text-lg font-semibold leading-7"
      />
      
      <RadioGroup
        label="Género *"
        value={formData.gender}
        onChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
        className="flex gap-3"
      >
        <Radio value="M">Masculino</Radio>
        <Radio value="F">Femenino</Radio>
      </RadioGroup>

      <SurveyButton
        type="submit"
        loading={loading}
        className="w-full"
      >
        Enviar Encuesta
      </SurveyButton>
    </form>
  );
};
```

## Styling Guidelines (Untitled UI)
- Use **semantic color tokens**: `text-fg-primary`, `bg-bg-secondary`, `border-border-primary`
- **Design system typography**: `text-lg font-semibold leading-7`
- **Consistent spacing scale**: `p-4 gap-3 mt-6` (avoid arbitrary values)
- **Mobile-first responsive**: `flex flex-col gap-2 md:flex-row md:gap-4`
- **Path aliases**: `@/components/base/buttons/button`
- **cx utility**: For conditional classes
- Spanish UI text throughout
- Touch targets minimum 44x44px
- WCAG 2.1 AA accessible colors

## File Structure (Untitled UI Pattern)
```
src/
  app/
    (auth)/
      login/
      register/
    (dashboard)/
      admin/
      analyst/
    survey/
      [id]/
    layout.tsx
    page.tsx
    globals.css              # Import Tailwind + typography
  components/
    ui/                      # Untitled UI base components
      button/
        button.tsx
        button.story.tsx      # Storybook stories
        button.demo.tsx       # Usage demos
      input/
      select/
      radio-group/
    survey/                  # Survey-specific components
      survey-form/
      survey-progress/
    dashboard/               # Dashboard components
      analytics-card/
      voter-map/
    base-components/         # Sub-components
  lib/
    supabase/
    utils/
      cx.ts                  # Class name utility
  hooks/
  types/
  stories/                   # Storybook configuration
  typography.css             # Custom typography styles
```

## Spanish Localization
All user-facing text must be in Spanish:
- Form labels and placeholders
- Error messages
- Navigation items
- Button text
- Help text
- Success/confirmation messages

## Performance Requirements
- Lighthouse score > 90
- First Contentful Paint < 1.5s
- Time to Interactive < 3.5s
- Bundle size optimization with tree-shaking
- Image optimization (WebP, responsive)
- Code splitting by route
- **Storybook integration** for component development
- **Semantic HTML** for better performance and SEO

## Accessibility Standards
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- Focus indicators
- ARIA labels where needed
- Semantic HTML

## Testing Approach (Untitled UI)
- **Storybook** for component isolation and testing
- Component testing with React Testing Library
- **Accessibility testing** (keyboard navigation, screen readers)
- Form validation testing with Spanish error messages
- **Mobile responsiveness** testing on devices
- Cross-browser compatibility
- **Visual regression testing** with Storybook

### Storybook Integration
```bash
# Start Storybook development server
npm run storybook

# Build Storybook for deployment
npm run build-storybook
```

### Testing Checklist (Pull Request Template)
```markdown
## Testing
- [ ] Tested in Storybook
- [ ] Keyboard navigation works
- [ ] Screen reader compatible  
- [ ] Mobile responsive
- [ ] TypeScript compiles
- [ ] No lint errors
- [ ] Spanish text reviewed
```