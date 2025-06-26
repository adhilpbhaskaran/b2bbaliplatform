'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Something went wrong!
          </h1>
          <p className="mt-2 text-muted-foreground">
            We encountered an unexpected error. Please try again or contact
            support if the problem persists.
          </p>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 rounded-lg bg-muted p-4 text-left">
            <h3 className="mb-2 font-semibold text-foreground">Error Details:</h3>
            <code className="text-sm text-muted-foreground">
              {error.message}
            </code>
            {error.digest && (
              <p className="mt-2 text-xs text-muted-foreground">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={reset} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Go home
            </Link>
          </Button>
        </div>

        <div className="mt-8 text-sm text-muted-foreground">
          <p>
            Need help?{' '}
            <Link
              href="/contact"
              className="text-primary underline-offset-4 hover:underline"
            >
              Contact our support team
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}