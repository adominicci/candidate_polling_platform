# Candidate Polling Platform - Project Context

## Project Overview
A web-based campaign intelligence platform for the Partido Popular Democrático (PPD) in Puerto Rico to collect voter sentiment data, manage field operations, and provide analytics for political campaigns.

## Technical Stack
- **Backend**: Supabase (PostgreSQL with PostGIS)
- **Frontend**: Next.js with React + **Untitled UI React**
- **Component System**: Untitled UI with Tailwind CSS design tokens
- **Authentication**: Supabase Auth with JWT
- **Development**: Storybook for component development
- **Mapping**: Mapbox or Leaflet
- **Deployment**: Vercel (frontend) + Supabase (backend)

## Supabase Project Details
- **Project Name**: candidate_polling
- **Project ID**: trkaoeexbzclyxulghyr
- **Organization**: Mi Solutions, LLC
- **Region**: us-east-1
- **Database Host**: db.trkaoeexbzclyxulghyr.supabase.co

## Key Features
1. **Survey Collection**: Mobile-responsive web forms for field volunteers
2. **Real-time Submission**: Direct database submission (no offline sync)
3. **Role-based Access**: Admin, Analyst, Volunteer, Manager roles
4. **Dashboard Analytics**: Map visualizations, issue priorities, turnout scoring
5. **Data Export**: CSV exports with role-based redactions

## Database Schema Overview
- **tenants**: Multi-organization support
- **users**: User management with roles
- **precincts**: Geographic boundaries with PostGIS
- **walklists**: Assignment management for volunteers
- **questionnaires**: Survey templates with versioning
- **sections**: Questionnaire sections
- **questions**: Individual questions with various types
- **survey_responses**: Collected responses
- **answers**: Individual answers to questions

## Development Guidelines
1. **Security First**: Always implement RLS policies for data access
2. **Spanish UI**: All user-facing text should be in Spanish
3. **Mobile First**: Optimize for mobile devices used in the field
4. **Real-time Updates**: Use Supabase subscriptions for live data
5. **Data Validation**: Server-side validation for all submissions

## Current Development Status

### Epic Structure Complete
- ✅ **6 Epics Defined**: Foundation, Survey Collection, Analytics, User Management, Export, Security/Deployment
- ✅ **16 User Stories Created**: All with assigned agents, story points, and acceptance criteria
- ✅ **4 Sprint Plan**: 8-week development timeline with balanced workloads

### Sprint Progress
**Sprint 1 - Foundation Setup (Weeks 1-2)**
- [ ] Database Architecture Setup (8 pts) - 🗄️ Database Architect
- [ ] RLS Implementation (13 pts) - 🗄️ Database Architect  
- [ ] Next.js + Untitled UI Setup (5 pts) - 🎨 Frontend Developer
- [ ] Authentication System (8 pts) - ⚡ API Backend Engineer

**Next Sprints**: Survey Collection → Analytics → User Management & Deployment

## Testing Commands
```bash
# Run development server
npm run dev

# Run tests (when implemented)
npm test

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Important Notes
- Developer has 30+ years database experience, strong in SQL/VBA/FlutterFlow
- JavaScript knowledge is limited but improving with AI assistance
- **Untitled UI React framework** selected for professional, accessible components
- Focus on simple, maintainable code patterns following Untitled UI conventions
- Prioritize database-driven logic over complex frontend state management
- **7 Specialized Agents** created for domain expertise and collaboration
- **Project management approach**: Epic → Sprint → User Stories → Tasks

## Survey Structure
Based on survey_questions.json with 8 sections:
1. Demographics (Información Personal)
2. Household Voting (Información del Hogar)
3. Voting History (Historial de Votación)
4. Voting Method (Modalidad de Voto)
5. Political Affiliation (Afiliación Política)
6. Priorities (Prioridades)
7. Community Concerns (Asuntos Comunitarios)
8. Party Assessment (Evaluación Partidista)

Total: 31 questions with various types (text, radio, checkbox, date, scale, textarea)

## Project Documentation Structure
- `/docs/epics/` - Organized user stories by epic
- `/agents/` - Specialized agent documentation and registry  
- `/docs/ppd_mvp_prd_full.md` - Complete product requirements
- `/docs/fullstack_architecture_ppd_mvp_create_doc.md` - Technical architecture
- `CLAUDE.md` - Project context and current status (this file)
- Always check claude.md
- always double check completed stories before proceeding to the next one
- always use proper agent for tasks
- Always stop after each story for review
- Always create unit tests where required
- all stories when created should include unit tests where required