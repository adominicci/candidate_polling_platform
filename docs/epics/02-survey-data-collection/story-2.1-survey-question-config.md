# Story 2.1: Survey Question Configuration

**Epic**: Survey Data Collection  
**Assigned Agent**: 🗄️ Database Architect  
**Story Points**: 5  
**Priority**: High  
**Sprint**: 2

## User Story
**As a** campaign admin  
**I want** survey questions loaded from the JSON structure  
**So that** volunteers can collect structured voter data  

## Acceptance Criteria
- [ ] Survey questions imported from survey_questions.json
- [ ] Question types properly mapped (text, radio, checkbox, etc.)
- [ ] Conditional question logic supported
- [ ] Question validation rules implemented
- [ ] Spanish language support for all questions
- [ ] Question metadata preserved

## Technical Requirements
### Question Types to Support
From survey_questions.json:
- `text` - Free text input
- `email` - Email validation
- `tel` - Phone number validation  
- `date` - Date picker
- `radio` - Single selection
- `checkbox` - Multiple selection with limits
- `scale` - Numeric range (0-10)
- `textarea` - Long text input

### Database Import Process
1. Parse survey_questions.json structure
2. Create questionnaire record with version
3. Import sections with proper ordering
4. Import questions with all metadata
5. Handle conditional question logic
6. Validate question options and validation rules

### Conditional Logic Implementation
```json
{
  "conditional": {
    "questionId": "leans_to_party",
    "value": "SI"
  }
}
```

## Definition of Done
- [ ] Database migration script creates questionnaire
- [ ] All 8 sections imported correctly
- [ ] All 31 questions imported with proper types
- [ ] Question options imported for radio/checkbox
- [ ] Validation rules imported and testable
- [ ] Conditional logic rules stored correctly
- [ ] Spanish text preserved exactly as in JSON
- [ ] Question ordering maintained
- [ ] Database queries return proper structure for frontend
- [ ] Sample survey response can be created

## Survey Structure Validation
### Section Import Checklist
- [ ] Información Personal (8 questions)
- [ ] Información del Hogar (4 questions)  
- [ ] Historial de Votación (4 questions)
- [ ] Modalidad de Voto (6 questions)
- [ ] Afiliación Política (3 questions)
- [ ] Prioridades (2 questions)
- [ ] Asuntos Comunitarios (2 questions)
- [ ] Evaluación Partidista (2 questions)

### Question Type Distribution
- [ ] Text inputs: 7 questions
- [ ] Radio buttons: 16 questions
- [ ] Email: 1 question
- [ ] Phone: 1 question
- [ ] Date: 1 question
- [ ] Scale: 1 question
- [ ] Checkbox: 1 question (with 5 max selections)
- [ ] Textarea: 4 questions

## Dependencies
- Database schema completed (Story 1.1)
- survey_questions.json file available
- Questionnaire and questions tables created

## Blockers/Risks
- JSON parsing complexity
- Conditional logic database representation
- Question validation rule complexity

## Testing Checklist
- [ ] JSON import completes without errors
- [ ] All questions accessible via API
- [ ] Question options load correctly
- [ ] Validation rules work as expected
- [ ] Conditional logic evaluates correctly
- [ ] Spanish characters display properly
- [ ] Question ordering preserved
- [ ] Database constraints prevent invalid data

## API Requirements
Frontend needs to query:
```sql
-- Get active questionnaire with sections and questions
SELECT q.*, s.*, qu.*
FROM questionnaires q
JOIN sections s ON q.id = s.questionnaire_id  
JOIN questions qu ON s.id = qu.section_id
WHERE q.is_active = true
ORDER BY s.order_num, qu.order_num;
```

## Resources
- survey_questions.json file in project root
- Database schema documentation
- Question type validation patterns
- Spanish language validation requirements