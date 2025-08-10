# Database Migration Scripts

This directory contains scripts for managing the PPD Candidate Polling Platform database migrations.

## Epic 2 - Survey Data Collection Migration

The migration script `run-migration.js` imports the survey questionnaire data from `survey_questions.json` into the Supabase database tables.

### Prerequisites

1. **Environment Variables**: Ensure your `.env.local` file contains:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Database Schema**: The following tables must exist in your Supabase database:
   - `tenants`
   - `questionnaires`  
   - `sections`
   - `questions`

3. **Tenant Setup**: A tenant record must exist in the database. The script uses `test-tenant-ppd-001` by default.

### Running the Migration

```bash
# Navigate to the frontend directory
cd frontend

# Run the migration
npm run migrate:survey-data
```

### What the Migration Does

1. **Imports Questionnaire**: Creates the main PPD voter consultation questionnaire (`ppd_voter_consultation_v1`)

2. **Creates 8 Sections**:
   - Información Personal (Demographics)
   - Información del Hogar (Household Voting)
   - Historial de Votación (Voting History)
   - Modalidad de Voto (Voting Method)
   - Afiliación Política (Political Affiliation)
   - Prioridades (Priorities)
   - Asuntos Comunitarios (Community Concerns)
   - Evaluación Partidista (Party Assessment)

3. **Inserts 31 Questions**: All questions with proper types, validation rules, and conditional logic

4. **Verification**: Confirms all data was inserted correctly

### Database Structure

The migration populates these tables with the following relationships:

```
questionnaires (1)
├── sections (8) 
    └── questions (31 total)
```

### Troubleshooting

**Error: Missing environment variables**
- Check your `.env.local` file contains the required Supabase configuration

**Error: Database connection failed**
- Verify your Supabase URL and service role key are correct
- Ensure your Supabase project is active

**Error: Table doesn't exist**
- Confirm your database schema includes all required tables
- Check that Row Level Security (RLS) policies are properly configured

**Error: Tenant not found**
- Ensure a tenant record exists with ID `test-tenant-ppd-001`
- Or update the `DEFAULT_TENANT_ID` in the script to match your tenant

### Manual SQL Migration

If the Node.js script doesn't work, you can run the SQL migration manually:

```bash
# Use the SQL file directly in Supabase SQL editor
cat scripts/migrate-survey-data.sql
```

Then copy and paste the contents into your Supabase dashboard SQL editor.

### Verification Queries

After running the migration, you can verify the data with these SQL queries:

```sql
-- Check questionnaire was created
SELECT * FROM questionnaires WHERE id = 'ppd_voter_consultation_v1';

-- Check sections count (should be 8)
SELECT COUNT(*) FROM sections WHERE questionnaire_id = 'ppd_voter_consultation_v1';

-- Check questions count (should be 31) 
SELECT COUNT(*) FROM questions 
JOIN sections ON questions.section_id = sections.id 
WHERE sections.questionnaire_id = 'ppd_voter_consultation_v1';

-- View complete structure
SELECT 
  q.title as questionnaire,
  s.title as section,
  COUNT(qs.id) as question_count
FROM questionnaires q
JOIN sections s ON s.questionnaire_id = q.id
JOIN questions qs ON qs.section_id = s.id
WHERE q.id = 'ppd_voter_consultation_v1'
GROUP BY q.title, s.title, s.order_index
ORDER BY s.order_index;
```

### Next Steps

After successful migration:

1. **Test the Survey API**: Visit `/api/surveys/questionnaires?id=ppd_voter_consultation_v1&include_structure=true`
2. **Test Survey Form**: Navigate to `/survey/ppd_voter_consultation_v1`  
3. **Run Tests**: Execute `npm run test:db` to verify database integration
4. **Deploy**: Apply the same migration to your production database

### Support

If you encounter issues with the migration, check:

1. Database logs in Supabase dashboard
2. Network connectivity to Supabase
3. Service role key permissions
4. Table structure and RLS policies

For Epic 2 completion, this migration is a critical step to transition from static JSON files to database-backed questionnaires.