import { Button } from '@/components/ui/button'
import { MapPin, Home, Search } from 'lucide-react'
import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Page Not Found',
  description: 'The page you are looking for could not be found.',
}

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
            <MapPin className="h-12 w-12 text-primary" />
          </div>
          <h1 className="mb-2 text-6xl font-bold text-foreground">404</h1>
          <h2 className="mb-4 text-2xl font-semibold text-foreground">
            Page Not Found
          </h2>
          <p className="text-muted-foreground">
            Oops! It seems like you've wandered off the beaten path. The page
            you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="mb-8">
          <div className="rounded-lg bg-muted/50 p-6">
            <h3 className="mb-3 font-semibold text-foreground">
              What you can do:
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Check the URL for any typos</li>
              <li>• Go back to the homepage</li>
              <li>• Search for what you're looking for</li>
              <li>• Contact us if you think this is an error</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild className="flex items-center gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              Go Home
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/packages" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Browse Packages
            </Link>
          </Button>
        </div>

        <div className="mt-8 text-sm text-muted-foreground">
          <p>
            Still need help?{' '}
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