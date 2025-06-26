'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Log error to monitoring service
    this.logError(error, errorInfo)
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  private logError = (error: Error, errorInfo: React.ErrorInfo) => {
    // In production, send to error tracking service (e.g., Sentry)
    if (process.env.NODE_ENV === 'production') {
      console.error('Error Boundary caught an error:', {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        errorInfo: {
          componentStack: errorInfo.componentStack
        },
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown'
      })
    } else {
      console.error('Error Boundary caught an error:', error, errorInfo)
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error!} reset={this.handleReset} />
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
          <Card className="max-w-md w-full p-6 text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-red-500" />
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Something went wrong
            </h2>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We're sorry, but something unexpected happened. Please try again or contact support if the problem persists.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Error Details (Development)
                </summary>
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs font-mono overflow-auto max-h-32">
                  <div className="text-red-600 dark:text-red-400 font-semibold">
                    {this.state.error.name}: {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <pre className="mt-2 text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={this.handleReset}
                variant="primary"
                className="flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              
              <Button 
                onClick={this.handleReload}
                variant="outline"
                className="flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Reload Page
              </Button>
              
              <Link href="/">
                <Button 
                  variant="ghost"
                  className="flex items-center justify-center gap-2 w-full"
                >
                  <Home className="h-4 w-4" />
                  Go Home
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Custom fallback components
export const MinimalErrorFallback: React.FC<{ error: Error; reset: () => void }> = ({ error, reset }) => (
  <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
    <h3 className="text-red-800 font-medium mb-2">Something went wrong</h3>
    <p className="text-red-600 text-sm mb-3">{error.message}</p>
    <Button onClick={reset} size="sm" variant="outline">
      Try again
    </Button>
  </div>
)

export const FullPageErrorFallback: React.FC<{ error: Error; reset: () => void }> = ({ error, reset }) => (
  <div className="min-h-screen flex items-center justify-center p-4">
    <div className="text-center">
      <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h1>
      <p className="text-gray-600 mb-6 max-w-md">
        We encountered an unexpected error. Our team has been notified and is working on a fix.
      </p>
      <div className="flex gap-3 justify-center">
        <Button onClick={reset}>Try Again</Button>
        <Link href="/">
          <Button variant="outline">Go Home</Button>
        </Link>
      </div>
    </div>
  </div>
)

// Hook for functional components
export const useErrorHandler = () => {
  return (error: Error, errorInfo?: React.ErrorInfo) => {
    console.error('Error caught by error handler:', error, errorInfo)
    
    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Send to Sentry, LogRocket, etc.
    }
  }
}

export default ErrorBoundary