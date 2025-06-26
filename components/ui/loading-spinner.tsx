import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const spinnerVariants = cva(
  'animate-spin rounded-full border-2 border-solid border-current border-r-transparent',
  {
    variants: {
      size: {
        sm: 'h-4 w-4',
        default: 'h-6 w-6',
        lg: 'h-8 w-8',
        xl: 'h-12 w-12',
      },
      variant: {
        default: 'text-primary',
        secondary: 'text-secondary',
        muted: 'text-muted-foreground',
        white: 'text-white',
      },
    },
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
  }
)

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size, variant, label, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-center', className)}
        {...props}
      >
        <div
          className={cn(spinnerVariants({ size, variant }))}
          role="status"
          aria-label={label || 'Loading'}
        >
          <span className="sr-only">{label || 'Loading...'}</span>
        </div>
      </div>
    )
  }
)
LoadingSpinner.displayName = 'LoadingSpinner'

// Alternative dot spinner
const DotSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size, variant, label, ...props }, ref) => {
    const dotSize = size === 'sm' ? 'h-1 w-1' : size === 'lg' ? 'h-3 w-3' : size === 'xl' ? 'h-4 w-4' : 'h-2 w-2'
    const dotColor = variant === 'white' ? 'bg-white' : variant === 'secondary' ? 'bg-secondary' : variant === 'muted' ? 'bg-muted-foreground' : 'bg-primary'
    
    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-center space-x-1', className)}
        role="status"
        aria-label={label || 'Loading'}
        {...props}
      >
        <div className={cn(dotSize, dotColor, 'rounded-full animate-bounce')} style={{ animationDelay: '0ms' }} />
        <div className={cn(dotSize, dotColor, 'rounded-full animate-bounce')} style={{ animationDelay: '150ms' }} />
        <div className={cn(dotSize, dotColor, 'rounded-full animate-bounce')} style={{ animationDelay: '300ms' }} />
        <span className="sr-only">{label || 'Loading...'}</span>
      </div>
    )
  }
)
DotSpinner.displayName = 'DotSpinner'

// Pulse spinner
const PulseSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size, variant, label, ...props }, ref) => {
    const pulseSize = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-8 w-8' : size === 'xl' ? 'h-12 w-12' : 'h-6 w-6'
    const pulseColor = variant === 'white' ? 'bg-white' : variant === 'secondary' ? 'bg-secondary' : variant === 'muted' ? 'bg-muted-foreground' : 'bg-primary'
    
    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-center', className)}
        role="status"
        aria-label={label || 'Loading'}
        {...props}
      >
        <div className={cn(pulseSize, pulseColor, 'rounded-full animate-pulse opacity-75')} />
        <span className="sr-only">{label || 'Loading...'}</span>
      </div>
    )
  }
)
PulseSpinner.displayName = 'PulseSpinner'

// Skeleton loader
const Skeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  )
})
Skeleton.displayName = 'Skeleton'

export { LoadingSpinner, DotSpinner, PulseSpinner, Skeleton, spinnerVariants }