# Authentication System Implementation

## Overview

Comprehensive Supabase Auth integration with JWT tokens, role-based access control, and multi-tenant support for the Candidate Polling Platform PPD project.

## Architecture

### Core Components

1. **Authentication Context** (`/src/hooks/use-auth.tsx`)
   - Centralized auth state management
   - User profile integration with custom users table
   - Session persistence and auto-refresh

2. **Server Actions** (`/src/lib/auth/actions.ts`)
   - Server-side authentication handling
   - Role-based redirections
   - Secure session management

3. **Permission System** (`/src/lib/auth/permissions.ts`)
   - Role-based access control (RBAC)
   - Route-level permissions
   - Data redaction rules

4. **Middleware** (`/src/lib/supabase/middleware.ts`)
   - Automatic session refresh
   - Route protection
   - Role-based routing

5. **API Routes** (`/src/app/api/auth/`)
   - Login/logout endpoints
   - Session management
   - User profile retrieval

## User Roles & Permissions

### Admin (Administrador)
- **Full system access**
- User management and tenant administration
- All data access without redaction
- **Default redirect**: `/admin`

### Manager (Gerente)
- **Operational management**
- User assignment and walklist management
- Full survey data access
- **Default redirect**: `/dashboard`

### Analyst (Analista)
- **Read-only access** to survey data and analytics
- Data export with personal info redaction
- **Default redirect**: `/analytics`

### Volunteer (Voluntario)
- **Limited access** to assigned surveys only
- Survey submission capabilities
- **Default redirect**: `/survey`

## Route Protection

### Protected Routes
```typescript
/dashboard  -> Admin, Manager, Analyst
/admin      -> Admin only
/analytics  -> Admin, Manager, Analyst
/survey     -> Admin, Manager, Volunteer
/reports    -> Admin, Manager, Analyst
/users      -> Admin only
/walklists  -> Admin, Manager
```

### Middleware Features
- Automatic session refresh
- Role-based route access
- Redirect to appropriate dashboard based on role
- Unauthorized page for access violations

## Authentication Flow

### Login Process
1. User submits email/password via LoginForm
2. Authenticate with Supabase Auth
3. Verify user exists in custom `users` table
4. Check user is active (`is_active = true`)
5. Update `last_login_at` timestamp
6. Redirect to role-appropriate dashboard

### Session Management
- JWT tokens stored in secure HTTP-only cookies
- Automatic token refresh via middleware
- Session persistence across browser sessions
- Graceful handling of expired sessions

### Logout Process
- Clear Supabase auth session
- Remove all auth cookies
- Redirect to login page

## Components

### Authentication Components
- `LoginForm`: Interactive login with Spanish UI
- `LogoutButton`: Logout with loading states
- `UserProfile`: User info display with dropdown
- `ProtectedRoute`: Route protection wrapper
- `RoleGuard`: Conditional content rendering

### Usage Examples

```tsx
// Protected page
import { ProtectedRoute } from '@/components/auth/protected-route'

export default function AdminPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminContent />
    </ProtectedRoute>
  )
}

// Role-based content
import { RoleGuard } from '@/components/auth/protected-route'

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <RoleGuard role={['admin', 'manager']}>
        <AdminFeatures />
      </RoleGuard>
    </div>
  )
}

// Using auth hook
import { useAuth } from '@/hooks/use-auth'

function MyComponent() {
  const { user, profile, hasRole, signOut } = useAuth()
  
  if (hasRole('admin')) {
    return <AdminView />
  }
  
  return <RegularView />
}
```

## Database Integration

### Users Table Schema
```sql
users (
  id: UUID (references auth.users.id)
  tenant_id: UUID (references tenants.id)
  email: TEXT
  full_name: TEXT
  role: user_role ('admin', 'manager', 'analyst', 'volunteer')
  is_active: BOOLEAN
  last_login_at: TIMESTAMP
  metadata: JSONB
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
)
```

### RLS Policies
- Users can only access their own tenant data
- Role-based data filtering implemented
- Secure multi-tenant isolation

## Security Features

### Data Protection
- Personal data redaction for analysts and volunteers
- Tenant isolation enforced at database level
- SQL injection protection via parameterized queries

### Session Security
- JWT tokens with automatic refresh
- Secure HTTP-only cookies
- CSRF protection via SameSite cookies

### Error Handling
- User-friendly Spanish error messages
- Graceful degradation for network issues
- Comprehensive logging for debugging

## Spanish UI Messages

### Login Messages
- "Iniciar Sesión" - Login
- "Correo Electrónico" - Email
- "Contraseña" - Password
- "Recordarme" - Remember Me
- "Cerrar Sesión" - Logout

### Error Messages
- "Credenciales incorrectas. Verifica tu email y contraseña."
- "Usuario no encontrado o inactivo. Contacta al administrador."
- "Demasiados intentos. Espera unos minutos antes de intentar nuevamente."

### Role Names
- "Administrador" - Admin
- "Gerente" - Manager
- "Analista" - Analyst
- "Voluntario" - Volunteer

## Testing

### Test User Accounts (Development Only)
```
Admin: admin@ppd.pr / password123
Volunteer: volunteer@ppd.pr / password123
```

### Testing Checklist
- [ ] Login with valid credentials
- [ ] Login with invalid credentials shows error
- [ ] Role-based routing works correctly
- [ ] Protected routes redirect to login
- [ ] Logout clears session properly
- [ ] Session persists across browser refresh
- [ ] Mobile-responsive login form

## API Endpoints

### POST /api/auth/login
```json
Request: { "email": "user@example.com", "password": "password" }
Response: { "success": true, "user": { "id": "...", "profile": {...} } }
```

### POST /api/auth/logout
```json
Response: { "success": true, "message": "Sesión cerrada exitosamente" }
```

### GET /api/auth/me
```json
Response: {
  "success": true,
  "user": {
    "id": "...",
    "email": "...",
    "profile": { "full_name": "...", "role": "...", ... }
  }
}
```

### POST /api/auth/refresh
```json
Response: {
  "success": true,
  "session": { "access_token": "...", "expires_in": 3600 }
}
```

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://trkaoeexbzclyxulghyr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NODE_ENV=development
```

## Error Handling

### Client-Side Errors
- Network connectivity issues
- Invalid credentials
- Expired sessions
- Permission denied

### Server-Side Errors
- Database connection issues
- Invalid JWT tokens
- Role validation failures
- Tenant access violations

## Performance Considerations

### Optimizations
- Server-side session validation
- Automatic token refresh
- Minimal API calls
- Efficient role checking

### Caching
- User profile caching in auth context
- Permission checking optimization
- Route-level caching for static content

## Next Steps

### Sprint 2 Integration
- Connect authentication with survey collection system
- Implement volunteer assignment workflows
- Add real-time notifications for role changes

### Future Enhancements
- Multi-factor authentication (MFA)
- Password reset functionality
- User registration workflow
- Audit logging for security compliance

## Support

For technical issues or questions about the authentication system:
- Email: support@ppd.pr
- Documentation: This file and inline code comments
- Testing: Use development server at http://localhost:3001