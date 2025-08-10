# TESTING_GUIDE.md
# Guía Completa de Testing - Plataforma de Consulta Electoral PPD

## 📋 Resumen de la Suite de Testing

La **Plataforma de Consulta Electoral PPD** implementa una suite de testing completa que cubre desde pruebas unitarias hasta tests de seguridad avanzados. Esta guía consolidada te ayudará a entender, ejecutar y contribuir con tests efectivos para el proyecto.

## 🧪 Filosofía de Testing

### Principios Fundamentales
- **🎯 Testing centrado en el usuario**: Probamos comportamientos, no implementaciones
- **🔒 Seguridad primero**: Tests exhaustivos de RLS policies y ataques de seguridad
- **📱 Mobile-first**: Pruebas específicas para dispositivos móviles y touch interactions
- **🌐 Spanish UX**: Validación de mensajes y contenido en español
- **♿ Accesibilidad**: Compliance con WCAG 2.1 AA standards

### Cobertura Actual vs. Objetivos

| Métrica | Actual | Objetivo | Estado |
|---------|--------|----------|---------|
| **Statements** | 27.69% | 80% | 🔴 Crítico |
| **Branches** | 23.8% | 75% | 🔴 Crítico |
| **Functions** | 32% | 80% | 🔴 Crítico |
| **Lines** | 27.67% | 80% | 🔴 Crítico |

## 🛠️ Stack de Testing

### Herramientas y Frameworks
- **Jest 30+**: Test runner principal con soporte para ES modules
- **React Testing Library 16+**: Testing de componentes con enfoque user-centric
- **@testing-library/user-event 14+**: Simulación realista de interacciones
- **@testing-library/jest-dom**: Matchers adicionales para DOM testing
- **jsdom**: Entorno de navegador simulado
- **TypeScript**: Tipos seguros en todos los tests

### Configuración Especializada
- **moduleNameMapper**: Soporte para alias `@/` paths
- **setupFilesAfterEnv**: Configuración global y mocks
- **testEnvironment**: jsdom para testing de React components
- **collectCoverageFrom**: Exclusión inteligente de archivos no testables

## 📊 Tipos de Testing y Estructura

### 1. Tests Unitarios 🔬

#### Componentes UI (`src/components/ui/__tests__/`)
```typescript
// Ejemplo: button.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../button'

describe('Button Component', () => {
  it('renders with correct variant styling', () => {
    render(<Button variant="primary">Primary Button</Button>)
    
    const button = screen.getByRole('button', { name: /primary button/i })
    expect(button).toHaveClass('bg-primary-600', 'text-white')
  })

  it('handles loading state correctly', async () => {
    render(<Button loading>Loading Button</Button>)
    
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByText(/cargando/i)).toBeInTheDocument()
  })
})
```

**Cobertura Actual**: Button (87.5%), Input (100%), otros (0%)

#### Componentes de Autenticación (`src/components/auth/__tests__/`)
```typescript
// Ejemplo: login-form.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '../login-form'

describe('LoginForm Component', () => {
  it('displays Spanish error messages for invalid credentials', async () => {
    render(<LoginForm />)
    
    await userEvent.type(screen.getByLabelText(/email/i), 'invalid@test.com')
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'wrongpass')
    await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/credenciales incorrectas/i)).toBeInTheDocument()
    })
  })
})
```

**Cobertura Actual**: LoginForm (88.09%), otros componentes auth (0%)

#### Hooks Personalizados (`src/hooks/__tests__/`)
```typescript
// Ejemplo: use-auth.test.tsx
import { renderHook, waitFor } from '@testing-library/react'
import { useAuth, AuthProvider } from '../use-auth'

describe('useAuth Hook', () => {
  it('manages authentication state correctly', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    })

    expect(result.current.user).toBeNull()
    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
  })
})
```

**Cobertura Actual**: useAuth (98.8% - 🟢 Excelente)

### 2. Tests de Integración 🔗

#### Flujos de Autenticación (`src/__tests__/integration/`)
```typescript
// Ejemplo: authentication-flow-comprehensive.test.tsx
describe('Complete Authentication Flow', () => {
  it('allows admin login and redirects to admin dashboard', async () => {
    render(
      <AuthProvider>
        <Router>
          <App />
        </Router>
      </AuthProvider>
    )

    // Navigate to login
    await userEvent.click(screen.getByText(/iniciar sesión/i))

    // Fill login form
    await userEvent.type(screen.getByLabelText(/email/i), 'admin@ppd.pr')
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))

    // Verify redirect
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/admin')
    })
  })
})
```

#### Protección de Rutas (`src/__tests__/integration/protected-routes.test.tsx`)
```typescript
describe('Role-based Route Access', () => {
  it('prevents unauthorized access to admin routes', () => {
    const hasAccess = canAccessRoute('/admin', 'volunteer')
    expect(hasAccess).toBe(false)
  })

  it('allows analysts to access analytics but not user management', () => {
    expect(canAccessRoute('/analytics', 'analyst')).toBe(true)
    expect(canAccessRoute('/users', 'analyst')).toBe(false)
  })
})
```

### 3. Tests de Base de Datos y Seguridad 🛡️

#### Tests de RLS (Row Level Security)
```typescript
// Ejemplo: database-rls.test.ts
describe('Database RLS Policies', () => {
  it('enforces tenant isolation for survey data', async () => {
    // User from Tenant A tries to access Tenant B data
    const userAClient = createUserClient('tenant-a-user')
    const { data, error } = await userAClient
      .from('survey_responses')
      .select('*')
      .eq('tenant_id', 'tenant-b')

    expect(data).toHaveLength(0) // Should return empty
    expect(error).toBeNull() // No error, just empty results
  })

  it('redacts personal data for analyst role', async () => {
    const analystClient = createUserClient('analyst-user', 'analyst')
    const { data } = await analystClient
      .from('survey_responses')
      .select('*')
      .limit(1)

    // Personal fields should be redacted
    expect(data[0].voter_name).toBe('[REDACTADO]')
    expect(data[0].phone_number).toBe('[REDACTADO]')
  })
})
```

#### Tests de Ataques de Seguridad
```typescript
// Ejemplo: rls-security-attacks.test.ts
describe('Security Attack Prevention', () => {
  it('prevents SQL injection in survey queries', async () => {
    const maliciousInput = "'; DROP TABLE survey_responses; --"
    
    const { error } = await userClient
      .from('survey_responses')
      .select('*')
      .eq('voter_name', maliciousInput)

    // Should not cause database error or data loss
    expect(error).toBeNull()
    
    // Verify table still exists
    const { data } = await serviceClient
      .from('survey_responses')
      .select('count')
      .limit(1)
    
    expect(data).toBeDefined()
  })
})
```

## 🚀 Comandos de Testing

### Comandos Básicos
```bash
# Ejecutar todos los tests
npm test

# Tests en modo observación (desarrollo)
npm run test:watch

# Tests con reporte de cobertura
npm run test:coverage

# Tests para CI/CD
npm run test:ci

# Debug de tests con Node inspector
npm run test:debug
```

### Tests Específicos por Categoría
```bash
# Tests de componentes únicamente
npm test -- --testPathPatterns="components"

# Tests de hooks únicamente
npm test -- --testPathPatterns="hooks"

# Tests de integración
npm test -- --testPathPatterns="integration"

# Tests de base de datos (requiere SUPABASE_SERVICE_ROLE_KEY)
npm run test:db

# Tests de RLS policies
npm run test:rls

# Tests de seguridad y ataques
npm run test:security
```

### Tests Específicos por Archivo
```bash
# Test de un componente específico
npm test button.test.tsx

# Test de autenticación
npm test -- --testNamePattern="useAuth"

# Test con verbose output
npm test -- --verbose --testPathPatterns="login-form"
```

## 🔧 Configuración de Testing

### Variables de Entorno para Testing
```bash
# Requeridas para tests básicos
NEXT_PUBLIC_SUPABASE_URL=https://trkaoeexbzclyxulghyr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Requeridas para tests de base de datos
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Opcionales para debugging
VERBOSE_TESTS=false         # Output detallado
PERFORMANCE_TESTS=false     # Mediciones de performance
TEST_SKIP_DATABASE_TESTS=false  # Forzar skip de DB tests
```

### Jest Configuration Highlights
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.*'
  ],
  coverageThreshold: {
    global: {
      statements: 50,
      branches: 50,
      functions: 50,
      lines: 50
    }
  }
}
```

## 🛠️ Utilidades de Testing

### Custom Render con Providers
```typescript
// src/__tests__/utils/render.tsx
import { render as rtlRender } from '@testing-library/react'
import { AuthProvider } from '@/hooks/use-auth'

export function render(ui: ReactElement, options = {}) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider>
      {children}
    </AuthProvider>
  )

  return rtlRender(ui, { wrapper: Wrapper, ...options })
}
```

### Mock de Supabase Client
```typescript
// src/__tests__/utils/mocks.ts
export const mockSupabaseClient = {
  auth: {
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(),
    getSession: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn()
  }))
}
```

### Datos de Testing
```typescript
// src/__tests__/utils/test-data.ts
export const testUsers = {
  admin: {
    id: 'admin-id-123',
    email: 'admin@ppd.pr',
    profile: {
      full_name: 'Administrador Test',
      role: 'admin',
      tenant_id: 'test-tenant-123'
    }
  },
  volunteer: {
    id: 'volunteer-id-456',
    email: 'volunteer@ppd.pr',
    profile: {
      full_name: 'Voluntario Test',
      role: 'volunteer',
      tenant_id: 'test-tenant-123'
    }
  }
}
```

## 📱 Testing Móvil y Accesibilidad

### Tests de Touch Interactions
```typescript
describe('Mobile Touch Interactions', () => {
  it('handles touch events on buttons', async () => {
    render(<Button onTouchStart={handleTouch}>Touch Button</Button>)
    
    const button = screen.getByRole('button')
    fireEvent.touchStart(button)
    
    expect(handleTouch).toHaveBeenCalled()
  })

  it('ensures minimum touch target size', () => {
    render(<Button size="sm">Small Button</Button>)
    
    const button = screen.getByRole('button')
    const styles = window.getComputedStyle(button)
    
    expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(44)
    expect(parseInt(styles.minWidth)).toBeGreaterThanOrEqual(44)
  })
})
```

### Tests de Accesibilidad
```typescript
describe('Accessibility Compliance', () => {
  it('provides proper ARIA labels for form fields', () => {
    render(<LoginForm />)
    
    const emailField = screen.getByLabelText(/correo electrónico/i)
    const passwordField = screen.getByLabelText(/contraseña/i)
    
    expect(emailField).toHaveAttribute('aria-required', 'true')
    expect(passwordField).toHaveAttribute('aria-required', 'true')
  })

  it('announces form errors to screen readers', async () => {
    render(<LoginForm />)
    
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })
    await userEvent.click(submitButton)
    
    const errorMessage = screen.getByRole('alert')
    expect(errorMessage).toHaveTextContent(/campo obligatorio/i)
  })
})
```

## 🌍 Testing de Internacionalización

### Validación de Contenido en Español
```typescript
describe('Spanish Content Validation', () => {
  it('displays all UI text in Spanish', () => {
    render(<LoginForm />)
    
    expect(screen.getByText(/iniciar sesión/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument()
  })

  it('shows Spanish error messages', async () => {
    render(<LoginForm />)
    
    // Simulate invalid login
    await simulateFailedLogin()
    
    await waitFor(() => {
      expect(screen.getByText(/credenciales incorrectas/i)).toBeInTheDocument()
    })
  })
})
```

## 📈 Métricas y Reporting

### Coverage Reports
```bash
# Generar reporte HTML de cobertura
npm run test:coverage

# Ver reporte en navegador
npx serve coverage/lcov-report
```

### CI/CD Integration
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:ci
      - uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

## 🐛 Debugging y Troubleshooting

### Debug Mode
```bash
# Ejecutar tests en modo debug
npm run test:debug

# Conectar con Chrome DevTools
# chrome://inspect/#devices
```

### Common Issues y Soluciones

#### 1. "ReferenceError: Request is not defined"
```bash
# Solución: Actualizar configuración de Jest para Next.js
# Verificar jest.config.js tiene correct testEnvironment
```

#### 2. "Database tests skipped"
```bash
# Esperado si SUPABASE_SERVICE_ROLE_KEY no está configurado
# Agregar la clave service_role para tests completos de DB
```

#### 3. "Module not found: @/"
```bash
# Verificar moduleNameMapper en jest.config.js
# Asegurar que tsconfig.json paths coincidan
```

#### 4. "Tests timeout"
```bash
# Incrementar timeout para tests asíncronos
jest.setTimeout(30000)

# O específico por test
it('async test', async () => {
  // test code
}, 30000)
```

### Verbose Testing
```bash
# Output detallado para debugging
VERBOSE_TESTS=true npm test

# Tests con stack traces completos
npm test -- --verbose --no-coverage
```

## ✅ Checklist de Testing para Nuevas Features

### Pre-Development
- [ ] **Diseñar tests primero** (TDD approach)
- [ ] **Identificar casos edge** y escenarios de error
- [ ] **Planificar mocks** necesarios
- [ ] **Considerar accesibilidad** desde el inicio

### Durante Development
- [ ] **Tests unitarios** para cada componente
- [ ] **Tests de integración** para flujos completos
- [ ] **Verificar cobertura** de nuevos archivos
- [ ] **Probar en dispositivos móviles** (responsive)

### Pre-Commit
- [ ] **Todos los tests pasan**: `npm test`
- [ ] **Cobertura mantiene threshold**: `npm run test:coverage`
- [ ] **Linting limpio**: `npm run lint`
- [ ] **TypeScript sin errores**: `npm run typecheck`

### Post-Deploy
- [ ] **Tests de regresión** pasan en producción
- [ ] **Performance** no degradada
- [ ] **Accessibility** compliance mantenido
- [ ] **Logs de error** monitoreados

## 🎯 Roadmap de Testing

### Próximos Objetivos (Sprint 2)

#### Cobertura
- [ ] **Statements**: 27% → 60%
- [ ] **Branches**: 24% → 50%
- [ ] **Functions**: 32% → 60%
- [ ] **Lines**: 28% → 60%

#### Nuevos Tests
- [ ] **Survey Form Components**: Formularios dinámicos
- [ ] **Validation Logic**: Server-side y client-side
- [ ] **Error Boundaries**: Manejo de errores React
- [ ] **Performance Tests**: Render time y memory usage

### Futuras Mejoras (Sprint 3+)
- [ ] **Visual Regression Testing**: Screenshot comparisons
- [ ] **E2E Testing**: Playwright integration
- [ ] **API Testing**: Backend endpoint validation
- [ ] **Load Testing**: Concurrent user simulation

## 📚 Recursos de Aprendizaje

### Documentación Oficial
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

### Patrones y Mejores Prácticas
- **Arrange, Act, Assert**: Estructura clara de tests
- **Given, When, Then**: BDD approach para integration tests
- **User-centric queries**: screen.getByRole, getByText vs getByTestId
- **Async testing**: waitFor, findBy vs getBy

### Testing de Accesibilidad
- [axe-core integration](https://github.com/nickcolley/jest-axe)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)

---

**Guía mantenida por**: 📊 Project Manager  
**Última actualización**: Enero 2025  
**Versión**: 1.0.0  
**Estado**: Sprint 1 Foundation Complete - Ready for Sprint 2 Testing Expansion