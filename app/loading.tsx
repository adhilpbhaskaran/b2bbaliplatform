import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <LoadingSpinner size="lg" />
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">
            Loading Bali DMC
          </h2>
          <p className="text-sm text-muted-foreground">
            Preparing your journey to paradise...
          </p>
        </div>
      </div>
    </div>
  )
}