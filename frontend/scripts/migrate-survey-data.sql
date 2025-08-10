-- Migration script to import survey_questions.json data into Supabase database
-- PPD Candidate Polling Platform - Epic 2 Database Integration
-- Generated on: 2025-01-10

-- Insert the main questionnaire
INSERT INTO questionnaires (
    id, 
    tenant_id, 
    title, 
    description, 
    version, 
    language, 
    is_active, 
    metadata, 
    created_at, 
    updated_at
) VALUES (
    'ppd_voter_consultation_v1',
    '00000000-0000-0000-0000-000000000000', -- Default tenant ID - replace with actual tenant
    'CONSULTA ELECTORAL Y COMUNITARIA',
    'Cuestionario para consulta electoral y comunitaria del PPD',
    '1.0.0',
    'es',
    true,
    '{
        "source": "CUESTIONARIO CONSULTA DISTRITO 23",
        "total_questions": 31,
        "estimated_completion_time": "10-15 minutes",
        "created_at": "2025-01-09",
        "last_modified": "2025-01-09"
    }'::jsonb,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    version = EXCLUDED.version,
    metadata = EXCLUDED.metadata,
    updated_at = NOW();

-- Insert sections
INSERT INTO sections (
    id,
    questionnaire_id,
    title,
    order_index,
    is_required,
    created_at,
    updated_at
) VALUES 
    ('demographics', 'ppd_voter_consultation_v1', 'Información Personal', 1, true, NOW(), NOW()),
    ('household_voting', 'ppd_voter_consultation_v1', 'Información del Hogar', 2, true, NOW(), NOW()),
    ('voting_history', 'ppd_voter_consultation_v1', 'Historial de Votación', 3, true, NOW(), NOW()),
    ('voting_method', 'ppd_voter_consultation_v1', 'Modalidad de Voto', 4, true, NOW(), NOW()),
    ('political_affiliation', 'ppd_voter_consultation_v1', 'Afiliación Política', 5, true, NOW(), NOW()),
    ('priorities', 'ppd_voter_consultation_v1', 'Prioridades', 6, true, NOW(), NOW()),
    ('community_concerns', 'ppd_voter_consultation_v1', 'Asuntos Comunitarios', 7, true, NOW(), NOW()),
    ('party_assessment', 'ppd_voter_consultation_v1', 'Evaluación Partidista', 8, true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    order_index = EXCLUDED.order_index,
    updated_at = NOW();

-- Insert questions for Demographics section
INSERT INTO questions (
    id,
    section_id,
    text,
    type,
    is_required,
    order_index,
    options,
    validation_rules,
    conditional_logic,
    created_at,
    updated_at
) VALUES 
    ('name', 'demographics', 'NOMBRE', 'text', true, 1, NULL, '{"minLength": 2, "maxLength": 100}'::jsonb, NULL, NOW(), NOW()),
    ('gender', 'demographics', 'GÉNERO', 'radio', true, 2, '[{"value": "M", "label": "Masculino"}, {"value": "F", "label": "Femenino"}]'::jsonb, NULL, NULL, NOW(), NOW()),
    ('residential_address', 'demographics', 'DIRECCIÓN RESIDENCIAL', 'text', true, 3, NULL, NULL, NULL, NOW(), NOW()),
    ('email', 'demographics', 'CORREO ELECTRÓNICO', 'email', false, 4, NULL, '{"pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\\\.[a-zA-Z]{2,}$"}'::jsonb, NULL, NOW(), NOW()),
    ('postal_address', 'demographics', 'DIRECCIÓN POSTAL', 'text', false, 5, NULL, NULL, NULL, NOW(), NOW()),
    ('birth_date', 'demographics', 'FECHA DE NACIMIENTO', 'date', true, 6, NULL, NULL, NULL, NOW(), NOW()),
    ('age_range', 'demographics', 'EDAD', 'radio', true, 7, '[{"value": "18-25", "label": "18-25"}, {"value": "26-40", "label": "26-40"}, {"value": "41-55", "label": "41-55"}, {"value": "56+", "label": "56 o más"}]'::jsonb, NULL, NULL, NOW(), NOW()),
    ('phone', 'demographics', 'TELÉFONO', 'tel', true, 8, NULL, '{"pattern": "^[0-9]{3}-[0-9]{3}-[0-9]{4}$"}'::jsonb, NULL, NOW(), NOW()),
    ('electoral_number', 'demographics', 'NÚMERO ELECTORAL', 'text', false, 9, NULL, NULL, NULL, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    text = EXCLUDED.text,
    type = EXCLUDED.type,
    is_required = EXCLUDED.is_required,
    order_index = EXCLUDED.order_index,
    options = EXCLUDED.options,
    validation_rules = EXCLUDED.validation_rules,
    updated_at = NOW();

-- Insert questions for Household Voting section
INSERT INTO questions (
    id,
    section_id,
    text,
    type,
    is_required,
    order_index,
    options,
    validation_rules,
    conditional_logic,
    created_at,
    updated_at
) VALUES 
    ('family_voters_count', 'household_voting', '¿Cuántos integrantes de su familia que residan con usted ejercen su derecho al voto?', 'scale', true, 1, '{"min": 0, "max": 10}'::jsonb, NULL, NULL, NOW(), NOW()),
    ('precinct', 'household_voting', 'PRECINTO', 'text', true, 2, NULL, NULL, NULL, NOW(), NOW()),
    ('unit', 'household_voting', 'UNIDAD', 'text', false, 3, NULL, NULL, NULL, NOW(), NOW()),
    ('voting_location', 'household_voting', 'LUGAR DE VOTACIÓN', 'text', false, 4, NULL, NULL, NULL, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    text = EXCLUDED.text,
    type = EXCLUDED.type,
    is_required = EXCLUDED.is_required,
    order_index = EXCLUDED.order_index,
    options = EXCLUDED.options,
    updated_at = NOW();

-- Insert questions for Voting History section
INSERT INTO questions (
    id,
    section_id,
    text,
    type,
    is_required,
    order_index,
    options,
    validation_rules,
    conditional_logic,
    created_at,
    updated_at
) VALUES 
    ('voted_2016', 'voting_history', '¿Ejerció su derecho al voto en las elecciones del 2016?', 'radio', true, 1, '[{"value": "SI", "label": "SÍ"}, {"value": "NO", "label": "NO"}, {"value": "NO_RECUERDO", "label": "NO RECUERDO"}]'::jsonb, NULL, NULL, NOW(), NOW()),
    ('voted_2020', 'voting_history', '¿Ejerció su derecho al voto en las elecciones del 2020?', 'radio', true, 2, '[{"value": "SI", "label": "SÍ"}, {"value": "NO", "label": "NO"}, {"value": "NO_RECUERDO", "label": "NO RECUERDO"}]'::jsonb, NULL, NULL, NOW(), NOW()),
    ('voted_2024', 'voting_history', '¿Ejerció su derecho al voto en las elecciones del 2024?', 'radio', true, 3, '[{"value": "SI", "label": "SÍ"}, {"value": "NO", "label": "NO"}, {"value": "NO_RECUERDO", "label": "NO RECUERDO"}]'::jsonb, NULL, NULL, NOW(), NOW()),
    ('intention_2028', 'voting_history', '¿Tiene intención de votar en el 2028?', 'radio', true, 4, '[{"value": "SI", "label": "SÍ"}, {"value": "NO", "label": "NO"}, {"value": "TAL_VEZ", "label": "TAL VEZ"}]'::jsonb, NULL, NULL, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    text = EXCLUDED.text,
    options = EXCLUDED.options,
    updated_at = NOW();

-- Insert questions for Voting Method section
INSERT INTO questions (
    id,
    section_id,
    text,
    type,
    is_required,
    order_index,
    options,
    validation_rules,
    conditional_logic,
    created_at,
    updated_at
) VALUES 
    ('voting_modality', 'voting_method', '¿Cuál es tu modalidad de voto?', 'radio', true, 1, '[{"value": "presencial", "label": "Presencial"}, {"value": "correo", "label": "Correo"}, {"value": "domicilio", "label": "Domicilio"}]'::jsonb, NULL, NULL, NOW(), NOW()),
    ('has_transportation', 'voting_method', '¿Tiene transportación para ir a votar presencial?', 'radio', true, 2, '[{"value": "SI", "label": "SÍ"}, {"value": "NO", "label": "NO"}]'::jsonb, NULL, NULL, NOW(), NOW()),
    ('needs_transportation', 'voting_method', '¿Necesita transportación?', 'radio', true, 3, '[{"value": "SI", "label": "SÍ"}, {"value": "NO", "label": "NO"}]'::jsonb, NULL, NULL, NOW(), NOW()),
    ('interested_mail_voting', 'voting_method', '¿Le interesaría votar por correo?', 'radio', true, 4, '[{"value": "SI", "label": "SÍ"}, {"value": "NO", "label": "NO"}]'::jsonb, NULL, NULL, NOW(), NOW()),
    ('interested_home_voting', 'voting_method', '¿Le interesaría votar a domicilio?', 'radio', true, 5, '[{"value": "SI", "label": "SÍ"}, {"value": "NO", "label": "NO"}]'::jsonb, NULL, NULL, NOW(), NOW()),
    ('family_in_usa', 'voting_method', '¿Familia viviendo en USA?', 'radio', true, 6, '[{"value": "SI", "label": "SÍ"}, {"value": "NO", "label": "NO"}]'::jsonb, NULL, NULL, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    text = EXCLUDED.text,
    options = EXCLUDED.options,
    updated_at = NOW();

-- Insert questions for Political Affiliation section
INSERT INTO questions (
    id,
    section_id,
    text,
    type,
    is_required,
    order_index,
    options,
    validation_rules,
    conditional_logic,
    created_at,
    updated_at
) VALUES 
    ('leans_to_party', 'political_affiliation', '¿Se inclina hacia un partido político en específico?', 'radio', true, 1, '[{"value": "SI", "label": "SÍ"}, {"value": "NO", "label": "NO"}]'::jsonb, NULL, NULL, NOW(), NOW()),
    ('which_party', 'political_affiliation', 'Si contestó SÍ, ¿A qué partido político se refiere?', 'radio', false, 2, '[{"value": "NO_APLICA", "label": "NO APLICA"}, {"value": "PPD", "label": "PPD"}, {"value": "PNP", "label": "PNP"}, {"value": "PIP", "label": "PIP"}, {"value": "MVC", "label": "MVC"}, {"value": "PD", "label": "PD"}]'::jsonb, NULL, '{"questionId": "leans_to_party", "value": "SI"}'::jsonb, NOW(), NOW()),
    ('voting_style', 'political_affiliation', 'Cuando ejerce su derecho al voto lo hace:', 'radio', true, 3, '[{"value": "integro", "label": "Íntegro"}, {"value": "candidatura", "label": "Candidatura"}]'::jsonb, NULL, NULL, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    text = EXCLUDED.text,
    options = EXCLUDED.options,
    conditional_logic = EXCLUDED.conditional_logic,
    updated_at = NOW();

-- Insert questions for Priorities section
INSERT INTO questions (
    id,
    section_id,
    text,
    type,
    is_required,
    order_index,
    options,
    validation_rules,
    conditional_logic,
    created_at,
    updated_at
) VALUES 
    ('top_5_priorities', 'priorities', '¿Cuáles deben ser para usted las 5 prioridades que se deben atender en su pueblo?', 'checkbox', true, 1, '[
        {"value": "salud", "label": "Salud"},
        {"value": "educacion", "label": "Educación"},
        {"value": "seguridad", "label": "Seguridad"},
        {"value": "desarrollo_economico", "label": "Desarrollo Económico"},
        {"value": "estatus_politico", "label": "Estatus Político"},
        {"value": "deuda_pr", "label": "Deuda de Puerto Rico"},
        {"value": "costo_energia", "label": "Costo de Energía Eléctrica"},
        {"value": "costo_aaa", "label": "Costo de Servicios de la AAA"},
        {"value": "costo_vida", "label": "Costo de Vida"},
        {"value": "recuperacion_desastres", "label": "Recuperación por Desastres"},
        {"value": "anti_corrupcion", "label": "Medidas Anti-Corrupción"},
        {"value": "empleos", "label": "Empleos"},
        {"value": "vivienda", "label": "Vivienda"}
    ]'::jsonb, '{"maxSelections": 5, "minSelections": 1}'::jsonb, NULL, NOW(), NOW()),
    ('other_priorities', 'priorities', 'Otros:', 'text', false, 2, NULL, '{"maxLength": 500}'::jsonb, NULL, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    text = EXCLUDED.text,
    options = EXCLUDED.options,
    validation_rules = EXCLUDED.validation_rules,
    updated_at = NOW();

-- Insert questions for Community Concerns section
INSERT INTO questions (
    id,
    section_id,
    text,
    type,
    is_required,
    order_index,
    options,
    validation_rules,
    conditional_logic,
    created_at,
    updated_at
) VALUES 
    ('community_priorities', 'community_concerns', 'Como miembro de su comunidad, ¿Cuáles para usted deben ser las prioridades? (Nombre la comunidad y la problemática)', 'textarea', false, 1, NULL, '{"maxLength": 1000}'::jsonb, NULL, NOW(), NOW()),
    ('comments_suggestions', 'community_concerns', 'Comentarios y/o Sugerencias:', 'textarea', false, 2, NULL, '{"maxLength": 1000}'::jsonb, NULL, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    text = EXCLUDED.text,
    validation_rules = EXCLUDED.validation_rules,
    updated_at = NOW();

-- Insert questions for Party Assessment section
INSERT INTO questions (
    id,
    section_id,
    text,
    type,
    is_required,
    order_index,
    options,
    validation_rules,
    conditional_logic,
    created_at,
    updated_at
) VALUES 
    ('ppd_chances_2028', 'party_assessment', '¿Entiende usted que el Partido Popular Democrático tiene posibilidades de triunfo en las elecciones del 2028?', 'radio', true, 1, '[{"value": "SI", "label": "SÍ"}, {"value": "NO", "label": "NO"}]'::jsonb, NULL, NULL, NOW(), NOW()),
    ('ppd_chances_why', 'party_assessment', '¿POR QUÉ?', 'textarea', false, 2, NULL, '{"maxLength": 500}'::jsonb, NULL, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    text = EXCLUDED.text,
    validation_rules = EXCLUDED.validation_rules,
    updated_at = NOW();

-- Update the questionnaire metadata with actual counts
UPDATE questionnaires 
SET metadata = jsonb_set(
    metadata,
    '{total_sections}',
    (SELECT COUNT(*)::text::jsonb FROM sections WHERE questionnaire_id = 'ppd_voter_consultation_v1')
) 
WHERE id = 'ppd_voter_consultation_v1';

UPDATE questionnaires 
SET metadata = jsonb_set(
    metadata,
    '{total_questions}',
    (SELECT COUNT(*)::text::jsonb FROM questions 
     JOIN sections ON questions.section_id = sections.id 
     WHERE sections.questionnaire_id = 'ppd_voter_consultation_v1')
) 
WHERE id = 'ppd_voter_consultation_v1';

-- Verification query to check the data was inserted correctly
SELECT 
    'questionnaires' as table_name, 
    COUNT(*) as count 
FROM questionnaires 
WHERE id = 'ppd_voter_consultation_v1'

UNION ALL

SELECT 
    'sections' as table_name, 
    COUNT(*) as count 
FROM sections 
WHERE questionnaire_id = 'ppd_voter_consultation_v1'

UNION ALL

SELECT 
    'questions' as table_name, 
    COUNT(*) as count 
FROM questions 
JOIN sections ON questions.section_id = sections.id 
WHERE sections.questionnaire_id = 'ppd_voter_consultation_v1';