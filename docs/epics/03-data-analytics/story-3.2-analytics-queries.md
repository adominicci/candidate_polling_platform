# Story 3.2: Analytics Queries and Materialized Views

**Epic**: Data Analytics Dashboard  
**Assigned Agent**: 🔍 Data Analyst  
**Story Points**: 13  
**Priority**: High  
**Sprint**: 3

## User Story
**As a** data analyst  
**I want** optimized database queries and materialized views for campaign analytics  
**So that** dashboard metrics load quickly and provide accurate insights  

## Acceptance Criteria
- [ ] Materialized views created for key metrics aggregation
- [ ] Optimized queries for dashboard KPIs (< 2 second response time)
- [ ] Real-time trigger functions for view refreshes
- [ ] Geographic aggregation queries using PostGIS
- [ ] Voter sentiment analysis queries by precinct
- [ ] Response trend calculations over time periods
- [ ] Database indexes optimized for analytics queries
- [ ] Query performance benchmarks documented

## Technical Requirements
### Materialized Views to Create
1. **dashboard_metrics_mv** - Core KPIs
   ```sql
   CREATE MATERIALIZED VIEW dashboard_metrics_mv AS
   SELECT 
     COUNT(*) as total_responses,
     COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as daily_count,
     ROUND(
       COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::decimal / 
       COUNT(*)::decimal * 100, 2
     ) as completion_rate,
     COUNT(DISTINCT user_id) as active_volunteers,
     COUNT(DISTINCT precinct_id)::decimal / 
       (SELECT COUNT(*) FROM precincts WHERE tenant_id = sr.tenant_id)::decimal * 100 
       as geographic_coverage_pct
   FROM survey_responses sr
   WHERE tenant_id = current_setting('app.current_tenant_id')::uuid;
   ```

2. **priority_rankings_mv** - Top voter priorities by frequency
   ```sql
   CREATE MATERIALIZED VIEW priority_rankings_mv AS
   SELECT 
     jsonb_array_elements_text(a.answer_value::jsonb) as priority,
     COUNT(*) as frequency,
     ROUND(COUNT(*)::decimal / SUM(COUNT(*)) OVER () * 100, 1) as percentage
   FROM answers a
   JOIN questions q ON a.question_id = q.id
   WHERE q.question_key = 'priorities'
   AND a.tenant_id = current_setting('app.current_tenant_id')::uuid
   GROUP BY priority
   ORDER BY frequency DESC;
   ```

3. **geographic_metrics_mv** - Precinct-level aggregations
   ```sql
   CREATE MATERIALIZED VIEW geographic_metrics_mv AS
   SELECT 
     p.id as precinct_id,
     p.name as precinct_name,
     p.geometry,
     COUNT(sr.id) as response_count,
     ROUND(AVG(
       CASE WHEN a.question_id = (SELECT id FROM questions WHERE question_key = 'likelihood_vote')
       THEN a.answer_value::integer END
     ), 1) as avg_turnout_score,
     array_agg(DISTINCT a.answer_value) FILTER (
       WHERE q.question_key = 'party_preference'
     ) as party_preferences
   FROM precincts p
   LEFT JOIN survey_responses sr ON p.id = sr.precinct_id
   LEFT JOIN answers a ON sr.id = a.survey_response_id
   LEFT JOIN questions q ON a.question_id = q.id
   WHERE p.tenant_id = current_setting('app.current_tenant_id')::uuid
   GROUP BY p.id, p.name, p.geometry;
   ```

4. **response_trends_mv** - Daily/weekly response patterns
   ```sql
   CREATE MATERIALIZED VIEW response_trends_mv AS
   SELECT 
     DATE(created_at) as response_date,
     COUNT(*) as daily_count,
     COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as completed_count,
     COUNT(DISTINCT user_id) as unique_volunteers
   FROM survey_responses
   WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
   AND created_at >= CURRENT_DATE - INTERVAL '30 days'
   GROUP BY DATE(created_at)
   ORDER BY response_date;
   ```

### Real-time Refresh Triggers
```sql
-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_metrics_mv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY priority_rankings_mv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY geographic_metrics_mv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY response_trends_mv;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic refresh
CREATE TRIGGER refresh_analytics_on_response_insert
  AFTER INSERT ON survey_responses
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_analytics_views();

CREATE TRIGGER refresh_analytics_on_answer_insert
  AFTER INSERT ON answers
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_analytics_views();
```

### Performance Optimization Indexes
```sql
-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY idx_survey_responses_tenant_date 
ON survey_responses (tenant_id, DATE(created_at));

CREATE INDEX CONCURRENTLY idx_survey_responses_precinct_completed
ON survey_responses (precinct_id, completed_at) 
WHERE completed_at IS NOT NULL;

CREATE INDEX CONCURRENTLY idx_answers_question_tenant
ON answers (question_id, tenant_id);

CREATE INDEX CONCURRENTLY idx_answers_survey_response_question
ON answers (survey_response_id, question_id);

-- Partial index for priority questions
CREATE INDEX CONCURRENTLY idx_answers_priorities
ON answers (answer_value) 
WHERE question_id IN (SELECT id FROM questions WHERE question_key = 'priorities');
```

## Definition of Done
- [ ] All 4 materialized views created and tested
- [ ] Refresh trigger functions implemented
- [ ] Database indexes created for optimal performance
- [ ] Query performance benchmarks meet < 2 second requirement
- [ ] Views return correct data with sample dataset
- [ ] Real-time refresh triggers working properly
- [ ] Multi-tenant security enforced in all views
- [ ] Database migration scripts created
- [ ] Query documentation completed
- [ ] Performance monitoring queries created
- [ ] Unit tests for view data accuracy
- [ ] Load testing completed with realistic data volume

## Query Performance Requirements
- Dashboard metrics query: < 500ms
- Priority rankings: < 300ms  
- Geographic aggregations: < 1 second
- Response trends: < 800ms
- View refresh operations: < 5 seconds
- Concurrent user support: 50+ simultaneous queries

## Geographic Analytics Features
### PostGIS Spatial Queries
```sql
-- Responses within geographic radius
SELECT COUNT(*) as nearby_responses
FROM survey_responses sr
JOIN precincts p ON sr.precinct_id = p.id
WHERE ST_DWithin(
  p.geometry::geography,
  ST_Point(-66.1057, 18.4655)::geography, -- San Juan coordinates
  5000 -- 5km radius
);

-- Heat map aggregation by geographic density
SELECT 
  ST_AsGeoJSON(ST_Centroid(p.geometry)) as center_point,
  COUNT(sr.id) as response_density
FROM precincts p
LEFT JOIN survey_responses sr ON p.id = sr.precinct_id
GROUP BY p.id, p.geometry
HAVING COUNT(sr.id) > 0;
```

### Sentiment Analysis Queries
```sql
-- Issue priority analysis by region
SELECT 
  p.municipality,
  jsonb_array_elements_text(a.answer_value::jsonb) as issue,
  COUNT(*) as mentions,
  ROUND(
    COUNT(*)::decimal / 
    SUM(COUNT(*)) OVER (PARTITION BY p.municipality) * 100, 1
  ) as percentage_in_municipality
FROM answers a
JOIN survey_responses sr ON a.survey_response_id = sr.id
JOIN precincts p ON sr.precinct_id = p.id
JOIN questions q ON a.question_id = q.id
WHERE q.question_key = 'community_concerns'
GROUP BY p.municipality, issue
ORDER BY p.municipality, mentions DESC;
```

## Dependencies
- Database schema completed (Story 1.1)
- Survey data collection with sample responses
- PostGIS extension enabled and configured
- Multi-tenant RLS policies implemented

## Blockers/Risks
- Large dataset performance with materialized views
- Real-time refresh impact on database performance
- Complex geographic calculations may be slow
- Concurrent refresh operations during high usage

## Testing Checklist
- [ ] All materialized views create without errors
- [ ] Views return accurate data with test dataset
- [ ] Refresh triggers fire correctly on data changes
- [ ] Query performance meets benchmarks
- [ ] Indexes improve query execution plans
- [ ] Multi-tenant data isolation works properly
- [ ] Geographic queries return correct spatial results
- [ ] Concurrent access doesn't cause deadlocks
- [ ] View refresh completes within time limits
- [ ] Error handling for view refresh failures

## Load Testing Requirements
Test with realistic data volumes:
- 10,000+ survey responses
- 100+ precincts
- 50+ concurrent dashboard users
- 31 questions × average 8 answers per response
- Real-time updates every 30 seconds

## API Integration
Views will be accessed via these API endpoints:
```typescript
// Dashboard metrics
GET /api/analytics/dashboard-metrics
// Uses: dashboard_metrics_mv

// Priority rankings
GET /api/analytics/priority-rankings
// Uses: priority_rankings_mv

// Geographic data
GET /api/analytics/geographic-metrics
// Uses: geographic_metrics_mv

// Response trends
GET /api/analytics/response-trends?period=30d
// Uses: response_trends_mv
```

## Monitoring and Maintenance
- [ ] Query execution plan monitoring
- [ ] Materialized view size tracking
- [ ] Refresh operation duration logging
- [ ] Index usage statistics collection
- [ ] Alert setup for performance degradation

## Resources
- PostgreSQL materialized view documentation
- PostGIS spatial analysis functions
- Database performance tuning guides
- Multi-tenant database patterns
- Analytics dashboard best practices