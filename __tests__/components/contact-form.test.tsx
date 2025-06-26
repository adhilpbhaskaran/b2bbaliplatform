import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContactForm } from '@/components/contact-form'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/toaster'
import '@testing-library/jest-dom'

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn()
}))

// Mock the API call
jest.mock('@/lib/api', () => ({
  submitContactForm: jest.fn()
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  )
}

describe('ContactForm Component', () => {
  const user = userEvent.setup()
  
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all form fields', () => {
    render(<ContactForm />, { wrapper: createWrapper() })
    
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/subject/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument()
  })

  it('shows validation errors for empty required fields', async () => {
    render(<ContactForm />, { wrapper: createWrapper() })
    
    const submitButton = screen.getByRole('button', { name: /send message/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/message is required/i)).toBeInTheDocument()
    })
  })

  it('shows validation error for invalid email', async () => {
    render(<ContactForm />, { wrapper: createWrapper() })
    
    const emailInput = screen.getByLabelText(/email/i)
    await user.type(emailInput, 'invalid-email')
    
    const submitButton = screen.getByRole('button', { name: /send message/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument()
    })
  })

  it('shows validation error for invalid phone number', async () => {
    render(<ContactForm />, { wrapper: createWrapper() })
    
    const phoneInput = screen.getByLabelText(/phone/i)
    await user.type(phoneInput, '123')
    
    const submitButton = screen.getByRole('button', { name: /send message/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid phone number/i)).toBeInTheDocument()
    })
  })

  it('submits form with valid data', async () => {
    const { submitContactForm } = require('@/lib/api')
    submitContactForm.mockResolvedValueOnce({ success: true })
    
    render(<ContactForm />, { wrapper: createWrapper() })
    
    // Fill out the form
    await user.type(screen.getByLabelText(/name/i), 'John Doe')
    await user.type(screen.getByLabelText(/email/i), 'john@example.com')
    await user.type(screen.getByLabelText(/phone/i), '+1234567890')
    await user.type(screen.getByLabelText(/subject/i), 'Test Subject')
    await user.type(screen.getByLabelText(/message/i), 'This is a test message')
    
    const submitButton = screen.getByRole('button', { name: /send message/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(submitContactForm).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        subject: 'Test Subject',
        message: 'This is a test message'
      })
    })
  })

  it('shows loading state during submission', async () => {
    const { submitContactForm } = require('@/lib/api')
    submitContactForm.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))
    
    render(<ContactForm />, { wrapper: createWrapper() })
    
    // Fill out required fields
    await user.type(screen.getByLabelText(/name/i), 'John Doe')
    await user.type(screen.getByLabelText(/email/i), 'john@example.com')
    await user.type(screen.getByLabelText(/message/i), 'Test message')
    
    const submitButton = screen.getByRole('button', { name: /send message/i })
    await user.click(submitButton)
    
    expect(screen.getByRole('button', { name: /sending/i })).toBeInTheDocument()
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('handles submission error', async () => {
    const { submitContactForm } = require('@/lib/api')
    const { toast } = require('@/hooks/use-toast')
    
    submitContactForm.mockRejectedValueOnce(new Error('Submission failed'))
    
    render(<ContactForm />, { wrapper: createWrapper() })
    
    // Fill out required fields
    await user.type(screen.getByLabelText(/name/i), 'John Doe')
    await user.type(screen.getByLabelText(/email/i), 'john@example.com')
    await user.type(screen.getByLabelText(/message/i), 'Test message')
    
    const submitButton = screen.getByRole('button', { name: /send message/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive'
      })
    })
  })

  it('resets form after successful submission', async () => {
    const { submitContactForm } = require('@/lib/api')
    submitContactForm.mockResolvedValueOnce({ success: true })
    
    render(<ContactForm />, { wrapper: createWrapper() })
    
    const nameInput = screen.getByLabelText(/name/i)
    const emailInput = screen.getByLabelText(/email/i)
    const messageInput = screen.getByLabelText(/message/i)
    
    // Fill out the form
    await user.type(nameInput, 'John Doe')
    await user.type(emailInput, 'john@example.com')
    await user.type(messageInput, 'Test message')
    
    const submitButton = screen.getByRole('button', { name: /send message/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(nameInput).toHaveValue('')
      expect(emailInput).toHaveValue('')
      expect(messageInput).toHaveValue('')
    })
  })

  it('is accessible', () => {
    render(<ContactForm />, { wrapper: createWrapper() })
    
    // Check for proper labels
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument()
    
    // Check for required attributes
    expect(screen.getByLabelText(/name/i)).toBeRequired()
    expect(screen.getByLabelText(/email/i)).toBeRequired()
    expect(screen.getByLabelText(/message/i)).toBeRequired()
  })
})