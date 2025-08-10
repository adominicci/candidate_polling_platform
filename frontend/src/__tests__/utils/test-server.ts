/**
 * Mock server utilities for testing API interactions
 * Useful for testing components that make HTTP requests
 */

export interface MockResponse {
  status: number
  data?: any
  error?: string
}

export class MockServer {
  private responses: Map<string, MockResponse> = new Map()
  private requestLog: Array<{ url: string; method: string; body?: any; headers?: any }> = []

  // Configure mock response for a specific endpoint
  mockResponse(url: string, response: MockResponse) {
    this.responses.set(url, response)
  }

  // Get logged requests for assertions
  getRequestLog() {
    return [...this.requestLog]
  }

  // Clear all mock responses and logs
  reset() {
    this.responses.clear()
    this.requestLog.length = 0
  }

  // Mock fetch implementation
  fetch = jest.fn().mockImplementation(async (url: string, options: any = {}) => {
    const { method = 'GET', body, headers } = options
    
    // Log the request
    this.requestLog.push({
      url,
      method,
      body: body ? JSON.parse(body) : undefined,
      headers,
    })

    // Find matching response
    const response = this.responses.get(url)
    
    if (!response) {
      return {
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not Found' }),
        text: async () => 'Not Found',
      }
    }

    const isOk = response.status >= 200 && response.status < 300

    return {
      ok: isOk,
      status: response.status,
      statusText: isOk ? 'OK' : 'Error',
      json: async () => response.data || { error: response.error },
      text: async () => JSON.stringify(response.data || { error: response.error }),
      headers: {
        get: (name: string) => {
          const headers: Record<string, string> = {
            'content-type': 'application/json',
          }
          return headers[name.toLowerCase()]
        },
      },
    }
  })
}

// Global mock server instance
export const mockServer = new MockServer()

// Setup and teardown helpers
export const setupMockServer = () => {
  // Replace global fetch with our mock
  global.fetch = mockServer.fetch
}

export const teardownMockServer = () => {
  mockServer.reset()
}

// Common response builders
export const createSuccessResponse = (data: any): MockResponse => ({
  status: 200,
  data,
})

export const createErrorResponse = (status: number, error: string): MockResponse => ({
  status,
  error,
})

// Common API endpoints for the PPD platform
export const API_ENDPOINTS = {
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout',
  ME: '/api/auth/me',
  REFRESH: '/api/auth/refresh',
  SURVEYS: '/api/surveys',
  QUESTIONNAIRES: '/api/questionnaires',
  USERS: '/api/users',
  PRECINCTS: '/api/precincts',
} as const