#!/usr/bin/env node

/**
 * Database Migration Script for PPD Candidate Polling Platform
 * Epic 2 - Survey Data Collection Database Integration
 * 
 * This script imports survey_questions.json data into Supabase database tables:
 * - questionnaires
 * - sections  
 * - questions
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

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
        const value = match[2].trim().replace(/^["']|["']$/g, '') // Remove quotes
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
  console.error('\nMake sure to set these in your .env.local file')
  process.exit(1)
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Default tenant ID - using UUID from existing tenant
const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000'

// Use deterministic UUID for questionnaire (generated from 'ppd_voter_consultation_v1')
const QUESTIONNAIRE_UUID = '42bbe52f-663d-56f3-a88a-542547be240d'

// Function to generate deterministic UUID from string
function generateDeterministicUUID(input) {
  const hash = crypto.createHash('md5').update(input).digest('hex')
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '4' + hash.slice(13, 16), // Version 4
    '8' + hash.slice(17, 20), // Variant bits
    hash.slice(20, 32)
  ].join('-')
}

// Map survey question types to database enum types
// Based on actual database enum values
function mapQuestionType(surveyType) {
  const typeMap = {
    'text': 'text',
    'email': 'text',        // Map email to text for now
    'tel': 'text',          // Map tel to text for now
    'date': 'date',
    'radio': 'radio',
    'checkbox': 'checkbox',
    'scale': 'scale',
    'textarea': 'textarea'
  }
  
  return typeMap[surveyType] || 'text' // Default to text if unknown
}

async function loadSurveyData() {
  try {
    const surveyDataPath = path.join(__dirname, '../public/survey_questions.json')
    const rawData = fs.readFileSync(surveyDataPath, 'utf8')
    return JSON.parse(rawData)
  } catch (error) {
    console.error('❌ Error loading survey_questions.json:', error.message)
    process.exit(1)
  }
}

async function insertQuestionnaire(questionnaire) {
  console.log('📝 Inserting questionnaire...')
  
  const { data, error } = await supabase
    .from('questionnaires')
    .upsert({
      id: QUESTIONNAIRE_UUID,
      tenant_id: DEFAULT_TENANT_ID,
      created_by_user_id: '00000000-0000-0000-0000-000000000001', // System user
      titulo: questionnaire.title,
      descripcion: 'Cuestionario para consulta electoral y comunitaria del PPD',
      version: questionnaire.version,
      estado: 'Activo',
      configuracion_formulario: {
        language: questionnaire.language,
        estimated_completion_time: questionnaire.metadata?.estimated_completion_time || '10-15 minutes',
        mobile_optimized: true,
        allow_partial_save: true
      },
      metadatos: {
        ...questionnaire.metadata,
        source: questionnaire.metadata?.source || 'CUESTIONARIO CONSULTA DISTRITO 23',
        total_questions: 31,
        total_sections: 8
      },
    })
    .select()

  if (error) {
    console.error('❌ Error inserting questionnaire:', error.message)
    throw error
  }

  console.log('✅ Questionnaire inserted successfully')
  return data
}

async function insertSections(questionnaireId, sections) {
  console.log('📝 Inserting sections...')
  
  const sectionsData = sections.map(section => ({
    id: generateDeterministicUUID(`section_${section.id}`), // Generate UUID from section ID
    questionnaire_id: QUESTIONNAIRE_UUID,
    titulo: section.title,
    descripcion: null,
    orden: section.order,
    visible: true,
    requerida: true,
    condiciones_visibilidad: null,
    configuracion_seccion: null
  }))

  const { data, error } = await supabase
    .from('sections')
    .upsert(sectionsData)
    .select()

  if (error) {
    console.error('❌ Error inserting sections:', error.message)
    throw error
  }

  console.log(`✅ ${sectionsData.length} sections inserted successfully`)
  return data
}

async function insertQuestions(sections) {
  console.log('📝 Inserting questions...')
  
  const allQuestions = []
  
  for (const section of sections) {
    const sectionId = generateDeterministicUUID(`section_${section.id}`) // Generate UUID for section
    
    for (let i = 0; i < section.questions.length; i++) {
      const question = section.questions[i]
      
      // Prepare validation rules
      let validationRules = null
      if (question.validation) {
        validationRules = question.validation
      }
      if (question.min !== undefined || question.max !== undefined) {
        validationRules = validationRules || {}
        if (question.min !== undefined) validationRules.min = question.min
        if (question.max !== undefined) validationRules.max = question.max
      }
      if (question.maxLength !== undefined) {
        validationRules = validationRules || {}
        validationRules.maxLength = question.maxLength
      }
      if (question.maxSelections !== undefined || question.minSelections !== undefined) {
        validationRules = validationRules || {}
        if (question.maxSelections !== undefined) validationRules.maxSelections = question.maxSelections
        if (question.minSelections !== undefined) validationRules.minSelections = question.minSelections
      }

      // Prepare conditional logic
      let conditionalLogic = null
      if (question.conditional) {
        conditionalLogic = question.conditional
      }

      // Handle scale questions special case
      let escalaMinima = null
      let escalaMaxima = null
      let opciones = question.options || null
      
      if (question.type === 'scale') {
        escalaMinima = question.min
        escalaMaxima = question.max
        opciones = { min: question.min, max: question.max }
      }

      allQuestions.push({
        id: generateDeterministicUUID(`question_${question.id}`), // Generate UUID from question ID
        section_id: sectionId,
        titulo: question.text,
        descripcion: null,
        placeholder: null,
        tipo: mapQuestionType(question.type),
        orden: i + 1,
        requerida: question.required || false,
        visible: true,
        opciones: opciones,
        validaciones: validationRules || null,
        condiciones_visibilidad: conditionalLogic || null,
        logica_salto: null,
        escala_minima: escalaMinima,
        escala_maxima: escalaMaxima,
        etiquetas_escala: null,
        configuracion_pregunta: null,
        ayuda_texto: null
      })
    }
  }

  const { data, error } = await supabase
    .from('questions')
    .upsert(allQuestions)
    .select()

  if (error) {
    console.error('❌ Error inserting questions:', error.message)
    throw error
  }

  console.log(`✅ ${allQuestions.length} questions inserted successfully`)
  return data
}

async function verifyData(questionnaireId) {
  console.log('🔍 Verifying inserted data...')
  
  // Count questionnaires
  const { data: questionnaires, error: qError } = await supabase
    .from('questionnaires')
    .select('*')
    .eq('id', questionnaireId)

  if (qError) {
    console.error('❌ Error verifying questionnaires:', qError.message)
    return false
  }

  // Count sections
  const { data: sections, error: sError } = await supabase
    .from('sections')
    .select('*')
    .eq('questionnaire_id', questionnaireId)

  if (sError) {
    console.error('❌ Error verifying sections:', sError.message)
    return false
  }

  // Count questions
  const { data: questions, error: qsError } = await supabase
    .from('questions')
    .select(`
      *,
      sections!inner(questionnaire_id)
    `)
    .eq('sections.questionnaire_id', questionnaireId)

  if (qsError) {
    console.error('❌ Error verifying questions:', qsError.message)
    return false
  }

  console.log('📊 Verification Results:')
  console.log(`   - Questionnaires: ${questionnaires?.length || 0}`)
  console.log(`   - Sections: ${sections?.length || 0}`)
  console.log(`   - Questions: ${questions?.length || 0}`)

  return questionnaires?.length === 1 && sections?.length === 8 && questions?.length === 32
}

async function main() {
  console.log('🚀 Starting PPD Survey Data Migration...')
  console.log(`📍 Database: ${supabaseUrl}`)
  console.log(`🏢 Tenant ID: ${DEFAULT_TENANT_ID}`)
  console.log('─'.repeat(50))

  try {
    // Load survey data
    const surveyData = await loadSurveyData()
    const questionnaire = surveyData.questionnaire

    // Insert questionnaire
    await insertQuestionnaire(questionnaire)

    // Insert sections
    await insertSections(QUESTIONNAIRE_UUID, questionnaire.sections)

    // Insert questions
    await insertQuestions(questionnaire.sections)

    // Verify data
    const isValid = await verifyData(QUESTIONNAIRE_UUID)
    
    console.log('─'.repeat(50))
    
    // Update metadata counts
    console.log('🔧 Updating questionnaire metadata...')
    try {
      const { main: updateMetadata } = require('./update-metadata.js')
      await updateMetadata()
      console.log('✅ Metadata counts updated successfully!')
    } catch (metadataError) {
      console.error('❌ Error updating metadata:', metadataError.message)
      console.log('💡 You can run: npm run fix:survey-metadata')
    }
    
    console.log('─'.repeat(50))
    
    if (isValid) {
      console.log('🎉 Migration completed successfully!')
      console.log('✅ All data has been imported into the database.')
      console.log('🔧 The survey system is now ready to use database-backed questionnaires.')
      console.log('💡 Run: npm run check:survey-metadata to verify')
    } else {
      console.log('⚠️  Migration completed with warnings.')
      console.log('🔍 Some data verification checks failed.')
      console.log('📋 Please review the database manually.')
      console.log('💡 Try running: npm run check:survey-metadata')
    }

  } catch (error) {
    console.error('─'.repeat(50))
    console.error('💥 Migration failed:', error.message)
    console.error('📋 Please check your database configuration and try again.')
    process.exit(1)
  }
}

// Run the migration
if (require.main === module) {
  main()
}

module.exports = { main }