# PPD Candidate Polling Platform - Agent Registry

## Project Overview
This repository contains specialized AI agents designed to collaborate on building the PPD Campaign Intelligence Platform. Each agent has specific expertise and responsibilities while maintaining awareness of the overall project goals.

## Agent Directory

### 🗄️ [Database Architect](./database-architect.md)
**Primary Focus**: PostgreSQL schema, Supabase configuration, RLS policies, PostGIS
**Key Responsibilities**:
- Database schema design and implementation
- Security policies and tenant isolation
- Query optimization and materialized views
- Geographic data management

### 🎨 [Frontend Developer](./frontend-developer.md)
**Primary Focus**: Next.js, React, mobile-responsive UI, Spanish localization
**Key Responsibilities**:
- Survey form development
- Dashboard UI components
- Mobile-first responsive design
- User authentication interfaces

### ⚡ [API Backend Engineer](./api-backend-engineer.md)
**Primary Focus**: Supabase functions, API design, business logic
**Key Responsibilities**:
- REST API endpoints
- Data validation and processing
- Real-time subscriptions
- File handling and exports

### 🔒 [DevOps & Security](./devops-security.md)
**Primary Focus**: Deployment, security, monitoring, CI/CD
**Key Responsibilities**:
- Infrastructure as code
- Security implementation
- Performance monitoring
- Backup and recovery

### 📊 [Data Analyst](./data-analyst.md)
**Primary Focus**: Analytics, reporting, data visualization, insights
**Key Responsibilities**:
- Dashboard analytics design
- Report generation
- Data quality assurance
- Predictive modeling

### 🎯 [UX Designer](./ux-designer.md)
**Primary Focus**: User experience, accessibility, mobile design, Spanish UI
**Key Responsibilities**:
- User interface design
- Mobile optimization
- Accessibility compliance
- User testing and validation

### 🎯 [Project Manager](./project-manager.md)
**Primary Focus**: Coordination, timeline, quality assurance, stakeholder communication
**Key Responsibilities**:
- Sprint planning and tracking
- Risk management
- Quality gates and DoD
- Stakeholder communication

## Collaboration Protocol

### Agent Interaction Rules
1. **Respect Expertise**: Each agent leads in their domain
2. **Clear Dependencies**: Explicitly state what you need from others
3. **Document Decisions**: All architectural decisions logged
4. **Quality First**: Never compromise security or UX for speed
5. **Spanish Context**: Remember this is for Spanish-speaking users in Puerto Rico

### Daily Workflow
```
Morning Standup → Individual Work → Collaboration Points → Evening Status
```

### Communication Channels
- **Architecture Decisions**: Document in respective agent files
- **Blockers**: Escalate through Project Manager
- **Code Reviews**: Cross-agent review for quality
- **User Feedback**: Coordinate through UX Designer

## Current Project Status

### 🎯 **Phase 1: Foundation** (Weeks 1-2)
**Status**: In Progress
**Lead**: Database Architect
**Next**: Supabase schema implementation

### Key Dependencies Map
```
Database Schema (DB Architect)
    ↓
API Endpoints (API Engineer)
    ↓
Frontend Components (Frontend Dev)
    ↓
User Testing (UX Designer)
    ↓
Security Audit (DevOps)
    ↓
Analytics Implementation (Data Analyst)
    ↓
Launch (Project Manager)
```

### Shared Resources
- **Survey Structure**: `/survey_questions.json`
- **Project Context**: `/CLAUDE.md`
- **Documentation**: `/docs/`
- **Supabase Project**: `candidate_polling` (trkaoeexbzclyxulghyr)

## Agent-Specific Colors & Icons
- 🗄️ **Database Architect**: Blue (#3B82F6)
- 🎨 **Frontend Developer**: Purple (#8B5CF6)  
- ⚡ **API Backend Engineer**: Green (#10B981)
- 🔒 **DevOps & Security**: Red (#EF4444)
- 📊 **Data Analyst**: Orange (#F59E0B)
- 🎯 **UX Designer**: Pink (#EC4899)
- 🎯 **Project Manager**: Gray (#6B7280)

## Success Criteria

### Technical Excellence
- Zero security vulnerabilities
- 99.9% uptime
- <2s page load times
- Mobile-first responsive design
- WCAG 2.1 AA accessibility

### User Success
- >85% survey completion rate
- >80% volunteer adoption
- Spanish-native user experience
- Intuitive mobile interface

### Business Impact
- 1000+ surveys collected in first month
- >90% precinct coverage
- Real-time analytics for campaign decisions
- Actionable voter insights

## Getting Started as an Agent

1. **Review Project Context**: Read `/CLAUDE.md` and `/docs/`
2. **Understand Your Role**: Review your specific agent documentation
3. **Check Dependencies**: Identify what you need from other agents
4. **Current Sprint**: Check with Project Manager for current priorities
5. **Begin Work**: Start with your highest-priority, non-blocked tasks

## Quality Standards

### Definition of Done (Cross-Agent)
- [ ] Code reviewed by relevant agents
- [ ] Security checklist completed
- [ ] Performance benchmarks met
- [ ] Mobile responsiveness verified
- [ ] Spanish localization complete
- [ ] Documentation updated
- [ ] Tests passing

### Code Review Protocol
Each agent reviews code in their domain:
- **Database**: SQL queries, schema changes, RLS policies
- **Frontend**: React components, UX implementation, responsive design
- **Backend**: API logic, business rules, data validation
- **Security**: Authentication, authorization, data protection
- **UX**: User flows, accessibility, mobile usability
- **Data**: Analytics logic, report accuracy, performance

---

**Remember**: We're building software that will be used by volunteers in the field to collect sensitive voter data for political campaigns in Puerto Rico. Quality, security, and user experience are paramount.