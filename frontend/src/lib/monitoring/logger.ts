export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  timestamp: string
  context: string
  metadata?: Record<string, any>
  traceId?: string
  userId?: string
}

export interface LoggerConfig {
  context: string
  enableConsole?: boolean
  enableFile?: boolean
  minLevel?: 'debug' | 'info' | 'warn' | 'error'
}

export class Logger {
  private config: LoggerConfig
  private logs: LogEntry[] = []
  private readonly MAX_LOGS = 5000 // In-memory log limit

  constructor(context: string, config?: Partial<LoggerConfig>) {
    this.config = {
      context,
      enableConsole: config?.enableConsole ?? true,
      enableFile: config?.enableFile ?? false,
      minLevel: config?.minLevel ?? 'info'
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, metadata?: Record<string, any>): void {
    this.log('debug', message, metadata)
  }

  /**
   * Log info message
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.log('info', message, metadata)
  }

  /**
   * Log warning message
   */
  warn(message: string, metadata?: Record<string, any>): void {
    this.log('warn', message, metadata)
  }

  /**
   * Log error message
   */
  error(message: string, metadata?: Record<string, any>): void {
    this.log('error', message, metadata)
  }

  /**
   * Core logging method
   */
  private log(level: LogEntry['level'], message: string, metadata?: Record<string, any>): void {
    // Check if level meets minimum threshold
    if (!this.shouldLog(level)) {
      return
    }

    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.config.context,
      metadata: this.sanitizeMetadata(metadata),
      traceId: this.generateTraceId(),
      userId: this.extractUserId(metadata)
    }

    // Add to in-memory store
    this.logs.push(logEntry)
    
    // Keep only recent logs to prevent memory issues
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(-this.MAX_LOGS)
    }

    // Output to console if enabled
    if (this.config.enableConsole) {
      this.outputToConsole(logEntry)
    }

    // Write to file if enabled (in server environment)
    if (this.config.enableFile && typeof window === 'undefined') {
      this.writeToFile(logEntry)
    }

    // Send to external logging service
    this.sendToExternalService(logEntry)
  }

  /**
   * Check if message should be logged based on level
   */
  private shouldLog(level: LogEntry['level']): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 }
    return levels[level] >= levels[this.config.minLevel!]
  }

  /**
   * Generate unique trace ID for request tracking
   */
  private generateTraceId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15)
  }

  /**
   * Extract user ID from metadata for correlation
   */
  private extractUserId(metadata?: Record<string, any>): string | undefined {
    return metadata?.userId || metadata?.user_id || metadata?.id
  }

  /**
   * Sanitize metadata to remove sensitive information
   */
  private sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) return undefined

    const sanitized = { ...metadata }
    
    // Remove sensitive fields
    const sensitiveFields = [
      'password', 'token', 'authorization', 'secret', 'key',
      'ssn', 'social_security', 'credit_card', 'cvv'
    ]
    
    const sanitizeObject = (obj: any, path = ''): any => {
      if (typeof obj !== 'object' || obj === null) {
        return obj
      }
      
      if (Array.isArray(obj)) {
        return obj.map((item, index) => sanitizeObject(item, `${path}[${index}]`))
      }
      
      const result: any = {}
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = path ? `${path}.${key}` : key
        
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          result[key] = '[REDACTED]'
        } else {
          result[key] = sanitizeObject(value, fullKey)
        }
      }
      
      return result
    }
    
    return sanitizeObject(sanitized)
  }

  /**
   * Output log to console with appropriate styling
   */
  private outputToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString()
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.context}]`
    
    const message = entry.metadata ? 
      `${entry.message} ${JSON.stringify(entry.metadata)}` : 
      entry.message

    switch (entry.level) {
      case 'debug':
        console.debug(`🔍 ${prefix}`, message)
        break
      case 'info':
        console.info(`ℹ️ ${prefix}`, message)
        break
      case 'warn':
        console.warn(`⚠️ ${prefix}`, message)
        break
      case 'error':
        console.error(`❌ ${prefix}`, message)
        break
    }
  }

  /**
   * Write log to file (server-side only)
   */
  private writeToFile(entry: LogEntry): void {
    try {
      // In a real implementation, this would use fs.appendFile
      // const logLine = JSON.stringify(entry) + '\n'
      // fs.appendFileSync(`logs/${this.config.context}.log`, logLine)
    } catch (error) {
      // Silently handle file write errors
      console.error('Failed to write log to file:', error)
    }
  }

  /**
   * Send log to external logging service
   */
  private async sendToExternalService(entry: LogEntry): Promise<void> {
    // Only send warn and error levels to external services by default
    if (entry.level !== 'warn' && entry.level !== 'error') {
      return
    }

    try {
      // Example: Send to logging service like DataDog, New Relic, etc.
      if (process.env.LOGGING_SERVICE_URL) {
        // await fetch(process.env.LOGGING_SERVICE_URL, {
        //   method: 'POST',
        //   headers: {
        //     'Content-Type': 'application/json',
        //     'Authorization': `Bearer ${process.env.LOGGING_API_KEY}`
        //   },
        //   body: JSON.stringify(entry)
        // })
      }
      
      // Example: Send to Supabase for centralized logging
      if (process.env.SUPABASE_URL && entry.level === 'error') {
        // Store critical errors in database for analysis
        // const { error } = await supabase
        //   .from('error_logs')
        //   .insert({
        //     level: entry.level,
        //     message: entry.message,
        //     context: entry.context,
        //     metadata: entry.metadata,
        //     timestamp: entry.timestamp
        //   })
      }
    } catch (error) {
      // Silently handle external logging failures
      if (process.env.NODE_ENV === 'development') {
        console.warn('External logging service error:', error)
      }
    }
  }

  /**
   * Get recent logs for debugging
   */
  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logs.slice(-count)
  }

  /**
   * Filter logs by level
   */
  getLogsByLevel(level: LogEntry['level'], count: number = 100): LogEntry[] {
    return this.logs
      .filter(log => log.level === level)
      .slice(-count)
  }

  /**
   * Get logs by time range
   */
  getLogsByTimeRange(start: Date, end: Date): LogEntry[] {
    return this.logs.filter(log => {
      const logTime = new Date(log.timestamp)
      return logTime >= start && logTime <= end
    })
  }

  /**
   * Search logs by message content
   */
  searchLogs(query: string, count: number = 100): LogEntry[] {
    const lowerQuery = query.toLowerCase()
    return this.logs
      .filter(log => 
        log.message.toLowerCase().includes(lowerQuery) ||
        JSON.stringify(log.metadata || {}).toLowerCase().includes(lowerQuery)
      )
      .slice(-count)
  }

  /**
   * Get logging statistics
   */
  getStats(): {
    total_logs: number
    logs_by_level: Record<string, number>
    recent_errors: number
    average_logs_per_minute: number
  } {
    const now = new Date()
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)
    const recentLogs = this.logs.filter(log => new Date(log.timestamp) >= oneMinuteAgo)
    
    const logsByLevel = this.logs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total_logs: this.logs.length,
      logs_by_level: logsByLevel,
      recent_errors: recentLogs.filter(log => log.level === 'error').length,
      average_logs_per_minute: recentLogs.length
    }
  }

  /**
   * Clear all logs (use with caution)
   */
  clearLogs(): void {
    this.logs = []
  }

  /**
   * Export logs as JSON
   */
  exportLogs(timeRange?: { start: Date; end: Date }): string {
    let logsToExport = this.logs
    
    if (timeRange) {
      logsToExport = this.getLogsByTimeRange(timeRange.start, timeRange.end)
    }
    
    return JSON.stringify(logsToExport, null, 2)
  }
}