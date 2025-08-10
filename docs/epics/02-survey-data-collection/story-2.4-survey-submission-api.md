# Story 2.4: Survey Submission API

**Epic**: Survey Data Collection  
**Assigned Agent**: ⚡ API Backend Engineer  
**Story Points**: 8  
**Priority**: High  
**Sprint**: 2  
**Dependencies**: Database Architect (schema), Frontend Developer (form structure)

## User Story
**As a** field volunteer  
**I want** reliable survey data submission  
**So that** collected voter information is safely stored and accessible  

## Acceptance Criteria
- [ ] Secure API endpoints for survey submission
- [ ] Real-time data validation and processing
- [ ] Robust error handling and retry logic
- [ ] Support for draft saving and resume functionality
- [ ] Performance optimized for mobile network conditions
- [ ] Comprehensive logging for debugging and analytics

## Technical Requirements
### API Endpoints
```typescript
POST /api/surveys/responses     // Create new survey response
PUT  /api/surveys/responses/:id // Update existing response (draft save)
GET  /api/surveys/responses/:id // Retrieve draft response
POST /api/surveys/validate      // Validate individual fields
GET  /api/surveys/questionnaires // Get active questionnaire structure
```

### Data Processing Pipeline
1. **Request Validation**: Verify user permissions and data structure
2. **Business Logic**: Apply survey rules and conditional logic
3. **Data Transformation**: Convert form data to database format
4. **Storage**: Persist to database with transaction safety
5. **Response Generation**: Return success/error with appropriate detail

### Security Requirements
- **Authentication**: JWT token validation for all endpoints
- **Authorization**: Role-based access (volunteers, managers, admins)
- **Data Validation**: Server-side validation of all submitted data
- **Rate Limiting**: Prevent abuse and ensure system stability
- **Audit Logging**: Track all survey submissions for compliance

## Definition of Done
- [ ] All API endpoints implemented and tested
- [ ] Survey response creation with full validation
- [ ] Draft save/resume functionality working
- [ ] Error handling provides clear user feedback
- [ ] Performance meets mobile requirements (< 3s response)
- [ ] Security measures implemented and tested
- [ ] API documentation complete
- [ ] Unit tests achieve >90% coverage
- [ ] Integration tests with frontend form
- [ ] Load testing validates performance under field conditions

## API Implementation Details

### Survey Response Creation
```typescript
// POST /api/surveys/responses
interface CreateSurveyResponseRequest {
  questionnaire_id: string;
  answers: SurveyAnswer[];
  metadata: {
    start_time: string;
    completion_time?: string;
    device_info: DeviceInfo;
    location?: GeoLocation;
  };
  is_draft: boolean;
}

interface SurveyAnswer {
  question_id: string;
  answer_value: string | string[] | number;
  answer_text?: string; // For "other" options
  skipped: boolean;
  validation_errors?: string[];
}
```

### Validation Engine
```typescript
class SurveyValidator {
  validateAnswer(question: Question, answer: SurveyAnswer): ValidationResult {
    // Type-specific validation
    switch (question.type) {
      case 'email':
        return this.validateEmail(answer.answer_value as string);
      case 'tel':
        return this.validatePhone(answer.answer_value as string);
      case 'checkbox':
        return this.validateCheckboxSelections(question, answer.answer_value as string[]);
      case 'radio':
        return this.validateRadioSelection(question, answer.answer_value as string);
      // ... other types
    }
  }
  
  validateConditionalLogic(answers: SurveyAnswer[]): ConditionalValidationResult {
    // Check if conditionally required questions are answered
    // Example: "which_party" required when "leans_to_party" = "SI"
  }
}
```

### Error Handling Strategy
```typescript
class SurveySubmissionError extends Error {
  constructor(
    public code: string,
    public message: string,
    public field?: string,
    public details?: any
  ) {
    super(message);
  }
}

const ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  DUPLICATE_SUBMISSION: 'DUPLICATE_SUBMISSION',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_QUESTIONNAIRE: 'INVALID_QUESTIONNAIRE',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SERVER_ERROR: 'SERVER_ERROR'
};
```

### Draft Management
```typescript
// PUT /api/surveys/responses/:id (for drafts)
interface UpdateDraftRequest {
  answers: SurveyAnswer[];
  current_section: number;
  progress_percentage: number;
  last_modified: string;
}

// Automatic draft saving every 30 seconds
class DraftAutoSave {
  private saveInterval: NodeJS.Timeout;
  
  startAutoSave(responseId: string, getDraftData: () => UpdateDraftRequest) {
    this.saveInterval = setInterval(async () => {
      try {
        await this.saveDraft(responseId, getDraftData());
      } catch (error) {
        console.error('Draft auto-save failed:', error);
      }
    }, 30000); // 30 seconds
  }
}
```

## Database Operations

### Survey Response Storage
```sql
-- Create survey response with answers in single transaction
BEGIN;

INSERT INTO survey_responses (
  id, tenant_id, questionnaire_id, user_id,
  started_at, completed_at, is_draft,
  device_info, location_data
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);

-- Insert all answers
INSERT INTO answers (
  response_id, question_id, answer_value, answer_text,
  skipped, created_at
) SELECT * FROM UNNEST($1::answer_type[]);

-- Update completion statistics
UPDATE questionnaires 
SET response_count = response_count + 1
WHERE id = $questionnaire_id;

COMMIT;
```

### Performance Optimizations
```sql
-- Indexes for fast lookups
CREATE INDEX CONCURRENTLY idx_survey_responses_user_draft 
ON survey_responses (user_id, is_draft) 
WHERE is_draft = true;

CREATE INDEX CONCURRENTLY idx_answers_response_question 
ON answers (response_id, question_id);

-- Partial index for active questionnaires
CREATE INDEX CONCURRENTLY idx_questionnaires_active 
ON questionnaires (tenant_id) 
WHERE estado = 'Activo';
```

## Mobile Network Optimization

### Request/Response Compression
```typescript
// Enable compression for all API responses
app.use(compression({
  level: 6,
  threshold: 100 * 1024, // Only compress responses > 100kb
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
```

### Retry Logic for Network Issues
```typescript
class NetworkRetryHandler {
  async submitWithRetry(
    submitFn: () => Promise<any>,
    maxRetries: number = 3,
    backoff: number = 1000
  ): Promise<any> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await submitFn();
      } catch (error) {
        if (attempt === maxRetries || !this.isRetryableError(error)) {
          throw error;
        }
        
        const delay = backoff * Math.pow(2, attempt - 1); // Exponential backoff
        await this.sleep(delay);
      }
    }
  }
  
  private isRetryableError(error: any): boolean {
    // Network errors, timeouts, 5xx server errors
    return error.code === 'NETWORK_ERROR' || 
           error.status >= 500 || 
           error.code === 'TIMEOUT';
  }
}
```

## Security Implementation

### Rate Limiting
```typescript
import rateLimit from 'express-rate-limit';

const surveySubmissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each user to 50 requests per windowMs
  message: {
    error: 'Too many survey submissions, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/surveys/responses', surveySubmissionLimiter);
```

### Input Sanitization
```typescript
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

class InputSanitizer {
  sanitizeTextInput(input: string): string {
    // Remove HTML/script tags, normalize whitespace
    return DOMPurify.sanitize(validator.escape(input.trim()));
  }
  
  validateAnswerData(answers: SurveyAnswer[]): SurveyAnswer[] {
    return answers.map(answer => ({
      ...answer,
      answer_value: this.sanitizeAnswerValue(answer.answer_value),
      answer_text: answer.answer_text ? this.sanitizeTextInput(answer.answer_text) : undefined
    }));
  }
}
```

## Monitoring and Analytics

### Performance Metrics
```typescript
interface SubmissionMetrics {
  response_time: number;
  validation_errors: number;
  retry_attempts: number;
  completion_rate: number;
  error_rate: number;
}

class SubmissionAnalytics {
  trackSubmission(metrics: SubmissionMetrics) {
    // Send to analytics service (e.g., PostHog, Mixpanel)
    this.analytics.track('survey_submitted', {
      response_time_ms: metrics.response_time,
      validation_errors: metrics.validation_errors,
      retry_attempts: metrics.retry_attempts,
      timestamp: new Date().toISOString()
    });
  }
}
```

### Error Logging
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'survey-api-errors.log', level: 'error' }),
    new winston.transports.File({ filename: 'survey-api.log' })
  ]
});

// Log all survey submission attempts
app.use('/api/surveys', (req, res, next) => {
  logger.info('Survey API request', {
    method: req.method,
    url: req.url,
    user_id: req.user?.id,
    ip: req.ip,
    user_agent: req.headers['user-agent']
  });
  next();
});
```

## Testing Strategy

### Unit Tests
```typescript
describe('Survey Submission API', () => {
  describe('POST /api/surveys/responses', () => {
    test('should create survey response with valid data', async () => {
      const response = await request(app)
        .post('/api/surveys/responses')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validSurveyData)
        .expect(201);
        
      expect(response.body.id).toBeDefined();
      expect(response.body.status).toBe('completed');
    });
    
    test('should validate required fields', async () => {
      const incompleteData = { ...validSurveyData };
      delete incompleteData.answers;
      
      const response = await request(app)
        .post('/api/surveys/responses')
        .set('Authorization', `Bearer ${validToken}`)
        .send(incompleteData)
        .expect(400);
        
      expect(response.body.code).toBe('MISSING_REQUIRED_FIELD');
    });
  });
});
```

### Load Testing
```yaml
# k6 load test configuration
scenarios:
  survey_submission:
    executor: ramping-arrival-rate
    startRate: 1
    timeUnit: 1s
    preAllocatedVUs: 50
    maxVUs: 200
    stages:
      - duration: 2m
        target: 10 # Ramp up to 10 RPS
      - duration: 5m
        target: 10 # Stay at 10 RPS
      - duration: 2m
        target: 0  # Ramp down
```

## Dependencies
- Database schema with survey tables (Story 1.1)
- Authentication system working (Story 1.4) 
- Survey questions imported (Story 2.1)
- Frontend form implementation (Story 2.2)

## Blockers/Risks
- High network latency in rural field locations
- Large survey data payload sizes
- Concurrent submission conflicts
- Database performance under load

## Success Metrics
- **Response Time**: < 3 seconds for survey submission
- **Availability**: > 99.5% uptime during field operations  
- **Error Rate**: < 1% failed submissions
- **Data Integrity**: Zero data loss incidents
- **Security**: Zero security vulnerabilities
- **Performance**: Handle 100+ concurrent submissions

## Resources
- Supabase API documentation and best practices
- Next.js API route patterns and middleware
- Survey data validation libraries
- Mobile network optimization techniques
- Security best practices for political data