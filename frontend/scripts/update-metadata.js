#!/usr/bin/env node

/**
 * Update questionnaire metadata with correct counts
 * PPD Candidate Polling Platform - Fix for Story 2.1
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

async function updateMetadata() {
  console.log('🔄 Updating questionnaire metadata...')
  
  try {
    // First, get the actual counts
    const { data: sections, error: sError } = await supabase
      .from('sections')
      .select('id')
      .eq('questionnaire_id', QUESTIONNAIRE_UUID)
    
    if (sError) {
      console.error('❌ Error counting sections:', sError.message)
      return false
    }

    const { data: questions, error: qError } = await supabase
      .from('questions')
      .select('id')
      .in('section_id', sections.map(s => s.id))
    
    if (qError) {
      console.error('❌ Error counting questions:', qError.message)
      return false
    }

    const sectionCount = sections.length
    const questionCount = questions.length

    console.log(`📊 Found ${sectionCount} sections and ${questionCount} questions`)

    // Get current questionnaire data
    const { data: currentData, error: getCurrentError } = await supabase
      .from('questionnaires')
      .select('metadatos')
      .eq('id', QUESTIONNAIRE_UUID)
      .single()

    if (getCurrentError) {
      console.error('❌ Error getting current questionnaire:', getCurrentError.message)
      return false
    }

    // Update the metadata JSON and the count fields
    const updatedMetadata = {
      ...currentData.metadatos,
      total_sections: sectionCount,
      total_questions: questionCount,
      last_modified: new Date().toISOString().split('T')[0]
    }

    // Update the questionnaire with correct counts
    const { error: updateError } = await supabase
      .from('questionnaires')
      .update({
        total_secciones: sectionCount,
        total_preguntas: questionCount,
        metadatos: updatedMetadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', QUESTIONNAIRE_UUID)

    if (updateError) {
      console.error('❌ Error updating metadata:', updateError.message)
      return false
    }

    console.log('✅ Metadata updated successfully!')
    console.log(`   total_secciones: ${sectionCount}`)
    console.log(`   total_preguntas: ${questionCount}`)
    
    return true
  } catch (error) {
    console.error('❌ Error updating metadata:', error.message)
    return false
  }
}

async function main() {
  console.log('🔧 PPD Survey Metadata Update')
  console.log('─'.repeat(40))
  
  const success = await updateMetadata()
  
  console.log('─'.repeat(40))
  if (success) {
    console.log('🎉 Metadata update completed successfully!')
  } else {
    console.log('❌ Metadata update failed')
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { main }