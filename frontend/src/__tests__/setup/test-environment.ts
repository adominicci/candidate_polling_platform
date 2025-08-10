/**
 * Global test environment setup
 * This file contains configuration and utilities that are available across all tests
 */

import { configure } from '@testing-library/react'
import { mockLocalStorage, mockSessionStorage } from '../utils/mocks'

// Configure React Testing Library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000,
  computedStyleSupportsPseudoElements: false,
})

// Global test environment setup
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks()
  
  // Reset localStorage and sessionStorage
  mockLocalStorage.clear()
  mockSessionStorage.clear()
  
  // Reset timers
  jest.clearAllTimers()
  
  // Reset DOM
  document.head.innerHTML = ''
  document.body.innerHTML = ''
  
  // Reset console
  if (process.env.NODE_ENV === 'test') {
    console.warn = jest.fn()
    console.error = jest.fn()
  }
})

afterEach(() => {
  // Clean up any remaining timers
  jest.runOnlyPendingTimers()
  jest.useRealTimers()
})

// Global error handling for tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R
      toHaveClass(...classes: string[]): R
      toHaveAttribute(name: string, value?: string): R
      toHaveValue(value: string | number): R
      toBeDisabled(): R
      toBeEnabled(): R
      toBeVisible(): R
      toBeChecked(): R
      toHaveFocus(): R
      toBeValid(): R
      toBeInvalid(): R
      toHaveTextContent(text: string): R
      toContainElement(element: HTMLElement | null): R
    }
  }
}

// Custom test utilities
export const flushPromises = () => new Promise(setImmediate)

export const waitForNextTick = () => new Promise(resolve => process.nextTick(resolve))

// Performance testing helpers
export const measurePerformance = async (fn: () => Promise<void> | void): Promise<number> => {
  const start = performance.now()
  await fn()
  const end = performance.now()
  return end - start
}

// Accessibility testing helpers
export const getElementByRole = (role: string, options?: { name?: string }) => {
  return document.querySelector(`[role="${role}"]${options?.name ? `[aria-label*="${options.name}"]` : ''}`)
}

export const getAllElementsByRole = (role: string) => {
  return Array.from(document.querySelectorAll(`[role="${role}"]`))
}

// Form testing helpers
export const getFormData = (form: HTMLFormElement): Record<string, any> => {
  const formData = new FormData(form)
  const data: Record<string, any> = {}
  
  for (const [key, value] of formData.entries()) {
    if (data[key]) {
      // Handle multiple values (like checkboxes)
      if (Array.isArray(data[key])) {
        data[key].push(value)
      } else {
        data[key] = [data[key], value]
      }
    } else {
      data[key] = value
    }
  }
  
  return data
}

// Network testing helpers
export const createNetworkError = (message: string = 'Network Error') => {
  const error = new Error(message)
  error.name = 'NetworkError'
  return error
}

export const createTimeoutError = (timeout: number = 5000) => {
  const error = new Error(`Request timed out after ${timeout}ms`)
  error.name = 'TimeoutError'
  return error
}

// Date/time testing helpers
export const mockDate = (date: string | Date) => {
  const mockDate = new Date(date)
  jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any)
  return mockDate
}

export const restoreDate = () => {
  jest.spyOn(global, 'Date').mockRestore()
}

// Component testing helpers
export const createMockProps = <T>(overrides: Partial<T> = {}): T => {
  const defaultProps = {
    id: 'test-id',
    className: 'test-class',
    'data-testid': 'test-component',
  }
  
  return { ...defaultProps, ...overrides } as T
}

// Test data generators
export const generateRandomString = (length: number = 10): string => {
  return Math.random().toString(36).substring(2, length + 2)
}

export const generateRandomEmail = (): string => {
  return `test-${generateRandomString(5)}@example.com`
}

export const generateRandomPhoneNumber = (): string => {
  return `787-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`
}

// Debug helpers
export const debugElement = (element: HTMLElement) => {
  console.log('Element HTML:', element.outerHTML)
  console.log('Element classes:', element.classList.toString())
  console.log('Element attributes:', Array.from(element.attributes).map(attr => `${attr.name}="${attr.value}"`))
}

export const debugScreen = () => {
  console.log('Current DOM:', document.body.innerHTML)
}