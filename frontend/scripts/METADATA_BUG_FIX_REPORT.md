# Story 2.1 Metadata Bug Fix Report
**PPD Candidate Polling Platform - Epic 2**

## Issue Summary
**Bug**: Questionnaire metadata showed incorrect counts
- `total_secciones` field showed 0 instead of 8
- `total_preguntas` field showed 0 instead of 32
- QA status was "PARTIALLY VERIFIED" instead of "FULLY VERIFIED"

## Root Cause Analysis

### 1. Field Name Mismatches
The migration script used incorrect field names that didn't match the database schema:

**Migration Script (Incorrect)**:
- `order_index` → Should be `orden`
- `is_required` → Should be `requerida`
- `text` → Should be `titulo`
- `type` → Should be `tipo`
- `options` → Should be `opciones`
- `validation_rules` → Should be `validaciones`
- `conditional_logic` → Should be `condiciones_visibilidad`

### 2. SQL Metadata Update Queries
The original metadata update queries in the SQL file had issues:
- Complex nested subqueries weren't executing properly in batch mode
- JSON field updates weren't working correctly with the original syntax

## Solution Implemented

### 1. Fixed Field Names
Updated all INSERT and UPDATE statements in `/scripts/migrate-survey-data.sql` to use correct Spanish field names matching the database schema.

### 2. Improved SQL Metadata Updates
Replaced problematic nested queries with CTE (Common Table Expression) patterns:

```sql
-- Before (didn't work)
UPDATE questionnaires 
SET metadatos = jsonb_set(
    metadatos,
    '{total_sections}',
    (SELECT COUNT(*)::text::jsonb FROM sections WHERE questionnaire_id = '...')
)

-- After (works correctly)
WITH section_count AS (
    SELECT COUNT(*) as count FROM sections WHERE questionnaire_id = '...'
)
UPDATE questionnaires 
SET metadatos = jsonb_set(metadatos, '{total_sections}', to_jsonb((SELECT count FROM section_count))),
    total_secciones = (SELECT count FROM section_count)
```

### 3. JavaScript Metadata Update Utility
Created `/scripts/update-metadata.js` that:
- Counts actual sections and questions in the database
- Updates both the `total_secciones`/`total_preguntas` fields and the `metadatos` JSON
- Provides reliable metadata updates independent of the SQL batch execution

### 4. Enhanced Migration Pipeline
Updated `/scripts/run-migration.js` to:
- Automatically run metadata updates after SQL migration
- Fix expected question count from 31 to 32
- Provide better error handling and user guidance

## New NPM Scripts Added

```json
{
  "fix:survey-metadata": "node scripts/update-metadata.js",
  "check:survey-metadata": "node scripts/check-metadata.js"
}
```

## Verification Results

**Before Fix**:
```
total_secciones: 0 ❌
total_preguntas: 0 ❌
Status: PARTIALLY VERIFIED
```

**After Fix**:
```
total_secciones: 8 ✅
total_preguntas: 32 ✅  
Status: FULLY VERIFIED
```

## Files Modified

1. `/scripts/migrate-survey-data.sql` - Fixed field names and SQL queries
2. `/scripts/run-migration.js` - Added automatic metadata update
3. `/package.json` - Added new utility scripts
4. **New files**:
   - `/scripts/update-metadata.js` - Metadata update utility
   - `/scripts/check-metadata.js` - Metadata verification utility

## Testing Procedure

```bash
# 1. Clean migration
npm run migrate:survey-data

# 2. Verify metadata
npm run check:survey-metadata

# 3. Manual fix if needed
npm run fix:survey-metadata
```

## Impact
- ✅ Story 2.1 status changed from "PARTIALLY VERIFIED" to "FULLY VERIFIED"
- ✅ Questionnaire metadata now shows correct section and question counts
- ✅ Database integrity maintained with proper field mappings
- ✅ Reliable migration pipeline with automatic metadata correction

## Lessons Learned
1. Always verify database schema field names against migration scripts
2. Test SQL batch execution separately from application code
3. JavaScript utilities provide more reliable database operations than complex SQL in batch mode
4. Comprehensive verification scripts are essential for data integrity validation

---
**Bug Fixed**: January 10, 2025  
**Status**: Story 2.1 - Survey Question Configuration - FULLY VERIFIED ✅