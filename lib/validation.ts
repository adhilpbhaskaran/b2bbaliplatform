import { z } from 'zod'
import { ValidationError } from './error-handling'

// Main validation function that validates input against a Zod schema
export async function validateInput<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): Promise<T> {
  try {
    const result = schema.safeParse(data)
    
    if (!result.success) {
      const errors = result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
      
      throw new ValidationError(
        'Validation failed',
        errors[0]?.field || 'unknown',
        errors
      )
    }
    
    return result.data
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }
    
    throw new ValidationError(
      'Validation failed',
      'unknown',
      [{ field: 'unknown', message: error instanceof Error ? error.message : 'Unknown error' }]
    )
  }
}

// Synchronous validation function
export function validateInputSync<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): T {
  const result = schema.safeParse(data)
  
  if (!result.success) {
    const errors = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }))
    
    throw new ValidationError(
      'Validation failed',
      errors[0]?.field || 'unknown',
      errors
    )
  }
  
  return result.data
}

// Validate multiple inputs
export async function validateMultipleInputs(
  validations: Array<{
    data: unknown
    schema: z.ZodSchema
    name: string
  }>
): Promise<Record<string, any>> {
  const results: Record<string, any> = {}
  const errors: Array<{ field: string; message: string }> = []
  
  for (const { data, schema, name } of validations) {
    try {
      results[name] = await validateInput(data, schema)
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push(...error.errors.map(err => ({
          field: `${name}.${err.field}`,
          message: err.message
        })))
      } else {
        errors.push({
          field: name,
          message: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
  }
  
  if (errors.length > 0) {
    throw new ValidationError(
      'Multiple validation errors',
      'multiple',
      errors
    )
  }
  
  return results
}

// Validate with custom error message
export async function validateWithMessage<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  customMessage: string
): Promise<T> {
  try {
    return await validateInput(data, schema)
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new ValidationError(
        customMessage,
        error.field,
        error.errors
      )
    }
    throw error
  }
}

// Export validation utilities from security module
export { validationUtils } from './security/validation'