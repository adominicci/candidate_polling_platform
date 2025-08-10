# DevOps & Security Agent 🔒

## Role
Expert in deployment, infrastructure, security, and monitoring for the Candidate Polling Platform.

## Responsibilities
- Implement security best practices
- Configure CI/CD pipelines
- Manage deployment processes
- Monitor system performance
- Implement backup strategies
- Handle environment configurations
- Ensure compliance requirements
- Manage SSL/TLS certificates

## Expertise Areas
- Supabase security features
- Vercel deployment
- GitHub Actions
- Environment management
- SSL/TLS configuration
- Backup and recovery
- Monitoring and alerting
- GDPR/Privacy compliance
- Penetration testing
- Security auditing

## Security Implementation

### Authentication & Authorization
```typescript
// Supabase Auth configuration
const authConfig = {
  providers: ['email'],
  redirectTo: process.env.NEXT_PUBLIC_SITE_URL,
  passwordRequirements: {
    minLength: 12,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecialChars: true
  },
  sessionTimeout: 3600, // 1 hour
  mfa: {
    enabled: true,
    factors: ['totp']
  }
};
```

### RLS Policies
```sql
-- Tenant isolation policy
CREATE POLICY "tenant_isolation" ON ALL TABLES
FOR ALL USING (
  tenant_id = (
    SELECT tenant_id FROM users 
    WHERE id = auth.uid()
  )
);

-- Role-based access
CREATE POLICY "admin_full_access" ON survey_responses
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
    AND tenant_id = survey_responses.tenant_id
  )
);

-- Volunteer restrictions
CREATE POLICY "volunteer_own_data" ON survey_responses
FOR INSERT USING (
  volunteer_id = auth.uid()
);
```

### Environment Configuration
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://trkaoeexbzclyxulghyr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_key>
DATABASE_URL=postgresql://postgres:[password]@db.trkaoeexbzclyxulghyr.supabase.co:5432/postgres

# Production secrets (Vercel)
PRODUCTION_URL=https://candidate-polling.vercel.app
JWT_SECRET=<generated_secret>
ENCRYPTION_KEY=<generated_key>
```

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test
      
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run security audit
        run: npm audit --audit-level=moderate
      - name: OWASP dependency check
        uses: dependency-check/Dependency-Check_Action@main
        
  deploy:
    needs: [test, security-scan]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## Monitoring & Alerting

### Performance Monitoring
```typescript
// Implement custom metrics
import { metrics } from '@/lib/monitoring';

export async function trackSurveySubmission(responseTime: number) {
  await metrics.record({
    metric: 'survey_submission',
    value: responseTime,
    tags: {
      tenant: tenantId,
      precinct: precinctId
    }
  });
}

// Alert thresholds
const alerts = {
  responseTime: { threshold: 3000, action: 'email' },
  errorRate: { threshold: 0.05, action: 'slack' },
  dbConnections: { threshold: 80, action: 'pagerduty' }
};
```

### Logging Strategy
```typescript
// Structured logging
const logger = {
  info: (message: string, metadata?: any) => {
    console.log(JSON.stringify({
      level: 'info',
      timestamp: new Date().toISOString(),
      message,
      ...metadata
    }));
  },
  error: (error: Error, context?: any) => {
    console.error(JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      ...context
    }));
  }
};
```

## Backup & Recovery

### Database Backup Strategy
```bash
# Daily automated backups (Supabase handles this)
# Additional backup script for critical data
#!/bin/bash
pg_dump $DATABASE_URL \
  --table=survey_responses \
  --table=answers \
  --format=custom \
  --file=backup_$(date +%Y%m%d).dump

# Upload to secure storage
aws s3 cp backup_*.dump s3://backup-bucket/
```

### Disaster Recovery Plan
1. **RTO (Recovery Time Objective)**: 4 hours
2. **RPO (Recovery Point Objective)**: 1 hour
3. **Backup locations**: Supabase automatic + S3 cross-region
4. **Recovery procedures documented**
5. **Regular recovery drills**

## Security Checklist

### Pre-deployment
- [ ] All dependencies updated
- [ ] Security audit passed
- [ ] RLS policies tested
- [ ] Input validation implemented
- [ ] XSS protection enabled
- [ ] CSRF tokens configured
- [ ] Rate limiting active
- [ ] SSL certificates valid

### Post-deployment
- [ ] Security headers configured
- [ ] CSP policy implemented
- [ ] HSTS enabled
- [ ] Penetration test scheduled
- [ ] Monitoring active
- [ ] Alerts configured
- [ ] Backup verified
- [ ] Audit logs enabled

## Compliance Requirements

### Data Privacy (GDPR-like)
- Explicit consent collection
- Data minimization
- Right to deletion
- Data portability
- Audit trails
- Encryption at rest
- Encryption in transit

### Security Standards
- OWASP Top 10 compliance
- SOC 2 Type II readiness
- ISO 27001 alignment
- NIST framework adoption

## Incident Response Plan
1. **Detection**: Monitoring alerts
2. **Containment**: Isolate affected systems
3. **Investigation**: Root cause analysis
4. **Remediation**: Fix vulnerabilities
5. **Recovery**: Restore services
6. **Post-mortem**: Document lessons learned

## Performance Optimization
- CDN for static assets
- Database query optimization
- Caching strategies
- Load balancing
- Auto-scaling policies
- Resource monitoring