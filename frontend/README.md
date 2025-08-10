# Plataforma de Consulta Electoral PPD - Frontend

> 🗳️ **Aplicación web de inteligencia de campaña para el Partido Popular Democrático (PPD) de Puerto Rico**

Una plataforma moderna y segura para recopilar datos de sentimientos de votantes, gestionar operaciones de campo, y proporcionar análisis en tiempo real para campañas políticas.

## 🎯 Propósito del Proyecto

La **Plataforma de Consulta Electoral PPD** permite a voluntarios de campo recopilar datos de encuestas de manera eficiente a través de dispositivos móviles, mientras que gerentes y analistas pueden acceder a dashboards en tiempo real para tomar decisiones informadas de campaña.

### Características Principales
- 📱 **Formularios móviles optimizados** para recolección en campo
- 🔐 **Autenticación robusta** con control de acceso basado en roles  
- 📊 **Analytics en tiempo real** con visualizaciones geográficas
- 🏢 **Arquitectura multi-tenant** para múltiples organizaciones
- 📤 **Exportación segura** de datos con redacción basada en roles
- 🌐 **Interfaz completamente en español** (Puerto Rico)

## 🚀 Stack Tecnológico

- **Framework**: Next.js 15 con App Router
- **Lenguaje**: TypeScript
- **Styling**: Tailwind CSS 4.0 con design tokens personalizados
- **Componentes**: Headless UI + componentes personalizados
- **Base de Datos**: Supabase (PostgreSQL con PostGIS)
- **Autenticación**: Supabase Auth con JWT y SSR
- **Testing**: Jest + React Testing Library
- **Íconos**: Heroicons + Lucide React
- **Desarrollo**: ESLint, Prettier, Turbopack

## 🏗️ Estructura del Proyecto

```
frontend/
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── (auth)/login/        # Páginas de autenticación
│   │   ├── (dashboard)/         # Dashboard protegido
│   │   ├── survey/[id]/         # Formularios de encuesta
│   │   ├── layout.tsx           # Layout principal
│   │   └── page.tsx             # Página de inicio
│   ├── components/
│   │   ├── ui/                  # Componentes base UI
│   │   │   ├── button.tsx       # Botones con variantes
│   │   │   ├── input.tsx        # Campos de entrada
│   │   │   ├── radio-group.tsx  # Grupos de radio buttons
│   │   │   ├── checkbox-group.tsx # Grupos de checkboxes
│   │   │   ├── card.tsx         # Componente de tarjetas
│   │   │   └── textarea.tsx     # Áreas de texto
│   │   ├── forms/               # Componentes de formularios
│   │   ├── dashboard/           # Componentes del dashboard
│   │   └── layout/              # Componentes de layout
│   │       ├── header.tsx       # Header con navegación
│   │       └── container.tsx    # Container responsivo
│   ├── lib/
│   │   ├── supabase/            # Configuración de Supabase
│   │   │   ├── client.ts        # Cliente para componentes
│   │   │   ├── server.ts        # Cliente para servidor
│   │   │   └── middleware.ts    # Middleware de auth
│   │   └── utils/
│   │       └── cx.ts            # Utilidad de clases CSS
│   ├── hooks/                   # Hooks personalizados
│   ├── types/
│   │   ├── database.ts          # Tipos de base de datos
│   │   └── survey.ts            # Tipos de encuestas
│   └── stories/                 # Storybook (futuro)
├── public/                      # Assets estáticos
├── middleware.ts                # Middleware de Next.js
└── tailwind.config.ts           # Configuración de Tailwind
```

## 🛠️ Configuración de Desarrollo

### Prerrequisitos
- Node.js 18+ (recomendado 20+ para Storybook futuro)
- npm o yarn
- Cuenta de Supabase

### Instalación
```bash
cd frontend
npm install
```

### Variables de Entorno
Crear `.env.local`:
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://trkaoeexbzclyxulghyr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aquí

# App Configuration
NEXT_PUBLIC_APP_NAME="Consulta Electoral PPD"
NEXT_PUBLIC_DEFAULT_LOCALE="es"
NODE_ENV=development
```

### Scripts Disponibles

```bash
# Desarrollo con Turbopack
npm run dev

# Construcción para producción
npm run build

# Iniciar servidor de producción
npm start

# Linting
npm run lint
npm run lint:fix

# Formateo de código
npm run format
npm run format:check

# Verificación de tipos
npm run typecheck
```

## 📱 Características Móviles

### Optimizaciones para Campo
- **Touch Targets**: Mínimo 44px para botones
- **Viewport**: Configuración óptima para móviles
- **Typography**: Escalado responsivo
- **Forms**: Validación en tiempo real, teclados optimizados

### Accesibilidad
- **WCAG 2.1 AA**: Cumplimiento de estándares
- **Screen Readers**: ARIA labels y semántica
- **Keyboard Navigation**: Navegación completa por teclado
- **High Contrast**: Soporte para alto contraste

## 🌐 Internacionalización

### Español (Puerto Rico)
- **Locale**: `es-PR`
- **Labels**: Terminología política específica
- **Dates/Numbers**: Formato local
- **Direction**: LTR (Left-to-Right)

## 🔐 Autenticación y Seguridad

### Supabase Auth
- **SSR**: Autenticación server-side
- **Middleware**: Protección de rutas
- **Cookies**: Gestión segura de sesiones

### Roles de Usuario
- **admin**: Acceso completo
- **manager**: Gestión de equipos
- **analyst**: Análisis de datos
- **volunteer**: Recolección de encuestas

## ⚡ Inicio Rápido

```bash
# 1. Clonar e instalar
git clone [URL_DEL_REPOSITORIO]
cd candidate_polling/frontend
npm install

# 2. Configurar entorno
cp .env.local.example .env.local
# Editar .env.local con tus claves de Supabase

# 3. Ejecutar tests para verificar configuración
npm test -- --testPathPatterns="connection-test"

# 4. Iniciar servidor de desarrollo
npm run dev
```

🌐 **Aplicación disponible en**: http://localhost:3000

## 📚 Documentación Completa

| Documento | Descripción |
|-----------|-------------|
| [PROJECT_SETUP.md](./PROJECT_SETUP.md) | 📋 **Configuración completa del proyecto** - Guía paso a paso |
| [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) | 🔧 **Configuración del entorno** - Variables y credenciales |
| [TEST_SETUP.md](./TEST_SETUP.md) | 🧪 **Guía completa de testing** - Tests unitarios e integración |
| [AUTHENTICATION.md](./AUTHENTICATION.md) | 🔐 **Sistema de autenticación** - Roles y permisos |
| [TESTING_GUIDE.md](./TESTING_GUIDE.md) | 🎯 **Guía de testing consolidada** - Todas las categorías |
| [SPRINT_1_COMPLETION_REPORT.md](./SPRINT_1_COMPLETION_REPORT.md) | 📋 **Reporte de Sprint 1** - Estado y lecciones aprendidas |

## 🎭 Roles de Usuario

| Rol | Descripción | Permisos | Redirect |
|-----|-------------|----------|----------|
| **Administrador** | Acceso completo al sistema | Todo | `/admin` |
| **Gerente** | Gestión operacional | Usuarios, encuestas, reportes | `/dashboard` |
| **Analista** | Solo lectura y análisis | Datos redactados, exportación | `/analytics` |
| **Voluntario** | Recolección de encuestas | Solo encuestas asignadas | `/survey` |

## 🧪 Testing

```bash
# Tests rápidos
npm test                           # Todos los tests
npm run test:watch                 # Modo observación
npm run test:coverage              # Con cobertura

# Tests específicos
npm test -- --testPathPatterns="components"  # Solo componentes
npm run test:db                    # Tests de base de datos (requiere service_role)
npm run test:security              # Tests de seguridad
```

### Estado Actual de Cobertura
- **Statements**: 27.69% → 🎯 Objetivo: 80%
- **Branches**: 23.8% → 🎯 Objetivo: 75%  
- **Functions**: 32% → 🎯 Objetivo: 80%
- **Lines**: 27.67% → 🎯 Objetivo: 80%

## 🛠️ Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | 🚀 Servidor de desarrollo con Turbopack |
| `npm run build` | 🏗️ Construcción para producción |
| `npm start` | ▶️ Servidor de producción |
| `npm run lint` | 🧹 Linting con auto-corrección |
| `npm run format` | 💅 Formateo con Prettier |
| `npm run typecheck` | ✅ Verificación de tipos TypeScript |

## 📁 Estructura del Proyecto

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/login/       # 🔐 Páginas de autenticación
│   ├── (dashboard)/        # 📊 Dashboard protegido
│   ├── api/auth/           # 🔌 API routes de autenticación
│   └── survey/[id]/        # 📝 Formularios de encuesta dinámicos
├── components/
│   ├── ui/                 # 🎨 Componentes base (Button, Input, etc.)
│   ├── auth/               # 🔐 Componentes de autenticación
│   ├── forms/              # 📝 Componentes de formularios
│   └── layout/             # 🏗️ Componentes de layout
├── hooks/                  # 🪝 Hooks personalizados (useAuth)
├── lib/                    # 🔧 Utilidades y configuraciones
│   ├── supabase/           # 🗄️ Clientes de Supabase
│   ├── auth/               # 🔐 Lógica de autenticación
│   └── utils/              # 🛠️ Utilidades generales
└── __tests__/              # 🧪 Test suite completo
    ├── integration/        # 🔗 Tests de integración
    ├── setup/              # ⚙️ Configuración de tests
    └── utils/              # 🛠️ Utilidades de testing
```

## 🔐 Seguridad y Autenticación

### Características de Seguridad
- ✅ **JWT tokens** con renovación automática
- ✅ **Row Level Security (RLS)** en Supabase
- ✅ **Aislamiento multi-tenant** a nivel de base de datos
- ✅ **Control de acceso basado en roles** (RBAC)
- ✅ **Redacción de datos** para roles de menor privilegio
- ✅ **Protección contra ataques SQL injection**

### Cuentas de Prueba (Solo Desarrollo)
```bash
# Administrador
Usuario: admin@ppd.pr
Contraseña: password123

# Voluntario
Usuario: volunteer@ppd.pr
Contraseña: password123
```

## 🌍 Internacionalización

- **Idioma**: Español (Puerto Rico) - `es-PR`
- **Terminología**: Política específica de Puerto Rico
- **Formatos**: Fechas y números en formato local
- **Accesibilidad**: WCAG 2.1 AA compliance

## 📱 Optimizaciones Móviles

- ✅ **Mobile-first design** con Tailwind CSS
- ✅ **Touch targets** de mínimo 44px
- ✅ **Formularios optimizados** para dispositivos móviles
- ✅ **Teclados específicos** por tipo de campo
- ✅ **Validación en tiempo real** para UX mejorada

## 🔄 Estado del Desarrollo

### ✅ Sprint 1 - Foundation Setup (COMPLETADO)
- **Arquitectura de Base de Datos**: Tablas, relaciones, RLS policies
- **Sistema de Autenticación**: Login/logout, protección de rutas, roles
- **Framework Next.js**: App Router, componentes UI, Tailwind CSS
- **Suite de Testing**: Jest, React Testing Library, tests de seguridad

### 🚧 Sprint 2 - Survey Data Collection (EN PROGRESO)
- **Formularios Dinámicos**: Basados en survey_questions.json
- **Recolección Móvil**: Optimización para voluntarios de campo
- **Validación de Datos**: Server-side y client-side
- **Gestión de Estados**: Formularios complejos y navegación

### 🔮 Próximos Sprints
- **Sprint 3**: Data Analytics & Visualizations
- **Sprint 4**: User Management & Advanced Features

## 🤝 Contribución

### Guidelines para Contribuir
1. **Fork** el repositorio
2. **Crea una rama** para tu feature: `git checkout -b feature/nueva-funcionalidad`
3. **Commit** tus cambios: `git commit -m 'Agregar nueva funcionalidad'`
4. **Push** a la rama: `git push origin feature/nueva-funcionalidad`
5. **Abre un Pull Request**

### Estándares de Código
- ✅ **TypeScript estricto**: Todos los archivos deben ser .tsx/.ts
- ✅ **ESLint + Prettier**: Configuración automática
- ✅ **Tests requeridos**: Para nuevas funcionalidades
- ✅ **Documentación**: Comentarios en español para lógica compleja

## 📞 Soporte

### Recursos de Ayuda
- 📧 **Email**: support@ppd.pr
- 📚 **Documentación**: Ver archivos .md en el directorio raíz
- 🐛 **Issues**: Crear issue en el repositorio de GitHub
- 💬 **Discord/Slack**: [Enlace al workspace del equipo]

### Enlaces Útiles
- [🔗 Supabase Dashboard](https://app.supabase.com/project/trkaoeexbzclyxulghyr)
- [🔗 Next.js Documentation](https://nextjs.org/docs)
- [🔗 Tailwind CSS](https://tailwindcss.com/docs)
- [🔗 React Testing Library](https://testing-library.com/docs/react-testing-library/intro)

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver el archivo [LICENSE](../LICENSE) para más detalles.

---

**Estado**: ✅ Sprint 1 Completado - Listo para Sprint 2  
**Última actualización**: Enero 2025  
**Versión**: 1.0.0