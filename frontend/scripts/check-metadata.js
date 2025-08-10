#!/usr/bin/env node

/**
 * Check metadata counts in questionnaires table
 * PPD Candidate Polling Platform
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
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const QUESTIONNAIRE_UUID = '42bbe52f-663d-56f3-a88a-542547be240d'

async function checkMetadata() {
  console.log('🔍 Checking questionnaire metadata...')
  
  try {
    // Get questionnaire metadata
    const { data: questionnaire, error: qError } = await supabase
      .from('questionnaires')
      .select('id, titulo, total_secciones, total_preguntas, metadatos')
      .eq('id', QUESTIONNAIRE_UUID)
      .single()
    
    if (qError) {
      console.error('❌ Error fetching questionnaire:', qError.message)
      return false
    }

    if (!questionnaire) {
      console.error('❌ Questionnaire not found')
      return false
    }

    console.log('📋 Questionnaire Data:')
    console.log(`   ID: ${questionnaire.id}`)
    console.log(`   Title: ${questionnaire.titulo}`)
    console.log(`   total_secciones: ${questionnaire.total_secciones}`)
    console.log(`   total_preguntas: ${questionnaire.total_preguntas}`)
    console.log(`   metadatos:`, JSON.stringify(questionnaire.metadatos, null, 2))
    
    // Count actual sections and questions
    const { data: sections, error: sError } = await supabase
      .from('sections')
      .select('id')
      .eq('questionnaire_id', QUESTIONNAIRE_UUID)
    
    if (sError) {
      console.error('❌ Error counting sections:', sError.message)
      return false
    }

    const { data: questions, error: qnError } = await supabase
      .from('questions')
      .select('id')
      .in('section_id', sections.map(s => s.id))
    
    if (qnError) {
      console.error('❌ Error counting questions:', qnError.message)
      return false
    }

    console.log('')
    console.log('🔍 Actual Counts:')
    console.log(`   Sections in DB: ${sections.length}`)
    console.log(`   Questions in DB: ${questions.length}`)
    
    console.log('')
    console.log('✅ Metadata Status:')
    console.log(`   total_secciones matches: ${questionnaire.total_secciones === sections.length ? '✅' : '❌'} (expected: ${sections.length}, got: ${questionnaire.total_secciones})`)
    console.log(`   total_preguntas matches: ${questionnaire.total_preguntas === questions.length ? '✅' : '❌'} (expected: ${questions.length}, got: ${questionnaire.total_preguntas})`)
    
    return questionnaire.total_secciones === sections.length && questionnaire.total_preguntas === questions.length
  } catch (error) {
    console.error('❌ Error checking metadata:', error.message)
    return false
  }
}

async function main() {
  console.log('🔍 PPD Survey Metadata Check')
  console.log('─'.repeat(40))
  
  const success = await checkMetadata()
  
  console.log('─'.repeat(40))
  if (success) {
    console.log('🎉 All metadata counts are correct!')
  } else {
    console.log('❌ Metadata counts need to be fixed')
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { main }