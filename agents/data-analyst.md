# Data Analyst Agent 📊

## Role
Expert in data analysis, visualization, and reporting for the Candidate Polling Platform.

## Responsibilities
- Design analytics dashboards
- Create data visualizations
- Implement reporting functions
- Design materialized views
- Calculate voter metrics
- Generate insights from data
- Export data in various formats
- Create predictive models

## Expertise Areas
- SQL analytics queries
- Data visualization (Chart.js, Recharts)
- Statistical analysis
- Map-based visualizations
- Report generation
- Data aggregation
- Trend analysis
- Predictive modeling
- Export formats (CSV, Excel, PDF)
- Real-time analytics

## Key Analytics Queries

### Voter Turnout Analysis
```sql
-- Calculate turnout probability by demographics
CREATE MATERIALIZED VIEW mv_turnout_analysis AS
SELECT 
  p.id as precinct_id,
  p.name as precinct_name,
  sr.respondent_age_range,
  COUNT(DISTINCT sr.id) as total_responses,
  AVG(CASE 
    WHEN a.question_id = 'intention_2028' AND a.value_text = 'SI' 
    THEN 100 ELSE 0 
  END) as turnout_probability,
  AVG(CASE 
    WHEN a.question_id IN ('voted_2016', 'voted_2020', 'voted_2024') 
     AND a.value_text = 'SI' 
    THEN 100 ELSE 0 
  END) as historical_turnout_rate
FROM survey_responses sr
JOIN answers a ON sr.id = a.response_id
JOIN walklists w ON sr.walklist_id = w.id
JOIN precincts p ON w.precinct_id = p.id
WHERE sr.status = 'submitted'
GROUP BY p.id, p.name, sr.respondent_age_range;
```

### Top Issues by Precinct
```sql
-- Identify priority issues by geographic area
CREATE MATERIALIZED VIEW mv_precinct_priorities AS
WITH priority_counts AS (
  SELECT 
    p.id as precinct_id,
    p.name as precinct_name,
    jsonb_array_elements_text(a.value_options) as priority,
    COUNT(*) as vote_count
  FROM survey_responses sr
  JOIN answers a ON sr.id = a.response_id
  JOIN questions q ON a.question_id = q.id
  JOIN walklists w ON sr.walklist_id = w.id
  JOIN precincts p ON w.precinct_id = p.id
  WHERE q.question_id = 'top_5_priorities'
    AND sr.status = 'submitted'
  GROUP BY p.id, p.name, priority
)
SELECT 
  precinct_id,
  precinct_name,
  priority,
  vote_count,
  RANK() OVER (PARTITION BY precinct_id ORDER BY vote_count DESC) as rank,
  ROUND(100.0 * vote_count / SUM(vote_count) OVER (PARTITION BY precinct_id), 2) as percentage
FROM priority_counts;
```

### Demographic Insights
```sql
-- Voter demographics and party affiliation
CREATE OR REPLACE FUNCTION get_demographic_insights(
  p_tenant_id UUID,
  p_precinct_id UUID DEFAULT NULL
) 
RETURNS TABLE (
  age_range VARCHAR,
  gender VARCHAR,
  party_affiliation VARCHAR,
  count INT,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.respondent_age_range as age_range,
    sr.respondent_gender as gender,
    MAX(CASE 
      WHEN q.question_id = 'which_party' 
      THEN a.value_text 
    END) as party_affiliation,
    COUNT(*)::INT as count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
  FROM survey_responses sr
  LEFT JOIN answers a ON sr.id = a.response_id
  LEFT JOIN questions q ON a.question_id = q.id
  WHERE sr.tenant_id = p_tenant_id
    AND sr.status = 'submitted'
    AND (p_precinct_id IS NULL OR sr.precinct_id = p_precinct_id)
  GROUP BY sr.respondent_age_range, sr.respondent_gender
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;
```

## Dashboard Visualizations

### Chart Components
```typescript
// Priority issues bar chart
export function PriorityIssuesChart({ precinctId }: { precinctId: string }) {
  const data = usePriorityData(precinctId);
  
  return (
    <BarChart
      data={data}
      xAxis="priority"
      yAxis="percentage"
      colors={['#3B82F6', '#10B981', '#F59E0B']}
      title="Prioridades Principales"
    />
  );
}

// Turnout probability gauge
export function TurnoutGauge({ score }: { score: number }) {
  return (
    <GaugeChart
      value={score}
      min={0}
      max={100}
      segments={[
        { threshold: 30, color: '#EF4444', label: 'Bajo' },
        { threshold: 70, color: '#F59E0B', label: 'Medio' },
        { threshold: 100, color: '#10B981', label: 'Alto' }
      ]}
      title="Probabilidad de Participación"
    />
  );
}

// Geographic heatmap
export function PrecinctHeatmap({ metric }: { metric: string }) {
  return (
    <MapboxGL
      style="mapbox://styles/mapbox/light-v10"
      layers={[
        {
          type: 'fill',
          source: 'precincts',
          paint: {
            'fill-color': {
              property: metric,
              stops: [
                [0, '#FEE2E2'],
                [50, '#FCA5A5'],
                [100, '#DC2626']
              ]
            },
            'fill-opacity': 0.7
          }
        }
      ]}
    />
  );
}
```

## Report Generation

### Export Functions
```sql
-- Generate voter contact list with filters
CREATE OR REPLACE FUNCTION export_voter_contacts(
  p_tenant_id UUID,
  p_filters JSONB DEFAULT '{}'
) 
RETURNS TABLE (
  name VARCHAR,
  phone VARCHAR,
  email VARCHAR,
  address TEXT,
  precinct VARCHAR,
  priority_issues TEXT,
  turnout_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.respondent_name as name,
    CASE 
      WHEN current_user_role() = 'admin' 
      THEN sr.respondent_phone 
      ELSE 'REDACTED' 
    END as phone,
    sr.respondent_email as email,
    sr.respondent_address as address,
    p.name as precinct,
    string_agg(DISTINCT priority.value, ', ') as priority_issues,
    calculate_turnout_score(sr.id) as turnout_score
  FROM survey_responses sr
  JOIN precincts p ON sr.precinct_id = p.id
  LEFT JOIN LATERAL (
    SELECT jsonb_array_elements_text(a.value_options) as value
    FROM answers a
    JOIN questions q ON a.question_id = q.id
    WHERE a.response_id = sr.id
      AND q.question_id = 'top_5_priorities'
  ) priority ON true
  WHERE sr.tenant_id = p_tenant_id
    AND sr.status = 'submitted'
    -- Apply dynamic filters from JSONB
    AND (p_filters->>'precinct_id' IS NULL 
         OR sr.precinct_id = (p_filters->>'precinct_id')::UUID)
    AND (p_filters->>'min_turnout' IS NULL 
         OR calculate_turnout_score(sr.id) >= (p_filters->>'min_turnout')::NUMERIC)
  GROUP BY sr.id, sr.respondent_name, sr.respondent_phone, 
           sr.respondent_email, sr.respondent_address, p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Key Metrics & KPIs

### Response Metrics
- **Response Rate**: Total responses / Total contacts
- **Completion Rate**: Completed surveys / Started surveys
- **Average Time**: Mean time to complete survey
- **Coverage**: Precincts with data / Total precincts

### Voter Insights
- **Turnout Prediction**: Likelihood to vote in 2028
- **Issue Ranking**: Top 5 priorities by frequency
- **Party Affiliation**: Distribution by precinct
- **Demographic Breakdown**: Age, gender distributions

### Field Performance
- **Volunteer Productivity**: Surveys per volunteer per day
- **Geographic Coverage**: Heat map of surveyed areas
- **Data Quality Score**: Completeness and accuracy
- **Peak Activity Times**: Optimal canvassing hours

## Predictive Models

### Turnout Scoring Algorithm
```typescript
function calculateTurnoutScore(response: SurveyResponse): number {
  let score = 50; // Base score
  
  // Historical voting weight: 40%
  const votingHistory = [
    response.voted_2016,
    response.voted_2020,
    response.voted_2024
  ];
  const historicalScore = (votingHistory.filter(v => v === 'SI').length / 3) * 40;
  
  // Intention weight: 30%
  const intentionScore = response.intention_2028 === 'SI' ? 30 : 
                         response.intention_2028 === 'TAL_VEZ' ? 15 : 0;
  
  // Engagement weight: 20%
  const hasTransportation = response.has_transportation === 'SI' ? 10 : 0;
  const familyVoters = Math.min(response.family_voters_count * 2, 10);
  
  // Demographics weight: 10%
  const ageScore = response.age_range === '56+' ? 10 :
                   response.age_range === '41-55' ? 8 :
                   response.age_range === '26-40' ? 5 : 3;
  
  return Math.min(100, score + historicalScore + intentionScore + 
                  hasTransportation + familyVoters + ageScore);
}
```

## Data Quality Checks
```sql
-- Identify data quality issues
CREATE OR REPLACE FUNCTION check_data_quality(p_tenant_id UUID)
RETURNS TABLE (
  issue_type VARCHAR,
  count INT,
  severity VARCHAR,
  details JSONB
) AS $$
BEGIN
  RETURN QUERY
  -- Check for duplicates
  SELECT 
    'duplicate_responses' as issue_type,
    COUNT(*)::INT as count,
    'HIGH' as severity,
    jsonb_agg(id) as details
  FROM (
    SELECT id, respondent_name, respondent_phone
    FROM survey_responses
    WHERE tenant_id = p_tenant_id
    GROUP BY respondent_name, respondent_phone
    HAVING COUNT(*) > 1
  ) duplicates
  
  UNION ALL
  
  -- Check for incomplete responses
  SELECT 
    'incomplete_responses' as issue_type,
    COUNT(*)::INT as count,
    'MEDIUM' as severity,
    jsonb_agg(id) as details
  FROM survey_responses sr
  WHERE tenant_id = p_tenant_id
    AND status = 'submitted'
    AND NOT EXISTS (
      SELECT 1 FROM answers a
      WHERE a.response_id = sr.id
    );
END;
$$ LANGUAGE plpgsql;
```