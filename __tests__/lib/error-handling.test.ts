import {
  ApiError,
  NetworkError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  handleApiError,
  withRetry,
  getErrorInfo
} from '@/lib/error-handling'
import '@testing-library/jest-dom'

describe('Error Handling Utilities', () => {
  describe('Custom Error Classes', () => {
    it('creates ApiError with correct properties', () => {
      const error = new ApiError('API failed', 500, 'SERVER_ERROR')
      expect(error.name).toBe('ApiError')
      expect(error.message).toBe('API failed')
      expect(error.statusCode).toBe(500)
      expect(error.code).toBe('SERVER_ERROR')
    })

    it('creates NetworkError with default message', () => {
      const error = new NetworkError()
      expect(error.name).toBe('NetworkError')
      expect(error.message).toBe('Network connection failed')
    })

    it('creates ValidationError with field and errors', () => {
      const errors = { email: ['Invalid email format'] }
      const error = new ValidationError('Validation failed', 'email', errors)
      expect(error.name).toBe('ValidationError')
      expect(error.field).toBe('email')
      expect(error.errors).toEqual(errors)
    })

    it('creates AuthenticationError with default message', () => {
      const error = new AuthenticationError()
      expect(error.name).toBe('AuthenticationError')
      expect(error.message).toBe('Authentication required')
    })

    it('creates AuthorizationError with default message', () => {
      const error = new AuthorizationError()
      expect(error.name).toBe('AuthorizationError')
      expect(error.message).toBe('Insufficient permissions')
    })
  })

  describe('handleApiError', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('handles ApiError correctly', () => {
      const error = new ApiError('Server error', 500, 'SERVER_ERROR')
      const result = handleApiError(error)
      
      expect(result).toEqual({
        message: 'Server error',
        code: 'SERVER_ERROR',
        statusCode: 500
      })
    })

    it('handles NetworkError correctly', () => {
      const error = new NetworkError('Connection failed')
      const result = handleApiError(error)
      
      expect(result).toEqual({
        message: 'Network connection failed. Please check your internet connection.',
        code: 'NETWORK_ERROR',
        statusCode: 0
      })
    })

    it('handles ValidationError correctly', () => {
      const errors = { email: ['Invalid email'] }
      const error = new ValidationError('Validation failed', 'email', errors)
      const result = handleApiError(error)
      
      expect(result).toEqual({
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        field: 'email',
        errors
      })
    })

    it('handles AuthenticationError correctly', () => {
      const error = new AuthenticationError('Login required')
      const result = handleApiError(error)
      
      expect(result).toEqual({
        message: 'Login required',
        code: 'AUTHENTICATION_ERROR',
        statusCode: 401
      })
    })

    it('handles AuthorizationError correctly', () => {
      const error = new AuthorizationError('Access denied')
      const result = handleApiError(error)
      
      expect(result).toEqual({
        message: 'Access denied',
        code: 'AUTHORIZATION_ERROR',
        statusCode: 403
      })
    })

    it('handles fetch TypeError correctly', () => {
      const error = new TypeError('fetch failed')
      const result = handleApiError(error)
      
      expect(result).toEqual({
        message: 'Network connection failed. Please check your internet connection.',
        code: 'NETWORK_ERROR',
        statusCode: 0
      })
    })

    it('handles generic Error correctly', () => {
      const error = new Error('Something went wrong')
      const result = handleApiError(error)
      
      expect(result).toEqual({
        message: 'Something went wrong',
        code: 'UNKNOWN_ERROR',
        statusCode: 500
      })
    })

    it('handles non-Error objects correctly', () => {
      const result = handleApiError('String error')
      
      expect(result).toEqual({
        message: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
        statusCode: 500
      })
    })
  })

  describe('withRetry', () => {
    it('succeeds on first attempt', async () => {
      const mockFn = jest.fn().mockResolvedValue('success')
      
      const result = await withRetry(mockFn)
      
      expect(result).toBe('success')
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('does not retry on ValidationError', async () => {
      const error = new ValidationError('Invalid input')
      const mockFn = jest.fn().mockRejectedValue(error)
      
      await expect(withRetry(mockFn)).rejects.toThrow('Invalid input')
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('does not retry on AuthenticationError', async () => {
      const error = new AuthenticationError('Not authenticated')
      const mockFn = jest.fn().mockRejectedValue(error)
      
      await expect(withRetry(mockFn)).rejects.toThrow('Not authenticated')
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('does not retry on 4xx ApiError', async () => {
      const error = new ApiError('Bad request', 400)
      const mockFn = jest.fn().mockRejectedValue(error)
      
      await expect(withRetry(mockFn)).rejects.toThrow('Bad request')
      expect(mockFn).toHaveBeenCalledTimes(1)
    })
  })

  describe('getErrorInfo', () => {
    it('extracts error information correctly', () => {
      const error = new Error('Test error')
      error.stack = 'Error: Test error\n    at test.js:1:1'
      
      const errorInfo = { componentStack: '\n    in Component' }
      
      const result = getErrorInfo(error, errorInfo)
      
      expect(result).toMatchObject({
        message: 'Test error',
        stack: 'Error: Test error\n    at test.js:1:1',
        componentStack: '\n    in Component'
      })
      expect(result.timestamp).toBeDefined()
      expect(result.userAgent).toBeDefined()
      expect(result.url).toBeDefined()
    })

    it('works without errorInfo', () => {
      const error = new Error('Test error')
      
      const result = getErrorInfo(error)
      
      expect(result.message).toBe('Test error')
      expect(result.componentStack).toBeUndefined()
    })
  })
})