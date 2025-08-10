import { SurveySubmissionValidator } from '@/lib/validation/server-validation'
import type { QuestionnaireStructure } from '@/lib/validation/server-validation'

describe('SurveySubmissionValidator', () => {
  let validator: SurveySubmissionValidator
  let mockQuestionnaire: QuestionnaireStructure

  beforeEach(() => {
    validator = new SurveySubmissionValidator()
    
    // Mock PPD questionnaire structure
    mockQuestionnaire = {
      id: 'ppd_voter_consultation_v1',
      tenant_id: 'tenant-123',
      is_active: true,
      sections: [
        {
          id: 'demographics',
          questions: [
            {
              id: 'name',
              text: 'NOMBRE',
              type: 'text',
              is_required: true,
              order_index: 1,
              validation_rules: { minLength: 2, maxLength: 100 }
            },
            {
              id: 'gender',
              text: 'GÉNERO',
              type: 'radio',
              is_required: true,
              order_index: 2,
              options: [
                { value: 'M', label: 'Masculino' },
                { value: 'F', label: 'Femenino' }
              ]
            },
            {
              id: 'birth_date',
              text: 'FECHA DE NACIMIENTO',
              type: 'date',
              is_required: true,
              order_index: 3
            },
            {
              id: 'age_range',
              text: 'EDAD',
              type: 'radio',
              is_required: true,
              order_index: 4,
              options: [
                { value: '18-25', label: '18-25' },
                { value: '26-40', label: '26-40' },
                { value: '41-55', label: '41-55' },
                { value: '56+', label: '56 o más' }
              ]
            },
            {
              id: 'phone',
              text: 'TELÉFONO',
              type: 'tel',
              is_required: true,
              order_index: 5,
              validation_rules: { pattern: '^[0-9]{3}-[0-9]{3}-[0-9]{4}$' }
            },
            {
              id: 'email',
              text: 'CORREO ELECTRÓNICO',
              type: 'email',
              is_required: false,
              order_index: 6
            }
          ]
        },
        {
          id: 'household_voting',
          questions: [
            {
              id: 'family_voters_count',
              text: '¿Cuántos integrantes de su familia que residan con usted ejercen su derecho al voto?',
              type: 'scale',
              is_required: true,
              order_index: 7,
              validation_rules: { min: 0, max: 10 }
            }
          ]
        },
        {
          id: 'political_affiliation',
          questions: [
            {
              id: 'leans_to_party',
              text: '¿Se inclina hacia un partido político en específico?',
              type: 'radio',
              is_required: true,
              order_index: 8,
              options: [
                { value: 'SI', label: 'SÍ' },
                { value: 'NO', label: 'NO' }
              ]
            },
            {
              id: 'which_party',
              text: 'Si contestó SÍ, ¿A qué partido político se refiere?',
              type: 'radio',
              is_required: false,
              order_index: 9,
              conditional_logic: {
                questionId: 'leans_to_party',
                value: 'SI'
              },
              options: [
                { value: 'PPD', label: 'PPD' },
                { value: 'PNP', label: 'PNP' },
                { value: 'PIP', label: 'PIP' },
                { value: 'MVC', label: 'MVC' },
                { value: 'PD', label: 'PD' }
              ]
            }
          ]
        },
        {
          id: 'priorities',
          questions: [
            {
              id: 'top_5_priorities',
              text: '¿Cuáles deben ser para usted las 5 prioridades que se deben atender en su pueblo?',
              type: 'checkbox',
              is_required: true,
              order_index: 10,
              validation_rules: { minSelections: 1, maxSelections: 5 },
              options: [
                { value: 'salud', label: 'Salud' },
                { value: 'educacion', label: 'Educación' },
                { value: 'seguridad', label: 'Seguridad' },
                { value: 'desarrollo_economico', label: 'Desarrollo Económico' }
              ]
            }
          ]
        }
      ]
    }
  })

  describe('validateSurveySubmission', () => {
    it('should validate a complete valid submission', async () => {
      const validSubmission = {
        questionnaire_id: 'ppd_voter_consultation_v1',
        respondent_name: 'Juan Pérez',
        respondent_email: 'juan@example.com',
        respondent_phone: '787-123-4567',
        metadata: {
          start_time: new Date().toISOString(),
          completion_time: new Date(Date.now() + 300000).toISOString(),
          device_info: { user_agent: 'test', screen_size: '1920x1080' }
        },
        answers: [
          { question_id: 'name', answer_value: 'Juan Pérez' },
          { question_id: 'gender', answer_value: 'M' },
          { question_id: 'birth_date', answer_value: '1990-05-15' },
          { question_id: 'age_range', answer_value: '26-40' },
          { question_id: 'phone', answer_value: '787-123-4567' },
          { question_id: 'email', answer_value: 'juan@example.com' },
          { question_id: 'family_voters_count', answer_value: 3 },
          { question_id: 'leans_to_party', answer_value: 'SI' },
          { question_id: 'which_party', answer_value: 'PPD' },
          { question_id: 'top_5_priorities', answer_value: ['salud', 'educacion', 'seguridad'] }
        ],
        is_draft: false
      }

      const result = await validator.validateSurveySubmission(validSubmission, mockQuestionnaire)

      expect(result.isValid).toBe(true)
      expect(Object.keys(result.errors)).toHaveLength(0)
    })

    it('should reject submission with missing required fields', async () => {
      const invalidSubmission = {
        questionnaire_id: 'ppd_voter_consultation_v1',
        // Missing respondent_name
        metadata: {
          start_time: new Date().toISOString(),
          device_info: { user_agent: 'test', screen_size: '1920x1080' }
        },
        answers: [],
        is_draft: false
      }

      const result = await validator.validateSurveySubmission(invalidSubmission, mockQuestionnaire)

      expect(result.isValid).toBe(false)
      expect(result.errors.respondent_name).toBeDefined()
    })

    it('should validate email format', async () => {
      const submissionWithInvalidEmail = {
        questionnaire_id: 'ppd_voter_consultation_v1',
        respondent_name: 'Test User',
        respondent_email: 'invalid-email',
        metadata: {
          start_time: new Date().toISOString(),
          device_info: { user_agent: 'test', screen_size: '1920x1080' }
        },
        answers: [],
        is_draft: true
      }

      const result = await validator.validateSurveySubmission(submissionWithInvalidEmail, mockQuestionnaire)

      expect(result.isValid).toBe(false)
      expect(result.errors.respondent_email).toBeDefined()
    })

    it('should validate phone format', async () => {
      const submissionWithInvalidPhone = {
        questionnaire_id: 'ppd_voter_consultation_v1',
        respondent_name: 'Test User',
        respondent_phone: '123456789', // Invalid format
        metadata: {
          start_time: new Date().toISOString(),
          device_info: { user_agent: 'test', screen_size: '1920x1080' }
        },
        answers: [],
        is_draft: true
      }

      const result = await validator.validateSurveySubmission(submissionWithInvalidPhone, mockQuestionnaire)

      expect(result.isValid).toBe(false)
      expect(result.errors.respondent_phone).toBeDefined()
    })
  })

  describe('question type validation', () => {
    describe('text questions', () => {
      it('should validate name field with proper requirements', async () => {
        const submission = {
          questionnaire_id: 'test',
          respondent_name: 'Test',
          metadata: {
            start_time: new Date().toISOString(),
            device_info: { user_agent: 'test', screen_size: '1920x1080' }
          },
          answers: [
            { question_id: 'name', answer_value: 'A' } // Too short
          ],
          is_draft: true
        }

        const result = await validator.validateSurveySubmission(submission, mockQuestionnaire)

        expect(result.isValid).toBe(false)
        expect(result.errors['answers.name']).toBeDefined()
        expect(result.errors['answers.name'][0]).toContain('al menos 2 caracteres')
      })

      it('should reject name with invalid characters', async () => {
        const submission = {
          questionnaire_id: 'test',
          respondent_name: 'Test',
          metadata: {
            start_time: new Date().toISOString(),
            device_info: { user_agent: 'test', screen_size: '1920x1080' }
          },
          answers: [
            { question_id: 'name', answer_value: 'John123!' } // Invalid characters
          ],
          is_draft: true
        }

        const result = await validator.validateSurveySubmission(submission, mockQuestionnaire)

        expect(result.isValid).toBe(false)
        expect(result.errors['answers.name']).toBeDefined()
      })
    })

    describe('radio questions', () => {
      it('should validate gender selection', async () => {
        const submission = {
          questionnaire_id: 'test',
          respondent_name: 'Test',
          metadata: {
            start_time: new Date().toISOString(),
            device_info: { user_agent: 'test', screen_size: '1920x1080' }
          },
          answers: [
            { question_id: 'gender', answer_value: 'M' }
          ],
          is_draft: true
        }

        const result = await validator.validateSurveySubmission(submission, mockQuestionnaire)

        expect(result.isValid).toBe(true)
      })

      it('should reject invalid gender selection', async () => {
        const submission = {
          questionnaire_id: 'test',
          respondent_name: 'Test',
          metadata: {
            start_time: new Date().toISOString(),
            device_info: { user_agent: 'test', screen_size: '1920x1080' }
          },
          answers: [
            { question_id: 'gender', answer_value: 'X' } // Invalid option
          ],
          is_draft: true
        }

        const result = await validator.validateSurveySubmission(submission, mockQuestionnaire)

        expect(result.isValid).toBe(false)
        expect(result.errors['answers.gender']).toBeDefined()
      })

      it('should validate age range selection', async () => {
        const testCases = ['18-25', '26-40', '41-55', '56+']

        for (const ageRange of testCases) {
          const submission = {
            questionnaire_id: 'test',
            respondent_name: 'Test',
            metadata: {
              start_time: new Date().toISOString(),
              device_info: { user_agent: 'test', screen_size: '1920x1080' }
            },
            answers: [
              { question_id: 'age_range', answer_value: ageRange }
            ],
            is_draft: true
          }

          const result = await validator.validateSurveySubmission(submission, mockQuestionnaire)
          expect(result.isValid).toBe(true)
        }
      })
    })

    describe('date questions', () => {
      it('should validate birth date in the past', async () => {
        const submission = {
          questionnaire_id: 'test',
          respondent_name: 'Test',
          metadata: {
            start_time: new Date().toISOString(),
            device_info: { user_agent: 'test', screen_size: '1920x1080' }
          },
          answers: [
            { question_id: 'birth_date', answer_value: '1990-05-15' }
          ],
          is_draft: true
        }

        const result = await validator.validateSurveySubmission(submission, mockQuestionnaire)

        expect(result.isValid).toBe(true)
      })

      it('should reject future birth date', async () => {
        const futureDate = new Date()
        futureDate.setFullYear(futureDate.getFullYear() + 1)

        const submission = {
          questionnaire_id: 'test',
          respondent_name: 'Test',
          metadata: {
            start_time: new Date().toISOString(),
            device_info: { user_agent: 'test', screen_size: '1920x1080' }
          },
          answers: [
            { question_id: 'birth_date', answer_value: futureDate.toISOString().split('T')[0] }
          ],
          is_draft: true
        }

        const result = await validator.validateSurveySubmission(submission, mockQuestionnaire)

        expect(result.isValid).toBe(false)
        expect(result.errors['answers.birth_date']).toBeDefined()
      })

      it('should reject birth date for underage person', async () => {
        const underageDate = new Date()
        underageDate.setFullYear(underageDate.getFullYear() - 16)

        const submission = {
          questionnaire_id: 'test',
          respondent_name: 'Test',
          metadata: {
            start_time: new Date().toISOString(),
            device_info: { user_agent: 'test', screen_size: '1920x1080' }
          },
          answers: [
            { question_id: 'birth_date', answer_value: underageDate.toISOString().split('T')[0] }
          ],
          is_draft: true
        }

        const result = await validator.validateSurveySubmission(submission, mockQuestionnaire)

        expect(result.isValid).toBe(false)
        expect(result.errors['answers.birth_date']).toBeDefined()
        expect(result.errors['answers.birth_date'][0]).toContain('18 años')
      })
    })

    describe('tel questions', () => {
      it('should validate proper phone format', async () => {
        const submission = {
          questionnaire_id: 'test',
          respondent_name: 'Test',
          metadata: {
            start_time: new Date().toISOString(),
            device_info: { user_agent: 'test', screen_size: '1920x1080' }
          },
          answers: [
            { question_id: 'phone', answer_value: '787-123-4567' }
          ],
          is_draft: true
        }

        const result = await validator.validateSurveySubmission(submission, mockQuestionnaire)

        expect(result.isValid).toBe(true)
      })

      it('should reject invalid phone formats', async () => {
        const invalidFormats = [
          '1234567890',
          '787.123.4567',
          '787-123-456',
          '787-1234-567',
          'abc-def-ghij'
        ]

        for (const invalidPhone of invalidFormats) {
          const submission = {
            questionnaire_id: 'test',
            respondent_name: 'Test',
            metadata: {
              start_time: new Date().toISOString(),
              device_info: { user_agent: 'test', screen_size: '1920x1080' }
            },
            answers: [
              { question_id: 'phone', answer_value: invalidPhone }
            ],
            is_draft: true
          }

          const result = await validator.validateSurveySubmission(submission, mockQuestionnaire)
          expect(result.isValid).toBe(false)
          expect(result.errors['answers.phone']).toBeDefined()
        }
      })
    })

    describe('scale questions', () => {
      it('should validate family voters count', async () => {
        const validCounts = [0, 1, 5, 10]

        for (const count of validCounts) {
          const submission = {
            questionnaire_id: 'test',
            respondent_name: 'Test',
            metadata: {
              start_time: new Date().toISOString(),
              device_info: { user_agent: 'test', screen_size: '1920x1080' }
            },
            answers: [
              { question_id: 'family_voters_count', answer_value: count }
            ],
            is_draft: true
          }

          const result = await validator.validateSurveySubmission(submission, mockQuestionnaire)
          expect(result.isValid).toBe(true)
        }
      })

      it('should reject out-of-range family voters count', async () => {
        const invalidCounts = [-1, 11, 15]

        for (const count of invalidCounts) {
          const submission = {
            questionnaire_id: 'test',
            respondent_name: 'Test',
            metadata: {
              start_time: new Date().toISOString(),
              device_info: { user_agent: 'test', screen_size: '1920x1080' }
            },
            answers: [
              { question_id: 'family_voters_count', answer_value: count }
            ],
            is_draft: true
          }

          const result = await validator.validateSurveySubmission(submission, mockQuestionnaire)
          expect(result.isValid).toBe(false)
          expect(result.errors['answers.family_voters_count']).toBeDefined()
        }
      })

      it('should reject non-integer family voters count', async () => {
        const submission = {
          questionnaire_id: 'test',
          respondent_name: 'Test',
          metadata: {
            start_time: new Date().toISOString(),
            device_info: { user_agent: 'test', screen_size: '1920x1080' }
          },
          answers: [
            { question_id: 'family_voters_count', answer_value: 2.5 }
          ],
          is_draft: true
        }

        const result = await validator.validateSurveySubmission(submission, mockQuestionnaire)

        expect(result.isValid).toBe(false)
        expect(result.errors['answers.family_voters_count']).toBeDefined()
        expect(result.errors['answers.family_voters_count'][0]).toContain('entero')
      })
    })

    describe('checkbox questions', () => {
      it('should validate priority selections within limits', async () => {
        const submission = {
          questionnaire_id: 'test',
          respondent_name: 'Test',
          metadata: {
            start_time: new Date().toISOString(),
            device_info: { user_agent: 'test', screen_size: '1920x1080' }
          },
          answers: [
            { question_id: 'top_5_priorities', answer_value: ['salud', 'educacion', 'seguridad'] }
          ],
          is_draft: true
        }

        const result = await validator.validateSurveySubmission(submission, mockQuestionnaire)

        expect(result.isValid).toBe(true)
      })

      it('should reject too many priority selections', async () => {
        const submission = {
          questionnaire_id: 'test',
          respondent_name: 'Test',
          metadata: {
            start_time: new Date().toISOString(),
            device_info: { user_agent: 'test', screen_size: '1920x1080' }
          },
          answers: [
            { question_id: 'top_5_priorities', answer_value: ['salud', 'educacion', 'seguridad', 'desarrollo_economico', 'invalid1', 'invalid2'] }
          ],
          is_draft: true
        }

        const result = await validator.validateSurveySubmission(submission, mockQuestionnaire)

        expect(result.isValid).toBe(false)
        expect(result.errors['answers.top_5_priorities']).toBeDefined()
      })

      it('should reject invalid priority options', async () => {
        const submission = {
          questionnaire_id: 'test',
          respondent_name: 'Test',
          metadata: {
            start_time: new Date().toISOString(),
            device_info: { user_agent: 'test', screen_size: '1920x1080' }
          },
          answers: [
            { question_id: 'top_5_priorities', answer_value: ['salud', 'invalid_priority'] }
          ],
          is_draft: true
        }

        const result = await validator.validateSurveySubmission(submission, mockQuestionnaire)

        expect(result.isValid).toBe(false)
        expect(result.errors['answers.top_5_priorities']).toBeDefined()
        expect(result.errors['answers.top_5_priorities'][0]).toContain('no válidas')
      })
    })
  })

  describe('conditional logic validation', () => {
    it('should validate conditional questions when condition is met', async () => {
      const submission = {
        questionnaire_id: 'test',
        respondent_name: 'Test',
        metadata: {
          start_time: new Date().toISOString(),
          device_info: { user_agent: 'test', screen_size: '1920x1080' }
        },
        answers: [
          { question_id: 'leans_to_party', answer_value: 'SI' },
          { question_id: 'which_party', answer_value: 'PPD' }
        ],
        is_draft: false
      }

      const result = await validator.validateSurveySubmission(submission, mockQuestionnaire)

      expect(result.isValid).toBe(true)
    })

    it('should skip conditional questions when condition is not met', async () => {
      const submission = {
        questionnaire_id: 'test',
        respondent_name: 'Test',
        metadata: {
          start_time: new Date().toISOString(),
          device_info: { user_agent: 'test', screen_size: '1920x1080' }
        },
        answers: [
          { question_id: 'leans_to_party', answer_value: 'NO' }
          // which_party should not be required when leans_to_party is NO
        ],
        is_draft: false
      }

      const result = await validator.validateSurveySubmission(submission, mockQuestionnaire)

      expect(result.isValid).toBe(true)
    })
  })

  describe('business rules validation', () => {
    it('should validate age consistency between birth date and age range', async () => {
      const submission = {
        questionnaire_id: 'test',
        respondent_name: 'Test',
        metadata: {
          start_time: new Date().toISOString(),
          device_info: { user_agent: 'test', screen_size: '1920x1080' }
        },
        answers: [
          { question_id: 'birth_date', answer_value: '1995-05-15' },
          { question_id: 'age_range', answer_value: '26-40' } // Should match
        ],
        is_draft: false
      }

      const result = await validator.validateSurveySubmission(submission, mockQuestionnaire)

      expect(result.isValid).toBe(true)
    })

    it('should reject age inconsistency', async () => {
      const submission = {
        questionnaire_id: 'test',
        respondent_name: 'Test',
        metadata: {
          start_time: new Date().toISOString(),
          device_info: { user_agent: 'test', screen_size: '1920x1080' }
        },
        answers: [
          { question_id: 'birth_date', answer_value: '1995-05-15' }, // ~29 years old
          { question_id: 'age_range', answer_value: '18-25' } // Inconsistent
        ],
        is_draft: false
      }

      const result = await validator.validateSurveySubmission(submission, mockQuestionnaire)

      expect(result.isValid).toBe(false)
      expect(result.errors['business_rules.age_consistency']).toBeDefined()
    })
  })

  describe('security validation', () => {
    it('should detect SQL injection attempts', async () => {
      const submission = {
        questionnaire_id: 'test',
        respondent_name: 'Test',
        metadata: {
          start_time: new Date().toISOString(),
          device_info: { user_agent: 'test', screen_size: '1920x1080' }
        },
        answers: [
          { question_id: 'name', answer_value: "'; DROP TABLE users; --" }
        ],
        is_draft: true
      }

      const result = await validator.validateSurveySubmission(submission, mockQuestionnaire)

      expect(result.isValid).toBe(false)
      expect(result.errors['answers.name']).toBeDefined()
      expect(result.errors['answers.name'][0]).toContain('caracteres no permitidos')
    })

    it('should detect XSS attempts', async () => {
      const submission = {
        questionnaire_id: 'test',
        respondent_name: 'Test',
        metadata: {
          start_time: new Date().toISOString(),
          device_info: { user_agent: 'test', screen_size: '1920x1080' }
        },
        answers: [
          { question_id: 'name', answer_value: '<script>alert("xss")</script>' }
        ],
        is_draft: true
      }

      const result = await validator.validateSurveySubmission(submission, mockQuestionnaire)

      expect(result.isValid).toBe(false)
      expect(result.errors['answers.name']).toBeDefined()
      expect(result.errors['answers.name'][0]).toContain('contenido no permitido')
    })

    it('should reject excessively long input', async () => {
      const longString = 'A'.repeat(11000) // Exceeds 10000 character limit

      const submission = {
        questionnaire_id: 'test',
        respondent_name: 'Test',
        metadata: {
          start_time: new Date().toISOString(),
          device_info: { user_agent: 'test', screen_size: '1920x1080' }
        },
        answers: [
          { question_id: 'name', answer_value: longString }
        ],
        is_draft: true
      }

      const result = await validator.validateSurveySubmission(submission, mockQuestionnaire)

      expect(result.isValid).toBe(false)
      expect(result.errors['answers.name']).toBeDefined()
      expect(result.errors['answers.name'][0]).toContain('longitud máxima')
    })
  })

  describe('completion percentage calculation', () => {
    it('should calculate completion percentage for partial submissions', () => {
      const answers = [
        { question_id: 'name', answer_value: 'Test User' },
        { question_id: 'gender', answer_value: 'M' },
        { question_id: 'birth_date', answer_value: '1990-01-01' }
        // Missing other required questions
      ]

      const percentage = validator.getCompletionPercentage(answers, mockQuestionnaire)

      expect(percentage).toBeGreaterThan(0)
      expect(percentage).toBeLessThan(100)
    })

    it('should return 100% for complete submissions', () => {
      const completeAnswers = [
        { question_id: 'name', answer_value: 'Test User' },
        { question_id: 'gender', answer_value: 'M' },
        { question_id: 'birth_date', answer_value: '1990-01-01' },
        { question_id: 'age_range', answer_value: '26-40' },
        { question_id: 'phone', answer_value: '787-123-4567' },
        { question_id: 'email', answer_value: 'test@example.com' },
        { question_id: 'family_voters_count', answer_value: 2 },
        { question_id: 'leans_to_party', answer_value: 'SI' },
        { question_id: 'which_party', answer_value: 'PPD' },
        { question_id: 'top_5_priorities', answer_value: ['salud', 'educacion'] }
      ]

      const percentage = validator.getCompletionPercentage(completeAnswers, mockQuestionnaire)

      expect(percentage).toBe(100)
    })

    it('should handle conditional questions in completion calculation', () => {
      const answersWithoutConditional = [
        { question_id: 'name', answer_value: 'Test User' },
        { question_id: 'gender', answer_value: 'M' },
        { question_id: 'birth_date', answer_value: '1990-01-01' },
        { question_id: 'age_range', answer_value: '26-40' },
        { question_id: 'phone', answer_value: '787-123-4567' },
        { question_id: 'email', answer_value: 'test@example.com' },
        { question_id: 'family_voters_count', answer_value: 2 },
        { question_id: 'leans_to_party', answer_value: 'NO' }, // Conditional trigger is NO
        { question_id: 'top_5_priorities', answer_value: ['salud', 'educacion'] }
        // which_party should not be counted since condition is not met
      ]

      const percentage = validator.getCompletionPercentage(answersWithoutConditional, mockQuestionnaire)

      expect(percentage).toBe(100) // Should be 100% even without conditional question
    })
  })

  describe('validation summary', () => {
    it('should provide detailed validation summary', () => {
      const answers = [
        { question_id: 'name', answer_value: 'Test User' },
        { question_id: 'gender', answer_value: 'M' },
        { question_id: 'leans_to_party', answer_value: 'SI' },
        { question_id: 'which_party', answer_value: 'PPD' }
      ]

      const summary = validator.getValidationSummary(answers, mockQuestionnaire)

      expect(summary).toHaveProperty('totalQuestions')
      expect(summary).toHaveProperty('applicableQuestions')
      expect(summary).toHaveProperty('answeredQuestions')
      expect(summary).toHaveProperty('requiredQuestions')
      expect(summary).toHaveProperty('requiredAnswered')
      expect(summary).toHaveProperty('completionPercentage')
      expect(summary).toHaveProperty('missingRequired')
      expect(summary).toHaveProperty('conditionalQuestions')

      expect(summary.totalQuestions).toBe(10) // All questions in mock
      expect(summary.answeredQuestions).toBe(4)
      expect(Array.isArray(summary.missingRequired)).toBe(true)
      expect(Array.isArray(summary.conditionalQuestions)).toBe(true)
      expect(summary.conditionalQuestions).toContain('which_party')
    })
  })
})