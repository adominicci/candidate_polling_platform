#!/usr/bin/env node

/**
 * Survey Data Validation Script for PPD Candidate Polling Platform
 * Story 2.1: Survey Question Configuration - Data Validation
 * 
 * This script validates that survey_questions.json data was correctly imported 
 * into the Supabase database and verifies data integrity.
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Read environment variables from .env.local file
function loadEnvVars() {
  const envPath = path.join(__dirname, '../.env.local')
  const envVars = {}
  
  try {
    const envContent = fs.readFileSync(envPath, 'utf8')
    const lines = envContent.split('\n')
    
    for (const line of lines) {
      const match = line.match(/^([^#][^=]*?)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const value = match[2].trim().replace(/^["']|["']$/g, '')
        envVars[key] = value
      }
    }
  } catch (error) {
    console.error('❌ Error reading .env.local file:', error.message)
  }
  
  return envVars
}

const envVars = loadEnvVars()

// Supabase configuration
const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const QUESTIONNAIRE_UUID = '42bbe52f-663d-56f3-a88a-542547be240d'

// Function to generate deterministic UUID from string (same as migration script)
function generateDeterministicUUID(input) {
  const crypto = require('crypto')
  const hash = crypto.createHash('md5').update(input).digest('hex')
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '4' + hash.slice(13, 16), // Version 4
    '8' + hash.slice(17, 20), // Variant bits
    hash.slice(20, 32)
  ].join('-')
}

async function loadOriginalSurveyData() {
  const surveyDataPath = path.join(__dirname, '../public/survey_questions.json')
  const rawData = fs.readFileSync(surveyDataPath, 'utf8')
  return JSON.parse(rawData)
}

async function validateQuestionnaire() {
  console.log('🔍 Validating questionnaire...')
  
  const { data: questionnaire, error } = await supabase
    .from('questionnaires')
    .select('*')
    .eq('id', QUESTIONNAIRE_UUID)
    .single()

  if (error || !questionnaire) {
    console.error('❌ Questionnaire not found:', error?.message)
    return false
  }

  console.log('✅ Questionnaire found:')
  console.log(`   - ID: ${questionnaire.id}`)
  console.log(`   - Title: ${questionnaire.titulo}`)
  console.log(`   - Version: ${questionnaire.version}`)
  console.log(`   - Status: ${questionnaire.estado}`)
  console.log(`   - Total Sections: ${questionnaire.total_secciones}`)
  console.log(`   - Total Questions: ${questionnaire.total_preguntas}`)
  
  return true
}

async function validateSections(originalData) {
  console.log('🔍 Validating sections...')
  
  const { data: sections, error } = await supabase
    .from('sections')
    .select('*')
    .eq('questionnaire_id', QUESTIONNAIRE_UUID)
    .order('orden')

  if (error) {
    console.error('❌ Error fetching sections:', error.message)
    return false
  }

  const originalSections = originalData.questionnaire.sections
  
  if (sections.length !== originalSections.length) {
    console.error(`❌ Section count mismatch: Expected ${originalSections.length}, got ${sections.length}`)
    return false
  }

  console.log(`✅ Found ${sections.length} sections`)
  
  for (let i = 0; i < originalSections.length; i++) {
    const original = originalSections[i]
    // Find section by generating the same UUID we used in migration
    const expectedSectionId = generateDeterministicUUID(`section_${original.id}`)
    const dbSection = sections.find(s => s.id === expectedSectionId)
    
    if (!dbSection) {
      console.error(`❌ Section '${original.id}' not found in database`)
      return false
    }
    
    if (dbSection.titulo !== original.title) {
      console.error(`❌ Section title mismatch for '${original.id}': Expected '${original.title}', got '${dbSection.titulo}'`)
      return false
    }
    
    if (dbSection.orden !== original.order) {
      console.error(`❌ Section order mismatch for '${original.id}': Expected ${original.order}, got ${dbSection.orden}`)
      return false
    }
    
    console.log(`   ✅ Section ${i + 1}: ${dbSection.titulo} (${dbSection.id})`)
  }
  
  return true
}

async function validateQuestions(originalData) {
  console.log('🔍 Validating questions...')
  
  const { data: questions, error } = await supabase
    .from('questions')
    .select(`
      *,
      sections!inner(questionnaire_id)
    `)
    .eq('sections.questionnaire_id', QUESTIONNAIRE_UUID)
    .order('orden')

  if (error) {
    console.error('❌ Error fetching questions:', error.message)
    return false
  }

  const originalSections = originalData.questionnaire.sections
  const totalOriginalQuestions = originalSections.reduce((sum, section) => sum + section.questions.length, 0)
  
  if (questions.length !== totalOriginalQuestions) {
    console.error(`❌ Question count mismatch: Expected ${totalOriginalQuestions}, got ${questions.length}`)
    return false
  }

  console.log(`✅ Found ${questions.length} questions`)
  
  // Validate each question
  let validationErrors = []
  
  for (const section of originalSections) {
    const expectedSectionId = generateDeterministicUUID(`section_${section.id}`)
    const sectionQuestions = questions.filter(q => q.section_id === expectedSectionId)
    
    if (sectionQuestions.length !== section.questions.length) {
      validationErrors.push(`Section '${section.id}' question count mismatch: Expected ${section.questions.length}, got ${sectionQuestions.length}`)
      continue
    }
    
    for (let i = 0; i < section.questions.length; i++) {
      const original = section.questions[i]
      const expectedQuestionId = generateDeterministicUUID(`question_${original.id}`)
      const dbQuestion = sectionQuestions.find(q => q.id === expectedQuestionId)
      
      if (!dbQuestion) {
        validationErrors.push(`Question '${original.id}' not found in section '${section.id}'`)
        continue
      }
      
      // Validate question properties
      if (dbQuestion.titulo !== original.text) {
        validationErrors.push(`Question '${original.id}' text mismatch`)
      }
      
      // Allow type mapping for email/tel to text
      if (dbQuestion.tipo !== original.type && 
          !(original.type === 'email' && dbQuestion.tipo === 'text') &&
          !(original.type === 'tel' && dbQuestion.tipo === 'text')) {
        validationErrors.push(`Question '${original.id}' type mismatch: Expected '${original.type}', got '${dbQuestion.tipo}'`)
      }
      
      if (dbQuestion.requerida !== (original.required || false)) {
        validationErrors.push(`Question '${original.id}' required flag mismatch`)
      }
      
      // Validate options for radio/checkbox questions
      if (original.options && original.options.length > 0) {
        if (!dbQuestion.opciones || !Array.isArray(dbQuestion.opciones)) {
          validationErrors.push(`Question '${original.id}' missing options`)
        } else if (dbQuestion.opciones.length !== original.options.length) {
          validationErrors.push(`Question '${original.id}' option count mismatch`)
        }
      }
      
      // Validate conditional logic
      if (original.conditional && !dbQuestion.condiciones_visibilidad) {
        validationErrors.push(`Question '${original.id}' missing conditional logic`)
      }
    }
  }
  
  if (validationErrors.length > 0) {
    console.error(`❌ Found ${validationErrors.length} validation errors:`)
    validationErrors.forEach(error => console.error(`   - ${error}`))
    return false
  }
  
  console.log('✅ All questions validated successfully')
  return true
}

async function validateQuestionTypes() {
  console.log('🔍 Validating question types...')
  
  const { data: questions, error } = await supabase
    .from('questions')
    .select(`
      id, titulo, tipo,
      sections!inner(questionnaire_id)
    `)
    .eq('sections.questionnaire_id', QUESTIONNAIRE_UUID)

  if (error) {
    console.error('❌ Error fetching questions for type validation:', error.message)
    return false
  }

  const validTypes = ['text', 'radio', 'checkbox', 'scale', 'date', 'email', 'tel', 'textarea']
  const typeCount = {}
  
  for (const question of questions) {
    if (!validTypes.includes(question.tipo)) {
      console.error(`❌ Invalid question type '${question.tipo}' for question '${question.id}'`)
      return false
    }
    
    typeCount[question.tipo] = (typeCount[question.tipo] || 0) + 1
  }
  
  console.log('✅ Question type distribution:')
  Object.entries(typeCount).forEach(([type, count]) => {
    console.log(`   - ${type}: ${count} questions`)
  })
  
  return true
}

async function validateSpanishContent() {
  console.log('🔍 Validating Spanish content...')
  
  const { data: questionnaire, error: qError } = await supabase
    .from('questionnaires')
    .select('titulo, descripcion, configuracion_formulario')
    .eq('id', QUESTIONNAIRE_UUID)
    .single()

  if (qError) {
    console.error('❌ Error fetching questionnaire for language validation:', qError.message)
    return false
  }

  // Check if Spanish characters are preserved
  if (!questionnaire.titulo.includes('ELECTORAL')) {
    console.error('❌ Questionnaire title may have encoding issues')
    return false
  }

  const { data: sections, error: sError } = await supabase
    .from('sections')
    .select('titulo')
    .eq('questionnaire_id', QUESTIONNAIRE_UUID)

  if (sError) {
    console.error('❌ Error fetching sections for language validation:', sError.message)
    return false
  }

  // Check for Spanish accents and characters
  const spanishSections = sections.filter(s => 
    s.titulo.includes('ó') || s.titulo.includes('í') || s.titulo.includes('é')
  )

  if (spanishSections.length === 0) {
    console.warn('⚠️  Warning: No Spanish accents found in section titles - check encoding')
  }

  console.log('✅ Spanish content validation completed')
  return true
}

async function validateApiEndpoint() {
  console.log('🔍 Validating API endpoint...')
  
  try {
    // Test the API endpoint directly
    const response = await fetch(`${supabaseUrl}/rest/v1/questionnaires?id=eq.${QUESTIONNAIRE_UUID}&select=*`, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      console.error(`❌ API endpoint returned status ${response.status}`)
      return false
    }
    
    const data = await response.json()
    
    if (!data || data.length === 0) {
      console.error('❌ API endpoint returned no data')
      return false
    }
    
    console.log('✅ API endpoint validation successful')
    return true
    
  } catch (error) {
    console.error('❌ API endpoint validation failed:', error.message)
    return false
  }
}

async function main() {
  console.log('🚀 Starting Survey Data Validation...')
  console.log(`📍 Database: ${supabaseUrl}`)
  console.log(`📊 Questionnaire ID: ${QUESTIONNAIRE_UUID}`)
  console.log('─'.repeat(60))

  try {
    const originalData = await loadOriginalSurveyData()
    
    const validations = [
      { name: 'Questionnaire', fn: () => validateQuestionnaire() },
      { name: 'Sections', fn: () => validateSections(originalData) },
      { name: 'Questions', fn: () => validateQuestions(originalData) },
      { name: 'Question Types', fn: () => validateQuestionTypes() },
      { name: 'Spanish Content', fn: () => validateSpanishContent() },
      { name: 'API Endpoint', fn: () => validateApiEndpoint() }
    ]
    
    const results = []
    
    for (const validation of validations) {
      console.log(`\n${validation.name} Validation:`)
      const result = await validation.fn()
      results.push({ name: validation.name, success: result })
    }
    
    console.log('\n' + '─'.repeat(60))
    console.log('📋 VALIDATION SUMMARY')
    console.log('─'.repeat(60))
    
    const passed = results.filter(r => r.success).length
    const total = results.length
    
    results.forEach(result => {
      const icon = result.success ? '✅' : '❌'
      console.log(`${icon} ${result.name}: ${result.success ? 'PASSED' : 'FAILED'}`)
    })
    
    console.log('─'.repeat(60))
    console.log(`🎯 Overall Result: ${passed}/${total} validations passed`)
    
    if (passed === total) {
      console.log('🎉 All validations passed! Survey Question Configuration is complete.')
      console.log('✅ Story 2.1 acceptance criteria can be marked as COMPLETED.')
      console.log('🚀 The survey system is ready for frontend integration.')
    } else {
      console.log('⚠️  Some validations failed. Please review and fix issues.')
      process.exit(1)
    }
    
  } catch (error) {
    console.error('💥 Validation failed:', error.message)
    process.exit(1)
  }
}

// Run the validation
if (require.main === module) {
  main()
}

module.exports = { main }