# PROJECT_SETUP.md
# Configuración Completa del Proyecto - Plataforma de Consulta Electoral PPD

## 📑 Tabla de Contenido

1. [📋 Resumen del Proyecto](#📋-resumen-del-proyecto)
2. [🏗️ Arquitectura Técnica](#🏗️-arquitectura-técnica)  
3. [📋 Prerrequisitos del Sistema](#📋-prerrequisitos-del-sistema)
4. [🚀 Instalación Paso a Paso](#🚀-instalación-paso-a-paso)
5. [🧪 Configuración de Testing](#🧪-configuración-de-testing)
6. [🗄️ Configuración de Base de Datos](#🗄️-configuración-de-base-de-datos)
7. [🛠️ Scripts de Desarrollo Disponibles](#🛠️-scripts-de-desarrollo-disponibles)
8. [📁 Estructura del Proyecto](#📁-estructura-del-proyecto)
9. [🔐 Características de Seguridad](#🔐-características-de-seguridad)
10. [🌍 Configuración de Internacionalización](#🌍-configuración-de-internacionalización)
11. [📱 Optimizaciones Móviles](#📱-optimizaciones-móviles)
12. [🔧 Solución de Problemas Comunes](#🔧-solución-de-problemas-comunes)
13. [🚀 Flujo de Desarrollo](#🚀-flujo-de-desarrollo)
14. [🎯 Estado Actual del Desarrollo](#🎯-estado-actual-del-desarrollo)
15. [📊 Métricas de Calidad](#📊-métricas-de-calidad)
16. [📞 Soporte y Recursos](#📞-soporte-y-recursos)

## 📋 Resumen del Proyecto

La **Plataforma de Consulta Electoral PPD** es una aplicación web de inteligencia de campaña para el Partido Popular Democrático (PPD) en Puerto Rico. Esta plataforma permite recopilar datos de sentimientos de votantes, gestionar operaciones de campo, y proporcionar análisis para campañas políticas.

### Características Principales
- ✅ **Recolección de encuestas móviles** con formularios responsivos
- ✅ **Autenticación robusta** con control de acceso basado en roles
- ✅ **Arquitectura multi-tenant** con aislamiento seguro de datos
- ✅ **Analytics en tiempo real** con visualizaciones geográficas
- ✅ **Exportación de datos** con redacción basada en roles

## 🏗️ Arquitectura Técnica

### Stack Tecnológico
- **Frontend**: Next.js 15 con App Router + React 19
- **Styling**: Tailwind CSS 4.0 con design tokens personalizados
- **Backend**: Supabase (PostgreSQL con PostGIS)
- **Autenticación**: Supabase Auth con JWT y SSR
- **Componentes**: Headless UI + componentes personalizados
- **Testing**: Jest + React Testing Library
- **Deployment**: Vercel (frontend) + Supabase (backend)

### Detalles del Proyecto Supabase
- **Nombre del Proyecto**: candidate_polling
- **Project ID**: trkaoeexbzclyxulghyr
- **Organización**: Mi Solutions, LLC
- **Región**: us-east-1
- **Database Host**: db.trkaoeexbzclyxulghyr.supabase.co

## 📋 Prerrequisitos del Sistema

### Software Requerido
```bash
# Node.js (versión LTS recomendada)
node --version  # Debe ser >= 18.0.0
npm --version   # Debe ser >= 9.0.0

# Git para control de versiones
git --version

# Editor de código (recomendado VS Code)
code --version
```

### Cuentas y Accesos Necesarios
- **Cuenta de Supabase**: Acceso al proyecto trkaoeexbzclyxulghyr
- **Cuenta de GitHub**: Para clonar el repositorio
- **Cuenta de Vercel**: Para despliegue (opcional en desarrollo)

## 🚀 Instalación Paso a Paso

### 1. Clonar el Repositorio
```bash
# Clonar el repositorio
git clone [URL_DEL_REPOSITORIO]
cd candidate_polling/frontend

# Verificar la estructura del proyecto
ls -la
```

### 2. Instalar Dependencias
```bash
# Instalar dependencias de Node.js
npm install

# Verificar instalación
npm list --depth=0
```

### 3. Configuración del Entorno

#### 3.1 Crear Archivo de Variables de Entorno
```bash
# Copiar template de variables de entorno
cp .env.local.example .env.local
```

#### 3.2 Configurar Variables de Supabase
Editar `.env.local` con los siguientes valores:

```bash
# Configuración de Supabase (OBLIGATORIO)
NEXT_PUBLIC_SUPABASE_URL=https://trkaoeexbzclyxulghyr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[obtener-del-dashboard-supabase]
SUPABASE_SERVICE_ROLE_KEY=[obtener-del-dashboard-supabase]

# Configuración de la aplicación
NEXT_PUBLIC_APP_NAME="Consulta Electoral PPD"
NEXT_PUBLIC_DEFAULT_LOCALE="es"
NODE_ENV=development
```

#### 3.3 Obtener Claves de Supabase
1. **Ir al Dashboard de Supabase**: https://app.supabase.com/project/trkaoeexbzclyxulghyr
2. **Navegar a**: Settings → API
3. **Copiar las claves**:
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **ADVERTENCIA DE SEGURIDAD**: 
- La clave **anon** es segura para uso en el cliente
- La clave **service_role** tiene acceso completo a la base de datos y debe mantenerse secreta
- Nunca confirmes la clave service_role al control de versiones

## 🧪 Configuración de Testing

### Niveles de Testing Disponibles

#### 1. **Tests Unitarios** (Siempre disponibles)
```bash
npm test                    # Ejecutar todos los tests
npm run test:watch          # Modo de observación
npm run test:coverage       # Con reporte de cobertura
```

#### 2. **Tests de Integración** (Requiere anon key)
```bash
npm test -- --testPathPatterns="integration"
```

#### 3. **Tests de Base de Datos** (Requiere service_role key)
```bash
npm run test:db            # Tests de RLS
npm run test:rls           # Tests de políticas RLS
npm run test:security      # Tests de ataques de seguridad
```

### Verificación de Configuración
```bash
# Test básico de conexión
npm test -- --testPathPatterns="connection-test"

# Verificar configuración completa
npm run test:coverage
```

## 🗄️ Configuración de Base de Datos

### Esquema de Base de Datos Principal

```sql
-- Tablas principales ya configuradas en Supabase
tenants              -- Soporte multi-organización
users                -- Gestión de usuarios con roles
precincts            -- Límites geográficos con PostGIS
walklists            -- Gestión de asignaciones para voluntarios
questionnaires       -- Plantillas de encuestas con versionado
sections             -- Secciones de cuestionarios
questions            -- Preguntas individuales con varios tipos
survey_responses     -- Respuestas recopiladas
answers              -- Respuestas individuales a preguntas
```

### Roles de Usuario y Permisos

| Rol | Descripción | Acceso por Defecto |
|-----|-------------|-------------------|
| **admin** | Acceso completo al sistema | `/admin` |
| **manager** | Gestión operacional | `/dashboard` |
| **analyst** | Acceso de solo lectura | `/analytics` |
| **volunteer** | Acceso limitado a encuestas | `/survey` |

### Políticas RLS (Row Level Security)
- **Aislamiento de tenants**: Los usuarios solo pueden acceder a los datos de su organización
- **Control basado en roles**: Diferentes niveles de acceso según el rol
- **Redacción de datos**: Información personal restringida para analistas

## 🛠️ Scripts de Desarrollo Disponibles

```bash
# Desarrollo
npm run dev              # Servidor de desarrollo con Turbopack
npm run build            # Construcción para producción
npm start                # Servidor de producción

# Calidad de código
npm run lint             # Linting con ESLint
npm run lint:fix         # Auto-corrección de problemas de linting
npm run format           # Formateo con Prettier
npm run format:check     # Verificar formateo
npm run typecheck        # Verificación de tipos TypeScript

# Testing
npm test                 # Todos los tests
npm run test:watch       # Tests en modo observación
npm run test:coverage    # Tests con cobertura
npm run test:ci          # Tests para CI/CD
npm run test:debug       # Debug de tests

# Testing específico de base de datos
npm run test:db          # Tests de base de datos
npm run test:rls         # Tests de políticas RLS
npm run test:security    # Tests de seguridad
```

## 📁 Estructura del Proyecto

```
frontend/
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── (auth)/login/        # Páginas de autenticación
│   │   ├── (dashboard)/         # Dashboard protegido
│   │   ├── api/auth/            # API routes de autenticación
│   │   ├── survey/[id]/         # Formularios de encuesta
│   │   ├── unauthorized/        # Página de acceso denegado
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
│   │   ├── auth/                # Componentes de autenticación
│   │   ├── forms/               # Componentes de formularios
│   │   ├── dashboard/           # Componentes del dashboard
│   │   └── layout/              # Componentes de layout
│   ├── hooks/                   # Hooks personalizados
│   │   └── use-auth.tsx         # Hook de autenticación
│   ├── lib/
│   │   ├── supabase/            # Configuración de Supabase
│   │   ├── auth/                # Lógica de autenticación
│   │   └── utils/               # Utilidades generales
│   ├── types/
│   │   ├── database.ts          # Tipos de base de datos
│   │   └── survey.ts            # Tipos de encuestas
│   ├── __tests__/               # Tests
│   │   ├── integration/         # Tests de integración
│   │   ├── setup/               # Configuración de tests
│   │   └── utils/               # Utilidades de testing
│   └── stories/                 # Storybook (futuro)
├── public/                      # Assets estáticos
├── coverage/                    # Reportes de cobertura
├── docs/                        # Documentación adicional
├── middleware.ts                # Middleware de Next.js
├── jest.config.js               # Configuración de Jest
├── tailwind.config.ts           # Configuración de Tailwind
├── next.config.ts               # Configuración de Next.js
├── package.json                 # Dependencias y scripts
├── README.md                    # Documentación principal
├── ENVIRONMENT_SETUP.md         # Guía de configuración
├── TEST_SETUP.md                # Documentación de tests
├── AUTHENTICATION.md            # Documentación de autenticación
└── PROJECT_SETUP.md             # Este archivo
```

## 🔐 Características de Seguridad

### Autenticación y Autorización
- **JWT tokens** con renovación automática
- **Cookies HTTP-only** para almacenamiento seguro de sesiones
- **Middleware de Next.js** para protección de rutas
- **Control de acceso basado en roles** (RBAC)

### Protección de Datos
- **Redacción de datos** para analistas y voluntarios
- **Aislamiento multi-tenant** a nivel de base de datos
- **Políticas RLS** para prevenir acceso no autorizado
- **Validación del lado del servidor** para todas las entradas

## 🌍 Configuración de Internacionalización

### Español (Puerto Rico)
- **Locale**: `es-PR`
- **Terminología**: Política específica de Puerto Rico
- **Formatos**: Fechas y números en formato local
- **Dirección**: LTR (Izquierda a Derecha)

## 📱 Optimizaciones Móviles

### Características Móviles
- **Targets de toque**: Mínimo 44px para botones
- **Viewport**: Configuración óptima para dispositivos móviles
- **Tipografía**: Escalado responsivo
- **Formularios**: Validación en tiempo real, teclados optimizados

### Accesibilidad (WCAG 2.1 AA)
- **Compatibilidad con lectores de pantalla**: Labels ARIA y semántica
- **Navegación por teclado**: Navegación completa por teclado
- **Alto contraste**: Soporte para alto contraste

## 🔧 Solución de Problemas Comunes

### Error: "Invalid API key"
```bash
# Verificar que las claves estén correctamente copiadas
# Asegurar que no haya espacios extra o comillas
# Verificar que la URL de Supabase sea correcta
```

### Tests de base de datos omitidos
```bash
# Esto es esperado si no se configura SUPABASE_SERVICE_ROLE_KEY
# Agregar la clave service_role para ejecutar tests completos de base de datos
```

### Errores de configuración de Jest
```bash
# Ejecutar para información detallada del error
npm run test:debug

# Verificar que las rutas de tsconfig.json coincidan con Jest moduleNameMapper
```

### Entorno no carga
```bash
# Asegurar que .env.local esté en el directorio frontend/
# Reiniciar el servidor de desarrollo después de cambiar variables de entorno
# Verificar errores de sintaxis en .env.local
```

## 🚀 Flujo de Desarrollo

### Inicio de Desarrollo
1. **Instalar dependencias**: `npm install`
2. **Configurar entorno**: Editar `.env.local`
3. **Verificar configuración**: `npm test -- --testPathPatterns="connection-test"`
4. **Iniciar servidor de desarrollo**: `npm run dev`

### Flujo de Testing
1. **Test rápido**: `npm test -- --testPathPatterns="connection-test"`
2. **Tests de componentes**: `npm test -- --testPathPatterns="components"`
3. **Tests de base de datos**: `npm run test:db`
4. **Todos los tests**: `npm test`

### Flujo de Deployment
1. **Verificar tests**: `npm run test:ci`
2. **Construcción**: `npm run build`
3. **Verificar linting**: `npm run lint`
4. **Verificar tipos**: `npm run typecheck`

## 🎯 Estado Actual del Desarrollo

### Sprint 1 - Configuración Básica (COMPLETADO)
- ✅ **Arquitectura de Base de Datos**: Tablas, relaciones, e índices
- ✅ **Implementación de RLS**: Aislamiento de tenants y control basado en roles
- ✅ **Aplicación Next.js**: Framework configurado con componentes UI
- ✅ **Sistema de Autenticación**: Login, logout, y protección de rutas

### Próximos Pasos - Sprint 2
- **Formularios de Encuesta**: Componentes dinámicos basados en survey_questions.json
- **Dashboard de Analíticos**: Gráficos con visualización de datos
- **Integración de Mapas**: Mapbox para visualización geográfica
- **Componentes de Exportación**: Generación de reportes

## 📊 Métricas de Calidad

### Cobertura de Tests Actual
- **Statements**: 27.69%
- **Branches**: 23.8%
- **Functions**: 32%
- **Lines**: 27.67%

### Objetivos de Cobertura
- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

## 📞 Soporte y Recursos

### Documentación Adicional
- [README.md](./README.md) - Información general del proyecto
- [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) - Configuración detallada del entorno
- [TEST_SETUP.md](./TEST_SETUP.md) - Documentación completa de testing
- [AUTHENTICATION.md](./AUTHENTICATION.md) - Sistema de autenticación

### Contacto
- **Email**: support@ppd.pr
- **Documentación**: Archivos MD y comentarios en código
- **Testing**: Servidor de desarrollo en http://localhost:3000

### Enlaces Útiles
- **Supabase Dashboard**: https://app.supabase.com/project/trkaoeexbzclyxulghyr
- **Next.js Docs**: https://nextjs.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **React Testing Library**: https://testing-library.com/docs/react-testing-library/intro

---

**Última actualización**: Enero 2025  
**Versión del documento**: 1.0  
**Estado del proyecto**: Sprint 1 Completado - Listo para Sprint 2