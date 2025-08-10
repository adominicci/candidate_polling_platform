# Survey Submission API - Complete Documentation

## Overview

The Survey Submission API provides secure, high-performance endpoints for managing survey responses in the PPD Candidate Polling Platform. Built with Next.js API routes and Supabase backend, it includes comprehensive validation, security measures, and monitoring capabilities optimized for mobile field operations.

## Base URL

```
Production: https://your-domain.com/api/surveys
Development: http://localhost:3000/api/surveys
```

## Authentication

All API endpoints require authentication via JWT tokens. Include the authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

## Rate Limiting

- **Survey Submission**: 50 requests per 15 minutes per IP
- **Validation**: 100 requests per minute per IP
- **Questionnaires**: Standard rate limiting applies

## API Endpoints

### 1. Submit Survey Response

**Endpoint:** `POST /api/surveys/responses`

Create a new survey response (draft or completed).

#### Request Body

```typescript
interface CreateSurveyResponseRequest {
  questionnaire_id: string
  answers: SurveyAnswer[]
  metadata: {
    start_time: string // ISO 8601 format
    completion_time?: string // ISO 8601 format
    device_info: {
      user_agent: string
      screen_size: string
      connection_type?: string
      platform?: string
    }
    location?: {
      latitude: number
      longitude: number
      accuracy?: number
    }
  }
  is_draft: boolean
  respondent_name: string
  respondent_email?: string
  respondent_phone?: string // Format: XXX-XXX-XXXX
  precinct_id?: string
}

interface SurveyAnswer {
  question_id: string
  answer_value: string | string[] | number
  answer_text?: string // For "other" options
  skipped: boolean
}
```

#### Example Request

```json
{
  "questionnaire_id": "ppd_voter_consultation_v1",
  "answers": [
    {
      "question_id": "name",
      "answer_value": "Juan Pérez",
      "skipped": false
    },
    {
      "question_id": "age_range", 
      "answer_value": "26-40",
      "skipped": false
    },
    {
      "question_id": "priorities",
      "answer_value": ["economia", "salud", "educacion"],
      "skipped": false
    }
  ],
  "metadata": {
    "start_time": "2024-01-15T10:30:00Z",
    "completion_time": "2024-01-15T10:45:00Z",
    "device_info": {
      "user_agent": "Mozilla/5.0...",
      "screen_size": "390x844",
      "connection_type": "cellular",
      "platform": "iOS"
    },
    "location": {
      "latitude": 18.2208,
      "longitude": -66.5901,
      "accuracy": 10
    }
  },
  "is_draft": false,
  "respondent_name": "Juan Pérez García",
  "respondent_email": "juan@example.com",
  "respondent_phone": "787-555-1234",
  "precinct_id": "001-001"
}
```

#### Response

**Success (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "response_uuid",
    "status": "completed",
    "response_time": 1250
  }
}
```

**Validation Error (400 Bad Request):**
```json
{
  "error": "Error de validación en los datos de la encuesta",
  "code": "VALIDATION_FAILED",
  "details": {
    "answers.name": ["Este campo es obligatorio"],
    "answers.email": ["Ingrese un correo electrónico válido"]
  }
}
```

### 2. Get Survey Response

**Endpoint:** `GET /api/surveys/responses/:id`

Retrieve a survey response (typically for editing drafts).

#### Response

```json
{
  "success": true,
  "data": {
    "id": "response_uuid",
    "questionnaire_id": "ppd_voter_consultation_v1",
    "volunteer_id": "volunteer_uuid",
    "respondent_name": "Juan Pérez García",
    "respondent_email": "juan@example.com",
    "respondent_phone": "787-555-1234",
    "precinct_id": "001-001",
    "answers": [
      {
        "questionId": "name",
        "value": "Juan Pérez"
      }
    ],
    "is_complete": false,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:35:00Z"
  }
}
```

### 3. Update Survey Response

**Endpoint:** `PUT /api/surveys/responses/:id`

Update a draft survey response.

#### Request Body

Same as create request, but all fields are optional except `questionnaire_id`.

#### Response

```json
{
  "success": true,
  "data": {
    "id": "response_uuid",
    "status": "draft",
    "response_time": 850,
    "updated_at": "2024-01-15T10:35:00Z"
  }
}
```

### 4. Delete Survey Response

**Endpoint:** `DELETE /api/surveys/responses/:id`

Delete a draft survey response (only drafts can be deleted).

#### Response

```json
{
  "success": true,
  "message": "Borrador eliminado exitosamente"
}
```

### 5. Field Validation

**Endpoint:** `POST /api/surveys/validate`

Validate individual fields or batch of fields in real-time.

#### Single Field Validation

```json
{
  "questionnaire_id": "ppd_voter_consultation_v1",
  "question_id": "email",
  "answer_value": "invalid-email",
  "all_answers": {
    "name": "Juan Pérez",
    "email": "invalid-email"
  }
}
```

**Response:**
```json
{
  "valid": false,
  "field": "email",
  "message": "Ingrese un correo electrónico válido",
  "shouldShow": true
}
```

#### Batch Validation

```json
{
  "questionnaire_id": "ppd_voter_consultation_v1",
  "answers": {
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "phone": "787-555-1234",
    "age_range": "26-40"
  }
}
```

**Response:**
```json
{
  "valid": true,
  "results": {
    "name": {
      "valid": true,
      "message": null,
      "shouldShow": true
    },
    "email": {
      "valid": true,
      "message": null,
      "shouldShow": true
    }
  },
  "stats": {
    "total_questions": 32,
    "answered_questions": 4,
    "valid_answers": 4,
    "errors": 0,
    "completion_percentage": 12
  }
}
```

### 6. Get Validation Rules

**Endpoint:** `GET /api/surveys/validate?questionnaire_id=<id>`

Get validation rules for all questions in a questionnaire.

#### Response

```json
{
  "success": true,
  "questionnaire_id": "ppd_voter_consultation_v1",
  "sections": [
    {
      "title": "Información Personal",
      "order": 1,
      "questions": [
        {
          "id": "name",
          "text": "NOMBRE",
          "type": "text",
          "required": true,
          "validation": {
            "minLength": 2,
            "maxLength": 100
          },
          "conditional": null
        }
      ]
    }
  ],
  "total_questions": 32
}
```

### 7. Get Questionnaires

**Endpoint:** `GET /api/surveys/questionnaires`

Get active questionnaires for the user's tenant.

#### Query Parameters

- `include_structure=true`: Include sections and questions
- `id=<questionnaire_id>`: Get specific questionnaire

#### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "ppd_voter_consultation_v1",
      "title": "CONSULTA ELECTORAL Y COMUNITARIA",
      "description": "Encuesta para recopilar información electoral",
      "version": "1.0.0",
      "language": "es",
      "sections": [
        {
          "id": "demographics",
          "title": "Información Personal",
          "order": 1,
          "required": true,
          "questions": [...]
        }
      ],
      "metadata": {
        "total_questions": 32,
        "total_sections": 8,
        "estimated_completion_time": "10-15 minutos",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
        "is_active": true
      }
    }
  ]
}
```

## Error Handling

### Standard Error Response Format

```json
{
  "error": "User-friendly error message in Spanish",
  "code": "ERROR_CODE",
  "details": {
    "field_specific_errors": ["Error details"],
    "additional_context": "value"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED_ACCESS` | 401 | User not authenticated |
| `INVALID_USER_PROFILE` | 403 | User profile invalid or inactive |
| `VALIDATION_FAILED` | 400 | Data validation failed |
| `DUPLICATE_SUBMISSION` | 409 | Survey already submitted for respondent |
| `INVALID_QUESTIONNAIRE` | 400 | Questionnaire not found or inactive |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |

## Security Features

### Input Sanitization

All input data is automatically sanitized to prevent:
- SQL injection attacks
- XSS attacks
- Data corruption
- Excessive payload sizes

### Rate Limiting

Implemented at multiple levels:
- IP-based rate limiting
- User-based rate limiting
- Endpoint-specific limits

### Data Validation

- Server-side validation for all fields
- Business rule validation
- Conditional logic validation
- Cross-field validation

### Audit Logging

All API requests are logged with:
- User identification
- Timestamp
- Request details
- Response status
- Performance metrics

## Performance Optimizations

### Mobile Network Optimization

- Response compression (gzip)
- Minimal payload sizes
- Efficient database queries
- Connection pooling

### Caching Strategy

- Questionnaire structure caching
- Validation rules caching
- User profile caching

### Database Performance

- Optimized indexes
- Query performance monitoring
- Connection management
- Transaction optimization

## Monitoring and Analytics

### Performance Metrics

- Response time tracking
- Success/error rates
- User engagement metrics
- Device and network analytics

### Real-time Monitoring

Available metrics:
- Active submissions
- Average response time (5-min window)
- Error rate (5-min window)
- Rate limit violations

### Error Tracking

Comprehensive error logging with:
- Stack traces
- User context
- Request metadata
- Performance impact

## Best Practices

### Frontend Integration

1. **Always use HTTPS** in production
2. **Implement retry logic** for network failures
3. **Cache validation rules** to reduce API calls
4. **Use batch validation** for better performance
5. **Handle rate limiting** gracefully with user feedback

### Error Handling

1. **Display user-friendly messages** in Spanish
2. **Implement progressive enhancement** for poor connections
3. **Provide offline support** where possible
4. **Log client-side errors** for debugging

### Performance

1. **Minimize payload sizes** by only sending necessary data
2. **Use compression** for large requests
3. **Implement request debouncing** for real-time validation
4. **Cache frequently accessed data**

## Testing

### Unit Testing

Test coverage includes:
- Input validation
- Security measures
- Error handling
- Business logic

### Integration Testing

End-to-end testing of:
- Complete survey submission flow
- Draft save/resume functionality
- Validation workflows
- Error scenarios

### Load Testing

Performance testing under:
- High concurrent users
- Poor network conditions
- Large survey datasets
- Extended usage patterns

## Deployment Considerations

### Environment Variables

Required environment variables:
```env
DATABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
LOGGING_SERVICE_URL=your_logging_url
ANALYTICS_API_URL=your_analytics_url
NODE_ENV=production
```

### Production Setup

1. Configure rate limiting for your expected load
2. Set up external logging service integration
3. Configure analytics service integration
4. Set up monitoring and alerting
5. Configure SSL/TLS certificates
6. Set up CDN for static assets

## Support and Troubleshooting

### Common Issues

1. **Rate Limiting**: Implement exponential backoff
2. **Validation Errors**: Check field formats and requirements
3. **Performance Issues**: Monitor response times and optimize queries
4. **Authentication Errors**: Verify JWT token validity

### Debug Information

In development mode, detailed error information is provided in API responses. In production, sensitive details are omitted for security.

### Logging

All API interactions are logged with appropriate detail levels:
- `DEBUG`: Detailed request/response information
- `INFO`: Normal operation events
- `WARN`: Potential issues or unusual patterns
- `ERROR`: Actual errors requiring attention

---

This API documentation provides comprehensive coverage of all survey submission endpoints and their usage patterns. For additional technical support, refer to the project repository or contact the development team.