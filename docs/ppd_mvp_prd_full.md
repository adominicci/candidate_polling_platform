# Product Requirements Document — PPD MVP

## 1. Document Purpose
This PRD defines the objectives, scope, features, and technical requirements for the MVP of the "PPD Campaign Intelligence Platform," aimed at enabling real-time voter sentiment analysis, field data collection, and analytics for political candidates in Puerto Rico.

## 2. Background & Business Case
The Partido Popular Democrático (PPD) is facing declining voter engagement and needs modern tools to understand constituent priorities and adjust campaign strategies quickly. Current outreach methods lack centralized data, rapid analysis, and district-level insights.

The MVP will provide:
- A **web-based survey tool** for volunteers to capture voter feedback in the field using mobile devices.
- A **dashboard** with map-based analytics to visualize issues, turnout potential, and priority voters.
- Role-based access for admins, analysts, and field teams.

## 3. Objectives
- Increase campaign intelligence through structured, real-time data.
- Enable mobile data capture with instant submission to central database.
- Provide actionable insights (top voter issues, turnout likelihood) to candidate teams.
- Scale from a single district to Puerto Rico-wide coverage.

## 4. Target Users
- **Admin:** Manages precincts, assignments, and overall campaign data.
- **Analyst:** Interprets collected data, creates strategic recommendations.
- **Field Volunteer:** Captures survey data from voters during outreach.
- **Candidate/Manager:** Views high-level insights for strategic planning.

## 5. Scope — MVP
**In Scope:**
- Survey form (questions from the provided JSON).
- Mobile-responsive web app for volunteer data collection.
- Direct submission to Supabase database.
- Dashboard with:
  - Map of precincts/barrios.
  - Top issues per area.
  - Turnout scoring v1.
- Role-based access and export capabilities.

**Out of Scope (Future Versions):**
- Offline capabilities.
- Predictive modeling v2.
- Multi-party SaaS onboarding.
- Social media sentiment integration.

## 6. Success Metrics
- ≥ 99% successful form submissions.
- Aggregated counts match raw data ±1%.
- Pilot team reports analytics improved decision-making.
- Reduction in manual data handling by ≥ 80%.

## 7. Functional Requirements
- **Survey Module:**
  - Supports multiple question types (multiple choice, free text, checkbox, scale).
  - Captures consent flag.
  - Stores GPS location (if permitted).
  - Mobile-responsive design.
  - Real-time validation and submission.
- **Data Collection:**
  - Direct submission to database.
  - Duplicate prevention via unique identifiers.
- **Dashboard Module:**
  - Map view with precinct/barrio shapes.
  - Top issues per area.
  - Export voter lists with role-based redactions.
- **Admin Tools:**
  - Manage users & roles.
  - Assign walklists to volunteers.

## 8. Technical Requirements
- **Backend:** Supabase (Postgres + PostgREST RPC), RLS policies.
- **Frontend:** Next.js responsive web app + dashboard.
- **Database:** PostgreSQL with real-time subscriptions.
- **Mapping:** Mapbox or Leaflet with simplified GeoJSON.
- **Security:** JWT with tenant/role claims, HTTPS only, audit logs.

## 9. Risks & Mitigations
- **Risk:** Low tech adoption by volunteers → *Mitigation:* simple UX, short training videos.
- **Risk:** Data privacy concerns → *Mitigation:* consent capture + encryption.
- **Risk:** Poor connectivity in field → *Mitigation:* lightweight forms, retry mechanism for failed submissions.

## 10. Timeline
- **Week 1–2:** DB schema, Supabase setup, API contracts.
- **Week 3–4:** Web survey form build.
- **Week 5–6:** Dashboard build + map integration.
- **Week 7–8:** Pilot test and feedback.
- **Week 9–10:** Bug fixes, prep for wider rollout.


## 11. Technical Architecture (Expanded)

### 11.1 System Overview & Data Flow
The system consists of three main layers:
1. **Web Frontend (Volunteer Tool)**  
   - Built with Next.js + React, mobile-responsive design.  
   - Direct submission to backend via secure HTTPS calls using JWT.
   - Form validation and error handling.

2. **Dashboard Frontend (Admin/Analyst Tool)**  
   - Also built in Next.js with role-based UI components.  
   - Connects directly to Supabase via PostgREST for most queries.  
   - Uses Mapbox or Leaflet for precinct/barrio visualization.

3. **Backend & Database Layer**  
   - Supabase/Postgres as the core datastore.  
   - PostgREST RPC endpoints for data aggregation and report generation.  
   - PostgreSQL with RLS (Row Level Security) for tenant isolation.  
   - Supabase Storage for static assets (e.g., precinct shape files, export CSVs).  
   - Materialized Views for pre-aggregated analytics.

**Data Flow Example:**  
Volunteer completes survey → submits form → Supabase inserts data → Materialized Views refresh → Dashboard displays updated maps and tables.

---

### 11.2 API Specification
**REST / RPC Endpoints:**  
- `POST /api/survey/submit` — Submit survey response.  
- `GET /api/geo/precincts` — Get GeoJSON for precinct boundaries.  
- `POST /api/reports/priority-list` — Export CSV of priority voters.  
- `rpc.refresh_mv(tenant uuid)` — Refresh materialized views for analytics.  
- `rpc.compute_turnout(scope json)` — Calculate turnout scores for given precincts.

**Role Restrictions:**  
- **Admin:** All endpoints.  
- **Analyst:** Read-only analytics, export with redactions.  
- **Volunteer:** Only submit to assigned walklists.

---

### 11.3 Database Schema (Key Tables)
- **tenants**: id, name, metadata.  
- **users**: id, email, role, tenant_id.  
- **precincts**: id, code, name, geom.  
- **walklists**: id, precinct_id, assigned_to, status.  
- **questionnaires**: id, version, title.  
- **questions**: id, questionnaire_id, text, type, options[].  
- **survey_responses**: id, walklist_id, questionnaire_id, consent_flag, started_at, submitted_at.  
- **answers**: id, response_id, question_id, value_text, value_options[].

**RLS Rules:**  
- Volunteers can only insert into `survey_responses` linked to their assigned `walklists`.  
- Analysts can only query aggregated views; no raw voter PII.  
- Admins have full table access.

---

### 11.4 Data Submission & Error Handling
- **Submission States:** `submitting → success → error`.  
- **Retry:** Automatic retry on network failure (up to 3 attempts).  
- **Validation:** Server-side validation with clear error messages.

---

### 11.5 Security & Compliance
- **JWT Authentication:** Supabase Auth with custom claims for `tenant_id` and `role`.  
- **Transport Security:** HTTPS only.  
- **Encryption:** All PII stored encrypted at rest.  
- **Audit Logs:** Every insert/update in `survey_responses` and `answers` is logged.  
- **Consent Compliance:** Each record has `consent_flag` boolean.

---

### 11.6 Scalability Considerations
- Use of Materialized Views to ensure dashboard loads < 2 seconds even at scale.  
- Partition `survey_responses` table by tenant to handle Puerto Rico-wide usage.  
- Cache precinct GeoJSON tiles in CDN.  
- API rate limiting per JWT.
- Database connection pooling for high concurrent usage.

