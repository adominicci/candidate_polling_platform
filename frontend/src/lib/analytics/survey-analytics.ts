export interface SubmissionMetrics {
  response_id: string
  user_id: string
  questionnaire_id: string
  response_time: number
  answer_count: number
  is_draft: boolean
  device_info: any
  completion_percentage: number
  timestamp?: string
}

export interface AnalyticsEvent {
  event: string
  properties: Record<string, any>
  timestamp: string
  session_id?: string
}

export class SurveyAnalytics {
  private events: AnalyticsEvent[] = []
  private readonly MAX_EVENTS = 10000 // In-memory event limit

  /**
   * Track survey submission
   */
  trackSubmission(metrics: SubmissionMetrics): void {
    this.trackEvent('survey_submitted', {
      response_id: metrics.response_id,
      user_id: metrics.user_id,
      questionnaire_id: metrics.questionnaire_id,
      response_time_ms: metrics.response_time,
      answer_count: metrics.answer_count,
      is_draft: metrics.is_draft,
      completion_percentage: metrics.completion_percentage,
      device_type: this.getDeviceType(metrics.device_info),
      network_type: metrics.device_info.connection_type || 'unknown'
    })

    // Track performance metrics
    this.trackPerformance({
      operation: 'survey_submission',
      duration_ms: metrics.response_time,
      success: true,
      metadata: {
        answer_count: metrics.answer_count,
        is_draft: metrics.is_draft
      }
    })
  }

  /**
   * Track validation errors
   */
  trackValidationError(data: {
    user_id: string
    questionnaire_id: string
    error_count: number
    error_types: string[]
    field_errors: Record<string, string[]>
  }): void {
    this.trackEvent('validation_error', {
      user_id: data.user_id,
      questionnaire_id: data.questionnaire_id,
      error_count: data.error_count,
      error_types: data.error_types,
      most_common_error: this.getMostCommonError(data.field_errors)
    })
  }

  /**
   * Track validation failures for API endpoints
   */
  trackValidationFailure(data: {
    request_id: string
    user_id: string
    questionnaire_id: string
    error_count: number
    error_types: string[]
  }): void {
    this.trackEvent('api_validation_failure', {
      request_id: data.request_id,
      user_id: data.user_id,
      questionnaire_id: data.questionnaire_id,
      error_count: data.error_count,
      error_types: data.error_types,
      endpoint: 'survey_submission'
    })
  }

  /**
   * Track duplicate submission attempts
   */
  trackDuplicateSubmission(data: {
    request_id: string
    user_id: string
    questionnaire_id: string
    existing_response_id: string
  }): void {
    this.trackEvent('duplicate_submission_attempt', {
      request_id: data.request_id,
      user_id: data.user_id,
      questionnaire_id: data.questionnaire_id,
      existing_response_id: data.existing_response_id,
      prevention_successful: true
    })
  }

  /**
   * Track rate limiting events
   */
  trackRateLimit(data: {
    request_id: string
    ip: string
    user_agent: string
    reset_time: number
  }): void {
    this.trackEvent('rate_limit_exceeded', {
      request_id: data.request_id,
      ip_address: data.ip,
      user_agent: data.user_agent,
      reset_time: data.reset_time,
      endpoint: 'survey_submission'
    })
  }

  /**
   * Track submission errors for analytics
   */
  trackSubmissionError(data: {
    request_id: string
    error_type: string
    error_message: string
    response_id?: string
    retry_attempts: number
  }): void {
    this.trackEvent('submission_error', {
      request_id: data.request_id,
      error_type: data.error_type,
      error_message: data.error_message,
      response_id: data.response_id,
      retry_attempts: data.retry_attempts,
      recoverable: data.retry_attempts > 0
    })
  }

  /**
   * Track draft operations
   */
  trackDraftOperation(data: {
    operation: 'create' | 'update' | 'delete' | 'cleanup'
    draft_id?: string
    user_id: string
    questionnaire_id?: string
    completion_percentage?: number
    is_auto_save?: boolean
    response_time: number
  }): void {
    this.trackEvent('draft_operation', {
      operation: data.operation,
      draft_id: data.draft_id,
      user_id: data.user_id,
      questionnaire_id: data.questionnaire_id,
      completion_percentage: data.completion_percentage,
      is_auto_save: data.is_auto_save || false,
      response_time_ms: data.response_time
    })
  }

  /**
   * Track batch submission operations
   */
  trackBatchSubmission(data: {
    request_id: string
    user_id: string
    batch_id?: string
    total_submissions: number
    successful_submissions: number
    failed_submissions: number
    response_time: number
    offline_mode: boolean
  }): void {
    this.trackEvent('batch_submission', {
      request_id: data.request_id,
      user_id: data.user_id,
      batch_id: data.batch_id,
      total_submissions: data.total_submissions,
      successful_submissions: data.successful_submissions,
      failed_submissions: data.failed_submissions,
      success_rate: Math.round((data.successful_submissions / data.total_submissions) * 100),
      response_time_ms: data.response_time,
      offline_mode: data.offline_mode
    })
  }

  /**
   * Track network resilience events
   */
  trackNetworkResilience(data: {
    operation: string
    attempt_count: number
    total_time: number
    success: boolean
    error_type?: string
    idempotency_used: boolean
  }): void {
    this.trackEvent('network_resilience', {
      operation: data.operation,
      attempt_count: data.attempt_count,
      total_time_ms: data.total_time,
      success: data.success,
      error_type: data.error_type,
      idempotency_used: data.idempotency_used,
      resilience_effective: data.attempt_count > 1 && data.success
    })
  }

  /**
   * Enhanced security event tracking
   */
  trackSecurityEvent(data: {
    type: string
    request_id: string
    ip: string
    user_agent: string
    endpoint: string
    severity?: 'low' | 'medium' | 'high' | 'critical'
    details?: Record<string, any>
  }): void {
    this.trackEvent('security_event', {
      security_event_type: data.type,
      request_id: data.request_id,
      ip_address: data.ip,
      user_agent: data.user_agent,
      endpoint: data.endpoint,
      severity: data.severity || this.getSecuritySeverity(data.type),
      ...data.details
    })
  }

  /**
   * Track API performance
   */
  trackPerformance(data: {
    operation: string
    duration_ms: number
    success: boolean
    metadata?: Record<string, any>
  }): void {
    this.trackEvent('api_performance', {
      operation: data.operation,
      duration_ms: data.duration_ms,
      success: data.success,
      performance_tier: this.getPerformanceTier(data.duration_ms),
      ...data.metadata
    })
  }

  /**
   * Track security events
   */
  trackSecurityEvent(data: {
    event_type: 'rate_limit' | 'sql_injection' | 'xss_attempt' | 'unauthorized_access'
    user_id?: string
    ip_address?: string
    details: Record<string, any>
  }): void {
    this.trackEvent('security_event', {
      security_event_type: data.event_type,
      user_id: data.user_id,
      ip_address: data.ip_address,
      severity: this.getSecuritySeverity(data.event_type),
      ...data.details
    })
  }

  /**
   * Track user engagement
   */
  trackEngagement(data: {
    user_id: string
    questionnaire_id: string
    section_completion_times: Record<string, number>
    abandonment_point?: string
    total_time_spent: number
  }): void {
    this.trackEvent('user_engagement', {
      user_id: data.user_id,
      questionnaire_id: data.questionnaire_id,
      total_time_spent_ms: data.total_time_spent,
      abandonment_point: data.abandonment_point,
      sections_completed: Object.keys(data.section_completion_times).length,
      average_section_time: this.calculateAverageTime(data.section_completion_times)
    })
  }

  /**
   * Generic event tracking
   */
  trackEvent(event: string, properties: Record<string, any>): void {
    const analyticsEvent: AnalyticsEvent = {
      event,
      properties: {
        ...properties,
        environment: process.env.NODE_ENV || 'development',
        version: process.env.APP_VERSION || '1.0.0'
      },
      timestamp: new Date().toISOString()
    }

    // Add to in-memory store
    this.events.push(analyticsEvent)

    // Keep only recent events to prevent memory issues
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS)
    }

    // Send to external analytics service (if configured)
    this.sendToExternalService(analyticsEvent)

    // Log for debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics Event:', analyticsEvent)
    }
  }

  /**
   * Get analytics summary for monitoring
   */
  getAnalyticsSummary(timeRange: { start: Date; end: Date }): {
    total_events: number
    events_by_type: Record<string, number>
    performance_metrics: {
      avg_response_time: number
      success_rate: number
      error_rate: number
    }
    user_metrics: {
      active_users: number
      total_submissions: number
      draft_rate: number
    }
  } {
    const filteredEvents = this.events.filter(event => {
      const eventTime = new Date(event.timestamp)
      return eventTime >= timeRange.start && eventTime <= timeRange.end
    })

    const eventsByType = this.groupEventsByType(filteredEvents)
    const performanceMetrics = this.calculatePerformanceMetrics(filteredEvents)
    const userMetrics = this.calculateUserMetrics(filteredEvents)

    return {
      total_events: filteredEvents.length,
      events_by_type: eventsByType,
      performance_metrics: performanceMetrics,
      user_metrics: userMetrics
    }
  }

  /**
   * Get real-time metrics with enhanced monitoring
   */
  getRealTimeMetrics(): {
    active_submissions: number
    avg_response_time_5min: number
    error_rate_5min: number
    rate_limit_violations_1min: number
    draft_saves_5min: number
    batch_operations_1hr: number
    network_retry_success_rate: number
    validation_failure_rate: number
  } {
    const now = new Date()
    const oneMinAgo = new Date(now.getTime() - 1 * 60 * 1000)
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    const recentEvents = this.events.filter(event => 
      new Date(event.timestamp) >= fiveMinAgo
    )
    
    const veryRecentEvents = this.events.filter(event => 
      new Date(event.timestamp) >= oneMinAgo
    )
    
    const hourlyEvents = this.events.filter(event => 
      new Date(event.timestamp) >= oneHourAgo
    )

    // Network resilience metrics
    const resilienceEvents = recentEvents.filter(e => e.event === 'network_resilience')
    const successfulRetries = resilienceEvents.filter(e => 
      e.properties.success && e.properties.attempt_count > 1
    )
    const networkRetrySuccessRate = resilienceEvents.length > 0 ? 
      Math.round((successfulRetries.length / resilienceEvents.length) * 100) : 0

    // Validation failure rate
    const submissionEvents = recentEvents.filter(e => 
      e.event === 'survey_submitted' || e.event === 'api_validation_failure'
    )
    const validationFailures = recentEvents.filter(e => e.event === 'api_validation_failure')
    const validationFailureRate = submissionEvents.length > 0 ? 
      Math.round((validationFailures.length / submissionEvents.length) * 100) : 0

    return {
      active_submissions: recentEvents.filter(e => e.event === 'survey_submitted').length,
      avg_response_time_5min: this.calculateAverageResponseTime(recentEvents),
      error_rate_5min: this.calculateErrorRate(recentEvents),
      rate_limit_violations_1min: veryRecentEvents.filter(e => 
        e.event === 'rate_limit_exceeded'
      ).length,
      draft_saves_5min: recentEvents.filter(e => 
        e.event === 'draft_operation' && e.properties.operation !== 'delete'
      ).length,
      batch_operations_1hr: hourlyEvents.filter(e => e.event === 'batch_submission').length,
      network_retry_success_rate: networkRetrySuccessRate,
      validation_failure_rate: validationFailureRate
    }
  }

  /**
   * Get API health metrics
   */
  getApiHealthMetrics(): {
    status: 'healthy' | 'degraded' | 'unhealthy'
    uptime_percentage: number
    average_response_time: number
    error_rate: number
    recent_issues: Array<{
      type: string
      count: number
      last_occurrence: string
    }>
  } {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    
    const recentEvents = this.events.filter(event => 
      new Date(event.timestamp) >= oneHourAgo
    )
    
    const performanceEvents = recentEvents.filter(e => e.event === 'api_performance')
    const errorEvents = recentEvents.filter(e => 
      e.event === 'submission_error' || e.event === 'api_validation_failure'
    )
    
    const errorRate = performanceEvents.length > 0 ? 
      Math.round((errorEvents.length / performanceEvents.length) * 100) : 0
    
    const avgResponseTime = this.calculateAverageResponseTime(recentEvents)
    
    // Determine health status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    if (errorRate > 10 || avgResponseTime > 5000) {
      status = 'degraded'
    }
    if (errorRate > 25 || avgResponseTime > 10000) {
      status = 'unhealthy'
    }
    
    // Group recent issues
    const issueGroups = errorEvents.reduce((acc, event) => {
      const type = event.properties.error_type || event.event
      if (!acc[type]) {
        acc[type] = {
          type,
          count: 0,
          last_occurrence: event.timestamp
        }
      }
      acc[type].count++
      if (new Date(event.timestamp) > new Date(acc[type].last_occurrence)) {
        acc[type].last_occurrence = event.timestamp
      }
      return acc
    }, {} as Record<string, { type: string; count: number; last_occurrence: string }>)
    
    return {
      status,
      uptime_percentage: Math.max(0, 100 - errorRate),
      average_response_time: avgResponseTime,
      error_rate: errorRate,
      recent_issues: Object.values(issueGroups)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    }
  }

  /**
   * Helper methods
   */
  private getDeviceType(deviceInfo: any): string {
    const userAgent = deviceInfo?.user_agent?.toLowerCase() || ''
    
    if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
      return 'mobile'
    }
    if (userAgent.includes('tablet') || userAgent.includes('ipad')) {
      return 'tablet'
    }
    return 'desktop'
  }

  private getPerformanceTier(responseTime: number): string {
    if (responseTime < 1000) return 'excellent'
    if (responseTime < 3000) return 'good'
    if (responseTime < 5000) return 'acceptable'
    return 'poor'
  }

  private getSecuritySeverity(eventType: string): string {
    const severityMap: Record<string, string> = {
      'rate_limit': 'medium',
      'sql_injection': 'high',
      'xss_attempt': 'high',
      'unauthorized_access': 'medium',
      'duplicate_submission_attempt': 'low',
      'invalid_user_profile': 'medium',
      'invalid_questionnaire': 'low',
      'batch_processing_error': 'medium'
    }
    return severityMap[eventType] || 'low'
  }

  private getMostCommonError(fieldErrors: Record<string, string[]>): string {
    const errorCounts: Record<string, number> = {}
    
    Object.values(fieldErrors).forEach(errors => {
      errors.forEach(error => {
        errorCounts[error] = (errorCounts[error] || 0) + 1
      })
    })
    
    return Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown'
  }

  private calculateAverageTime(times: Record<string, number>): number {
    const values = Object.values(times)
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
  }

  private groupEventsByType(events: AnalyticsEvent[]): Record<string, number> {
    return events.reduce((acc, event) => {
      acc[event.event] = (acc[event.event] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  private calculatePerformanceMetrics(events: AnalyticsEvent[]) {
    const performanceEvents = events.filter(e => e.event === 'api_performance')
    
    if (performanceEvents.length === 0) {
      return { avg_response_time: 0, success_rate: 0, error_rate: 0 }
    }

    const totalTime = performanceEvents.reduce((sum, e) => 
      sum + (e.properties.duration_ms || 0), 0
    )
    const successfulEvents = performanceEvents.filter(e => e.properties.success)
    
    return {
      avg_response_time: Math.round(totalTime / performanceEvents.length),
      success_rate: Math.round((successfulEvents.length / performanceEvents.length) * 100),
      error_rate: Math.round(((performanceEvents.length - successfulEvents.length) / performanceEvents.length) * 100)
    }
  }

  private calculateUserMetrics(events: AnalyticsEvent[]) {
    const submissionEvents = events.filter(e => e.event === 'survey_submitted')
    const uniqueUsers = new Set(submissionEvents.map(e => e.properties.user_id))
    const draftSubmissions = submissionEvents.filter(e => e.properties.is_draft)
    
    return {
      active_users: uniqueUsers.size,
      total_submissions: submissionEvents.length,
      draft_rate: submissionEvents.length > 0 ? 
        Math.round((draftSubmissions.length / submissionEvents.length) * 100) : 0
    }
  }

  private calculateAverageResponseTime(events: AnalyticsEvent[]): number {
    const submissionEvents = events.filter(e => e.event === 'survey_submitted')
    
    if (submissionEvents.length === 0) return 0
    
    const totalTime = submissionEvents.reduce((sum, e) => 
      sum + (e.properties.response_time_ms || 0), 0
    )
    
    return Math.round(totalTime / submissionEvents.length)
  }

  private calculateErrorRate(events: AnalyticsEvent[]): number {
    const performanceEvents = events.filter(e => e.event === 'api_performance')
    
    if (performanceEvents.length === 0) return 0
    
    const errorEvents = performanceEvents.filter(e => !e.properties.success)
    
    return Math.round((errorEvents.length / performanceEvents.length) * 100)
  }

  private async sendToExternalService(event: AnalyticsEvent): Promise<void> {
    // In a real implementation, this would send to services like:
    // - PostHog
    // - Mixpanel 
    // - Google Analytics
    // - Custom analytics API
    
    try {
      // Example: PostHog integration
      if (process.env.POSTHOG_API_KEY && typeof window !== 'undefined') {
        // Client-side PostHog tracking
        // posthog.capture(event.event, event.properties)
      }
      
      // Example: Custom analytics API
      if (process.env.ANALYTICS_API_URL) {
        // await fetch(process.env.ANALYTICS_API_URL, {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(event)
        // })
      }
    } catch (error) {
      // Silently handle analytics failures to not impact main functionality
      if (process.env.NODE_ENV === 'development') {
        console.warn('Analytics service error:', error)
      }
    }
  }
}